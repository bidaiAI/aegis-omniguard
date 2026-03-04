/**
 * AI Output Scanner - Content Script (Isolated World)
 *
 * Monitors AI chatbot RESPONSES (not user input) for malicious content.
 * Scans response text for:
 *   - Suspicious URLs (phishing TLDs + crypto keywords)
 *   - Unverified crypto wallet addresses
 *   - Dangerous code patterns in code blocks
 *   - Prompt injection indicators
 *
 * Uses MutationObserver on known AI chatbot response containers.
 * Injects warning badges via Shadow DOM to avoid CSS conflicts.
 */

import { MSG } from '../shared/message_types';
import {
  SUSPICIOUS_TLDS,
  PHISHING_URL_PATTERNS,
  CRYPTO_URL_KEYWORDS,
  CRYPTO_ADDRESS_PATTERNS,
} from '../shared/constants';
import type { AIOutputDetection, AIOutputThreatType, AegisSettings } from '../shared/types';

// ===== Settings Cache =====

let isEnabled = true;
let extensionEnabled = true;

function loadSettings(): void {
  chrome.runtime.sendMessage({ type: MSG.GET_SETTINGS_FOR_CS }, (settings: AegisSettings) => {
    if (chrome.runtime.lastError || !settings) return;
    extensionEnabled = settings.enabled;
    isEnabled = settings.aiOutputScannerEnabled;
  });
}

// Reload settings when they change
chrome.storage.onChanged.addListener((changes) => {
  if (changes.aegis_settings) {
    const s = changes.aegis_settings.newValue as AegisSettings;
    extensionEnabled = s.enabled;
    isEnabled = s.aiOutputScannerEnabled;
  }
});

// ===== Scanned Element Tracking =====

// WeakSet to track already-scanned elements and their text lengths
const scannedElements = new WeakMap<Element, number>();

// Track badge hosts for cleanup
const badgeHosts = new WeakSet<Element>();

// ===== HTML Escape (XSS prevention for injected UI) =====

