/**
 * Background Service Worker - Central nervous system of Aegis
 *
 * Responsibilities:
 * - Receive DLP scan requests from Content Scripts
 * - Run DLP engine (Luhn, BIP-39, entropy) in isolated background
 * - Check whitelist + settings before scanning
 * - Log interception events for Popup display
 * - Proxy LLM API calls (protecting API keys from content scripts)
 * - Web3 Sentinel: analyze transactions via local pre-screen + LLM
 * - API Key CRUD: store/delete/check/validate BYOK keys
 */

import { MSG } from '../shared/message_types';
import { dlpScan } from '../engines/dlp_engine';
import { STORAGE_KEYS } from '../shared/constants';
import { DEFAULT_SETTINGS } from '../shared/types';
import type { AegisSettings, InterceptLogEntry, DLPScanResult, LLMProvider } from '../shared/types';
import { analyzeSentinel } from '../engines/sentinel_engine';
import { smartLLMCall, validateApiKey, getUsageStats } from './llm_proxy';
import { storeApiKey, deleteApiKey, hasApiKey } from '../shared/key_vault';

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

// Messages that should ONLY be sent from the popup (not from content scripts or web pages)
const POPUP_ONLY_MSGS = new Set([
  MSG.UPDATE_SETTINGS,
  MSG.STORE_API_KEY,
  MSG.DELETE_API_KEY,
  MSG.VALIDATE_API_KEY,
  MSG.CLEAR_LOGS,
]);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Security: restrict admin messages to popup only
  // Popup messages have sender.tab === undefined and come from our extension
  if (POPUP_ONLY_MSGS.has(message.type)) {
    if (sender.tab || sender.id !== chrome.runtime.id) {
      sendResponse({ error: 'Unauthorized: admin messages must come from popup' });
      return false;
    }
  }
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

        // Run DLP scan (async for multi-language mnemonic + multi-chain key detection)
        const result: DLPScanResult = await dlpScan(text);

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
        const raw = message.payload as Record<string, unknown>;
        const current = await loadSettings();

        // Validate each field — reject unknown keys and invalid values
        const validated: Partial<AegisSettings> = {};
        if (typeof raw.enabled === 'boolean') validated.enabled = raw.enabled;
        if (typeof raw.web2DlpEnabled === 'boolean') validated.web2DlpEnabled = raw.web2DlpEnabled;
        if (typeof raw.web3SentinelEnabled === 'boolean') validated.web3SentinelEnabled = raw.web3SentinelEnabled;
        if (raw.protectionLevel === 'low' || raw.protectionLevel === 'medium' || raw.protectionLevel === 'high') {
          validated.protectionLevel = raw.protectionLevel;
        }
        if (raw.language === 'en' || raw.language === 'zh') {
          validated.language = raw.language;
        }
        if (raw.llmProvider === 'openai' || raw.llmProvider === 'anthropic' || raw.llmProvider === 'deepseek' || raw.llmProvider === null) {
          validated.llmProvider = raw.llmProvider;
        }
        if (Array.isArray(raw.whitelist)) {
          // Sanitize whitelist: only allow valid domain patterns, max 100 entries
          validated.whitelist = (raw.whitelist as unknown[])
            .filter((item): item is string => typeof item === 'string' && item.length <= 253)
            .filter((domain) => /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*$/.test(domain))
            .slice(0, 100);
        }

        const updated = { ...current, ...validated };
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

      case MSG.WEB3_INTERCEPT: {
        const { method, params, origin } = message.payload as {
          method: string;
          params: unknown[];
          origin: string;
        };

        // Skip if sentinel disabled
        if (!cachedSettings.enabled || !cachedSettings.web3SentinelEnabled) {
          sendResponse({ riskLevel: 'safe', explanation: 'Web3 Sentinel disabled' });
          return;
        }

        console.log(`[Aegis] Web3 intercept: ${method} from ${origin}`);

        // Build LLM call function (if provider configured)
        const llmProvider = cachedSettings.llmProvider;
        const llmCallFn = async (prompt: string): Promise<string> => {
          return smartLLMCall(prompt, llmProvider);
        };

        // Run full sentinel analysis (Tier 1 local + Tier 2 LLM)
        const sentinelResult = await analyzeSentinel(method, params, origin, llmCallFn);

        console.log(`[Aegis] Sentinel result: ${sentinelResult.riskLevel} for ${method}`);

        sendResponse({
          riskLevel: sentinelResult.riskLevel,
          explanation: sentinelResult.explanation,
          riskFactors: sentinelResult.riskFactors,
          decodedAction: sentinelResult.decodedAction,
        });
        break;
      }

      // ===== API Key Management (BYOK) =====

      case MSG.STORE_API_KEY: {
        const { apiKey, provider } = message.payload as {
          apiKey: string;
          provider: LLMProvider;
        };

        // Validate the key first
        const validation = await validateApiKey(apiKey, provider);
        if (!validation.valid) {
          sendResponse({ ok: false, error: validation.error || 'Invalid API key' });
          return;
        }

        // Store encrypted
        await storeApiKey(apiKey, provider);

        // Update settings with chosen provider
        const currentSettings = await loadSettings();
        const updatedSettings = { ...currentSettings, llmProvider: provider };
        await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updatedSettings });
        cachedSettings = updatedSettings;

        sendResponse({ ok: true, warning: validation.error }); // warning may contain "rate limited" note
        break;
      }

      case MSG.DELETE_API_KEY: {
        const { provider: delProvider } = message.payload as { provider: LLMProvider };
        await deleteApiKey(delProvider);

        // Check if any other provider still has a key
        const providers: LLMProvider[] = ['openai', 'anthropic', 'deepseek'];
        let hasAnyKey = false;
        for (const p of providers) {
          if (p !== delProvider && await hasApiKey(p)) {
            hasAnyKey = true;
            break;
          }
        }

        // If we deleted the active provider, reset to null (free cloud)
        if (cachedSettings.llmProvider === delProvider) {
          const settingsNow = await loadSettings();
          const updated = { ...settingsNow, llmProvider: hasAnyKey ? settingsNow.llmProvider : null };
          await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
          cachedSettings = updated;
        }

        sendResponse({ ok: true });
        break;
      }

      case MSG.CHECK_API_KEY: {
        const { provider: checkProvider } = message.payload as { provider: LLMProvider };
        const exists = await hasApiKey(checkProvider);
        sendResponse({ hasKey: exists });
        break;
      }

      case MSG.VALIDATE_API_KEY: {
        const { apiKey: testKey, provider: testProvider } = message.payload as {
          apiKey: string;
          provider: LLMProvider;
        };
        const result = await validateApiKey(testKey, testProvider);
        sendResponse(result);
        break;
      }

      case MSG.GET_LLM_USAGE: {
        const stats = await getUsageStats(cachedSettings.llmProvider);
        sendResponse(stats);
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
