/**
 * Background Service Worker - Central nervous system of Aegis
 *
 * Responsibilities:
 * - Receive DLP scan requests from Content Scripts
 * - Run DLP engine (Luhn, BIP-39, entropy) in isolated background
 * - Check whitelist + settings before scanning
 * - Log interception events for Popup display
 * - Proxy LLM API calls (protecting API keys from content scripts)
 */

import { MSG } from '../shared/message_types';
import { dlpScan } from '../engines/dlp_engine';
import { STORAGE_KEYS } from '../shared/constants';
import { DEFAULT_SETTINGS } from '../shared/types';
import type { AegisSettings, InterceptLogEntry, DLPScanResult } from '../shared/types';

const MAX_LOG_ENTRIES = 200;

// ===== Settings Cache =====
let cachedSettings: AegisSettings = DEFAULT_SETTINGS;

async function loadSettings(): Promise<AegisSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  cachedSettings = (result[STORAGE_KEYS.SETTINGS] as AegisSettings) || DEFAULT_SETTINGS;
  return cachedSettings;
}

// ===== Lifecycle =====

chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  if (!result[STORAGE_KEYS.SETTINGS]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS });
  }
  await loadSettings();
  console.log('[Aegis] Extension installed. Settings initialized.');
});

// Reload settings when they change
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEYS.SETTINGS]) {
    cachedSettings = changes[STORAGE_KEYS.SETTINGS].newValue as AegisSettings;
  }
});

// ===== Whitelist Check =====

function isDomainWhitelisted(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return cachedSettings.whitelist.some((pattern) => {
      if (pattern.startsWith('*.')) {
        return hostname.endsWith(pattern.slice(1)) || hostname === pattern.slice(2);
      }
      return hostname === pattern;
    });
  } catch {
    return false;
  }
}

// ===== Confidence Threshold by Protection Level =====

function getConfidenceThreshold(): number {
  switch (cachedSettings.protectionLevel) {
    case 'low': return 0.95;    // Only very high confidence
    case 'medium': return 0.8;  // Balanced
    case 'high': return 0.6;    // Aggressive
    default: return 0.8;
  }
}

// ===== Intercept Logging =====

async function addLogEntry(entry: Omit<InterceptLogEntry, 'id'>): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.INTERCEPT_LOG);
  const logs: InterceptLogEntry[] = (result[STORAGE_KEYS.INTERCEPT_LOG] as InterceptLogEntry[]) || [];

  const newEntry: InterceptLogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };

  logs.unshift(newEntry);

  // Keep only the latest entries
  if (logs.length > MAX_LOG_ENTRIES) {
    logs.length = MAX_LOG_ENTRIES;
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.INTERCEPT_LOG]: logs });
}

// ===== Message Router =====

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true; // async response
});

async function handleMessage(
  message: { type: string; payload?: unknown },
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    switch (message.type) {
      case MSG.DLP_SCAN: {
        const { text, url } = message.payload as { text: string; url: string };

        // Skip if disabled
        if (!cachedSettings.enabled || !cachedSettings.web2DlpEnabled) {
          sendResponse({ type: MSG.DLP_SCAN_RESULT, payload: { verdict: 'pass', detections: [], scannedAt: Date.now() } });
          return;
        }

        // Skip whitelisted domains
        if (isDomainWhitelisted(url)) {
          sendResponse({ type: MSG.DLP_SCAN_RESULT, payload: { verdict: 'pass', detections: [], scannedAt: Date.now() } });
          return;
        }

        // Run DLP scan
        const result: DLPScanResult = dlpScan(text);

        // Filter by confidence threshold
        const threshold = getConfidenceThreshold();
        result.detections = result.detections.filter((d) => d.confidence >= threshold);
        result.verdict = result.detections.length > 0 ? 'block' : 'pass';

        sendResponse({ type: MSG.DLP_SCAN_RESULT, payload: result });
        break;
      }

      case MSG.SHOW_TOAST: {
        // Log interception event from content script
        const { detections, url, timestamp } = message.payload as {
          detections: Array<{ type: string; masked: string }>;
          url: string;
          timestamp: number;
        };

        let domain = '';
        try { domain = new URL(url).hostname; } catch { domain = url; }

        await addLogEntry({
          timestamp,
          url,
          domain,
          detections: detections as InterceptLogEntry['detections'],
        });

        // Update badge to show interception count
        const logResult = await chrome.storage.local.get(STORAGE_KEYS.INTERCEPT_LOG);
        const logs = (logResult[STORAGE_KEYS.INTERCEPT_LOG] as InterceptLogEntry[]) || [];
        const todayCount = logs.filter(
          (l) => Date.now() - l.timestamp < 86400000 // Last 24h
        ).length;

        if (todayCount > 0) {
          await chrome.action.setBadgeText({ text: String(todayCount) });
          await chrome.action.setBadgeBackgroundColor({ color: '#00d4aa' });
        }

        sendResponse({ ok: true });
        break;
      }

      case MSG.GET_SETTINGS: {
        const settings = await loadSettings();
        sendResponse(settings);
        break;
      }

      case MSG.UPDATE_SETTINGS: {
        const newSettings = message.payload as Partial<AegisSettings>;
        const current = await loadSettings();
        const updated = { ...current, ...newSettings };
        await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
        cachedSettings = updated;
        sendResponse(updated);
        break;
      }

      case MSG.GET_LOGS: {
        const logsResult = await chrome.storage.local.get(STORAGE_KEYS.INTERCEPT_LOG);
        const allLogs = (logsResult[STORAGE_KEYS.INTERCEPT_LOG] as InterceptLogEntry[]) || [];
        sendResponse(allLogs);
        break;
      }

      case MSG.CLEAR_LOGS: {
        await chrome.storage.local.set({ [STORAGE_KEYS.INTERCEPT_LOG]: [] });
        await chrome.action.setBadgeText({ text: '' });
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: `Unknown message type: ${message.type}` });
    }
  } catch (err) {
    console.error('[Aegis Background] Error:', err);
    sendResponse({ error: String(err) });
  }
}