function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;',
  };
  return str.replace(/[&<>"']/g, (ch) => map[ch]);
}

// ===== URL Scanner =====

const URL_REGEX = /https?:\/\/[^\s<>"')\]},;]+/gi;

function scanUrls(text: string): AIOutputDetection[] {
  const detections: AIOutputDetection[] = [];
  const urlMatches = text.match(URL_REGEX) || [];

  for (const url of urlMatches) {
    const urlLower = url.toLowerCase();

    // Check for known phishing patterns
    const phishingMatch = PHISHING_URL_PATTERNS.find((pattern) => urlLower.includes(pattern));
    if (phishingMatch) {
      detections.push({
        type: 'suspicious_url',
        content: url,
        context: `Phishing pattern detected: "${phishingMatch}"`,
        severity: 'danger',
        description: `This URL contains a known phishing pattern (${phishingMatch}). Do NOT click or visit this link.`,
      });
      continue;
    }

    // Check for suspicious TLD + crypto keyword combo
    const hasSuspiciousTld = SUSPICIOUS_TLDS.some((tld) => urlLower.includes(tld));
    if (hasSuspiciousTld) {
      const hasCryptoKeyword = CRYPTO_URL_KEYWORDS.some((kw) => urlLower.includes(kw));
      if (hasCryptoKeyword) {
        detections.push({
          type: 'suspicious_url',
          content: url,
          context: 'Suspicious TLD with crypto-related keyword',
          severity: 'warning',
          description: 'This URL uses a suspicious domain extension combined with crypto keywords. Verify before visiting.',
        });
      }
    }
  }

  return detections;
}

// ===== Crypto Address Scanner =====

function scanCryptoAddresses(text: string): AIOutputDetection[] {
  const detections: AIOutputDetection[] = [];

  // ETH / BSC addresses
  const ethRegex = new RegExp(CRYPTO_ADDRESS_PATTERNS.ETH.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = ethRegex.exec(text)) !== null) {
    // Skip addresses that appear to be in hex data / code contexts with 0x prefix
    // Only flag standalone addresses (not private keys which are 0x + 64 hex)
    if (match[0].length === 42) {
      detections.push({
        type: 'unverified_crypto_address',
        content: match[0],
        context: `ETH/BSC address: ${match[0].slice(0, 10)}...${match[0].slice(-6)}`,
        severity: 'info',
        description: 'Unverified address - always double check on a block explorer before sending funds.',
      });
    }
  }

  // BTC legacy
  const btcLegacyRegex = new RegExp(CRYPTO_ADDRESS_PATTERNS.BTC_LEGACY.source, 'g');
  while ((match = btcLegacyRegex.exec(text)) !== null) {
    if (match[0].length >= 26 && match[0].length <= 34) {
      detections.push({
        type: 'unverified_crypto_address',
        content: match[0],
        context: `BTC address: ${match[0].slice(0, 8)}...${match[0].slice(-6)}`,
        severity: 'info',
        description: 'Unverified BTC address - verify on a block explorer before sending funds.',
      });
    }
  }

  // BTC bech32
  const btcBech32Regex = new RegExp(CRYPTO_ADDRESS_PATTERNS.BTC_BECH32.source, 'g');
  while ((match = btcBech32Regex.exec(text)) !== null) {
    detections.push({
      type: 'unverified_crypto_address',
      content: match[0],
      context: `BTC (bech32) address: ${match[0].slice(0, 10)}...${match[0].slice(-6)}`,
      severity: 'info',
      description: 'Unverified BTC address - verify on a block explorer before sending funds.',
    });
  }

  // TRON
  const tronRegex = new RegExp(CRYPTO_ADDRESS_PATTERNS.TRON.source, 'g');
  while ((match = tronRegex.exec(text)) !== null) {
    detections.push({
      type: 'unverified_crypto_address',
      content: match[0],
      context: `TRON address: ${match[0].slice(0, 8)}...${match[0].slice(-6)}`,
      severity: 'info',
      description: 'Unverified TRON address - verify on a block explorer before sending funds.',
    });
  }

  return detections;
}

// ===== Code Pattern Scanner =====

function scanCodeBlocks(text: string): AIOutputDetection[] {
  const detections: AIOutputDetection[] = [];

  // Extract code blocks (``` ... ``` or indented blocks)
  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
  const codeBlocks: string[] = [];
  let codeMatch: RegExpExecArray | null;
  while ((codeMatch = codeBlockRegex.exec(text)) !== null) {
    codeBlocks.push(codeMatch[0]);
  }

  // If no code blocks found, check if the container itself is a code block
  const codeContent = codeBlocks.length > 0 ? codeBlocks.join('\n') : '';
  if (!codeContent) return detections;

  // 1. Hardcoded wallet addresses in code
  const ethInCode = new RegExp(CRYPTO_ADDRESS_PATTERNS.ETH.source, 'g');
  let ethMatch: RegExpExecArray | null;
  while ((ethMatch = ethInCode.exec(codeContent)) !== null) {
    if (ethMatch[0].length === 42) {
      detections.push({
        type: 'suspicious_code_wallet',
        content: ethMatch[0],
        context: 'Hardcoded wallet address in generated code',
        severity: 'warning',
        description: 'This code contains a hardcoded wallet address. Verify it is the correct address before deploying.',
      });
    }
  }

  // 2. approve() with type(uint256).max (unlimited approval)
  const unlimitedApprovalRegex = /\.approve\s*\([^)]*(?:type\s*\(\s*uint256\s*\)\s*\.max|2\s*\*\*\s*256\s*-\s*1|0xffffffff|uint256\s*\(\s*-\s*1\s*\)|MAX_UINT|UINT256_MAX)/gi;
  if (unlimitedApprovalRegex.test(codeContent)) {
    detections.push({
      type: 'suspicious_code_approval',
      content: 'approve(..., type(uint256).max)',
      context: 'Unlimited token approval detected in code',
      severity: 'danger',
      description: 'This code grants UNLIMITED token approval. A malicious contract could drain all your tokens. Use a specific amount instead.',
    });
  }

  // 3. selfdestruct / delegatecall to unknown addresses
  const selfdestructRegex = /\bselfdestruct\s*\(/gi;
  if (selfdestructRegex.test(codeContent)) {
    detections.push({
      type: 'suspicious_code_selfdestruct',
      content: 'selfdestruct()',
      context: 'Self-destruct pattern in generated code',
      severity: 'danger',
      description: 'This code contains selfdestruct() which permanently destroys the contract and sends remaining ETH to an address. Review carefully.',
    });
  }

  const delegatecallRegex = /\.delegatecall\s*\(/gi;
  if (delegatecallRegex.test(codeContent)) {
    detections.push({
      type: 'suspicious_code_selfdestruct',
      content: 'delegatecall()',
      context: 'Delegatecall pattern in generated code',
      severity: 'warning',
      description: 'This code uses delegatecall() which executes code from another contract in the current context. This is a common attack vector - verify the target address.',
    });
  }

  // 4. Encoded/obfuscated strings (base64 that decodes to URLs or addresses)
  const base64Regex = /(?:atob|Buffer\.from|base64[_-]?decode)\s*\(\s*['"`]([A-Za-z0-9+/=]{20,})['"`]\s*\)/g;
  let b64Match: RegExpExecArray | null;
  while ((b64Match = base64Regex.exec(codeContent)) !== null) {
    try {
      const decoded = atob(b64Match[1]);
      // Check if decoded content contains URLs or addresses
      if (URL_REGEX.test(decoded) || /0x[0-9a-fA-F]{40}/.test(decoded)) {
        detections.push({
          type: 'suspicious_code_obfuscated',
          content: b64Match[0].slice(0, 60) + '...',
          context: `Obfuscated string decodes to: ${decoded.slice(0, 60)}...`,
          severity: 'danger',
          description: 'This code contains an encoded string that decodes to a URL or wallet address. This is a common obfuscation technique used in malicious code.',
        });
      }
    } catch {
      // Not valid base64, skip
    }
  }

  // Also detect hex-encoded strings that decode to URLs
  const hexEncodeRegex = /(?:fromCharCode|String\.fromCharCode)\s*\(\s*((?:0x[0-9a-fA-F]{2}[,\s]*){10,})\)/g;
  if (hexEncodeRegex.test(codeContent)) {
    detections.push({
      type: 'suspicious_code_obfuscated',
      content: 'fromCharCode(...)',
      context: 'Character code obfuscation detected',
      severity: 'warning',
      description: 'This code builds strings from character codes, a common obfuscation technique. Review what string it produces before running.',
    });
  }

  return detections;
}

// ===== Prompt Injection Scanner =====

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+instructions/i,
  /ignore\s+(?:all\s+)?above\s+instructions/i,
  /you\s+are\s+now\s+(?:a\s+)?/i,
  /system\s*prompt\s*:/i,
  /\[system\s*\]/i,
  /new\s+instructions?\s*:/i,
  /override\s+(?:your\s+)?instructions/i,
  /disregard\s+(?:all\s+)?(?:previous|prior)\s+/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode\s+enabled/i,
];

function scanPromptInjection(text: string): AIOutputDetection[] {
  const detections: AIOutputDetection[] = [];

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      detections.push({
        type: 'prompt_injection_indicator',
        content: match[0],
        context: 'Prompt injection indicator found in AI output',
        severity: 'warning',
        description: 'This AI response contains language typically used in prompt injection attacks. The AI may have been manipulated to produce this output.',
      });
      break; // One detection is enough for prompt injection
    }
  }

  return detections;
}

// ===== Master Scanner =====

function scanAIOutput(text: string): AIOutputDetection[] {
  if (!text || text.trim().length < 10) return [];

  const detections: AIOutputDetection[] = [];
  detections.push(...scanUrls(text));
  detections.push(...scanCryptoAddresses(text));
  detections.push(...scanCodeBlocks(text));
  detections.push(...scanPromptInjection(text));

  return detections;
}

// ===== Warning Badge Injection (Shadow DOM) =====

let badgeCounter = 0;

function injectWarningBadge(element: Element, detection: AIOutputDetection): void {
  badgeCounter++;
  const badgeId = `aegis-ai-badge-${badgeCounter}`;

  // Don't inject duplicate badges for the same content in the same element
  if (element.querySelector(`[data-aegis-badge-for="${detection.content.slice(0, 20)}"]`)) return;

  const host = document.createElement('span');
  host.id = badgeId;
  host.setAttribute('data-aegis-badge-for', detection.content.slice(0, 20));
  host.style.cssText = 'display:inline;position:relative;z-index:2147483640;';

  const shadow = host.attachShadow({ mode: 'closed' });

  const severityColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    info: { bg: '#818cf8', border: '#6366f1', text: '#e0e7ff', icon: '\u26a0\ufe0f' },
    warning: { bg: '#f59e0b', border: '#d97706', text: '#fef3c7', icon: '\u26a0\ufe0f' },
    danger: { bg: '#ef4444', border: '#dc2626', text: '#fee2e2', icon: '\ud83d\udea8' },
  };

  const colors = severityColors[detection.severity] || severityColors.warning;
  const safeDesc = escapeHtml(detection.description);
  const safeContent = escapeHtml(detection.content.slice(0, 50));

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; display: inline; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      margin: 0 2px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      font-weight: 600;
      background: ${colors.bg}1a;
      border: 1px solid ${colors.border}44;
      color: ${colors.bg};
      cursor: pointer;
      transition: all 0.2s;
      vertical-align: middle;
      line-height: 1.4;
    }
    .badge:hover { background: ${colors.bg}33; }
    .tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      width: 300px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border: 1px solid ${colors.border}44;
      border-radius: 12px;
      color: #e2e8f0;
      font-size: 12px;
      line-height: 1.5;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      z-index: 2147483647;
      pointer-events: auto;
    }
    .badge:hover + .tooltip, .tooltip:hover { display: block; }
    .tooltip-title {
      font-weight: 700;
      color: ${colors.bg};
      margin-bottom: 4px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tooltip-content { color: #94a3b8; font-size: 11px; }
    .tooltip-match {
      margin-top: 6px;
      padding: 6px 8px;
      background: rgba(0,0,0,0.3);
      border-radius: 6px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 10px;
      color: #64748b;
      word-break: break-all;
    }
    .aegis-label {
      font-size: 9px;
      color: #00d4aa;
      margin-top: 6px;
      text-align: right;
    }
  `;
  shadow.appendChild(style);

  const typeLabels: Record<AIOutputThreatType, string> = {
    suspicious_url: 'Suspicious URL',
    unverified_crypto_address: 'Unverified Address',
    suspicious_code_wallet: 'Hardcoded Address',
    suspicious_code_approval: 'Unlimited Approval',
    suspicious_code_selfdestruct: 'Dangerous Pattern',
    suspicious_code_obfuscated: 'Obfuscated Code',
    prompt_injection_indicator: 'Prompt Injection',
  };

  const label = typeLabels[detection.type] || 'Warning';

  const wrapper = document.createElement('span');
  wrapper.style.cssText = 'position:relative;display:inline;';
  wrapper.innerHTML = `
    <span class="badge">${colors.icon} ${escapeHtml(label)}</span>
    <div class="tooltip">
      <div class="tooltip-title">${colors.icon} Aegis: ${escapeHtml(label)}</div>
      <div class="tooltip-content">${safeDesc}</div>
      <div class="tooltip-match">${safeContent}</div>
      <div class="aegis-label">\ud83d\udee1\ufe0f Aegis OmniGuard</div>
    </div>
  `;
  shadow.appendChild(wrapper);

  // Find a suitable insertion point near the suspicious content
  try {
    insertBadgeNearContent(element, detection.content, host);
  } catch {
    // Fallback: append to the end of the element
    element.appendChild(host);
  }
}

/**
 * Try to insert the badge right after the suspicious content in the DOM
 */
function insertBadgeNearContent(element: Element, content: string, badge: HTMLElement): void {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    const idx = node.textContent?.indexOf(content.slice(0, 30)) ?? -1;
    if (idx !== -1 && node.parentNode) {
      // Insert badge after this text node's parent
      const parent = node.parentNode as HTMLElement;
      if (parent.nextSibling) {
        parent.parentNode?.insertBefore(badge, parent.nextSibling);
      } else {
        parent.parentNode?.appendChild(badge);
      }
      return;
    }
  }

  // Fallback: append to element
  element.appendChild(badge);
}

// ===== Log Detection to Background =====

function logDetection(detections: AIOutputDetection[], url: string): void {
  chrome.runtime.sendMessage({
    type: MSG.AI_OUTPUT_DETECTION,
    payload: {
      detections: detections.map((d) => ({ type: d.type, masked: d.content.slice(0, 50) })),
      url,
      timestamp: Date.now(),
    },
  });
}

// ===== AI Chatbot Response Container Selectors =====

const AI_RESPONSE_SELECTORS = [
  // ChatGPT
  '[data-message-author-role="assistant"]',
  '.markdown.prose',
  // Claude
  '.font-claude-message',
  '[data-is-streaming]',
  // Gemini
  '.response-content',
  '.model-response-text',
  // DeepSeek
  '.ds-markdown',
  // Generic patterns for streamed responses
  '[class*="assistant-message"]',
  '[class*="bot-message"]',
  '[class*="ai-response"]',
  '[class*="model-response"]',
];

const AI_RESPONSE_SELECTOR = AI_RESPONSE_SELECTORS.join(', ');

// ===== Element Processing =====

function processResponseElement(element: Element): void {
  if (!isEnabled || !extensionEnabled) return;
  if (badgeHosts.has(element)) return;

  const text = element.textContent || '';
  const previousLength = scannedElements.get(element) || 0;

  // Skip if content hasn't meaningfully changed
  if (text.length === previousLength) return;

  // Only scan new content if we've already scanned part of this element (streaming)
  // For completely new elements, scan everything
  const textToScan = text;

  const detections = scanAIOutput(textToScan);

  if (detections.length > 0) {
    // Only inject badges for new detections
    for (const detection of detections) {
      injectWarningBadge(element, detection);
    }
    logDetection(detections, window.location.href);
  }

  // Update the tracked length
  scannedElements.set(element, text.length);
}

// ===== Debounced Processing =====

const pendingElements = new Set<Element>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleProcessing(element: Element): void {
  pendingElements.add(element);

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const elements = [...pendingElements];
    pendingElements.clear();
    for (const el of elements) {
      processResponseElement(el);
    }
  }, 500); // Wait 500ms for streaming to settle
}

// ===== MutationObserver =====

function observeAIResponses(): void {
  // Initial scan of existing elements
  const existingElements = document.querySelectorAll(AI_RESPONSE_SELECTOR);
  existingElements.forEach((el) => scheduleProcessing(el));

  const observer = new MutationObserver((mutations) => {
    if (!isEnabled || !extensionEnabled) return;

    for (const mutation of mutations) {
      // Check added nodes
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        // Check if the added node itself is a response container
        if (node.matches?.(AI_RESPONSE_SELECTOR)) {
          scheduleProcessing(node);
        }

        // Check children of the added node
        const responseElements = node.querySelectorAll(AI_RESPONSE_SELECTOR);
        responseElements.forEach((el) => scheduleProcessing(el));
      }

      // Check characterData changes (streaming text updates)
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        const target = mutation.target as HTMLElement;
        const responseParent = target.closest?.(AI_RESPONSE_SELECTOR);
        if (responseParent) {
          scheduleProcessing(responseParent);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

// ===== Initialization =====

function init(): void {
  loadSettings();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeAIResponses);
  } else {
    observeAIResponses();
  }

  console.log('[Aegis] AI Output Scanner v0.1.0 initialized.');
}

init();
