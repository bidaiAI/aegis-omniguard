/**
 * Clipboard Guard - Content Script (Isolated World)
 *
 * Detects clipboard hijacking of crypto addresses:
 *   1. Monitors 'copy' events - stores copied crypto addresses
 *   2. Monitors 'paste' events - compares pasted vs copied content
 *   3. If pasted address differs from copied address → ALERT (clipboard hijack)
 *   4. If pasted address was never copied → INFO (potential malware injection)
 *
 * Supported address formats:
 *   - ETH / BSC: 0x + 40 hex chars
 *   - BTC Legacy: starts with 1 or 3, 25-34 chars
 *   - BTC Bech32: starts with bc1, 25-62 chars
 *   - SOL: Base58, 32-44 chars
 *   - TRON: T + 33 chars (base58)
 *
 * Shows a prominent red warning via Shadow DOM when hijacking is detected.
 */

import { MSG } from '../shared/message_types';
import type { AegisSettings, CryptoAddressChain } from '../shared/types';

// ===== Settings Cache =====

let isEnabled = true;
let extensionEnabled = true;

function loadSettings(): void {
  chrome.runtime.sendMessage({ type: MSG.GET_SETTINGS_FOR_CS }, (settings: AegisSettings) => {
    if (chrome.runtime.lastError || !settings) return;
    extensionEnabled = settings.enabled;
    isEnabled = settings.clipboardGuardEnabled;
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.aegis_settings) {
    const s = changes.aegis_settings.newValue as AegisSettings;
    extensionEnabled = s.enabled;
    isEnabled = s.clipboardGuardEnabled;
  }
});

// ===== HTML Escape (XSS prevention) =====

function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;',
  };
  return str.replace(/[&<>"']/g, (ch) => map[ch]);
}

// ===== Crypto Address Pattern Matching =====

interface AddressMatch {
  address: string;
  chain: CryptoAddressChain;
}

// Base58 character class for validation
const BASE58_CHARS = /^[1-9A-HJ-NP-Za-km-z]+$/;

/**
 * Detect if a string contains a crypto address.
 * Returns the first match found, or null.
 */
function detectCryptoAddress(text: string): AddressMatch | null {
  const trimmed = text.trim();

  // ETH / BSC: 0x + 40 hex chars (exact)
  const ethMatch = trimmed.match(/\b(0x[0-9a-fA-F]{40})\b/);
  if (ethMatch) {
    return { address: ethMatch[1], chain: 'ETH' };
  }

  // BTC Bech32: bc1 prefix
  const btcBech32Match = trimmed.match(/\b(bc1[a-zA-HJ-NP-Z0-9]{25,62})\b/);
  if (btcBech32Match) {
    return { address: btcBech32Match[1], chain: 'BTC' };
  }

  // BTC Legacy: starts with 1 or 3, 25-34 chars, Base58
  const btcLegacyMatch = trimmed.match(/\b([13][a-km-zA-HJ-NP-Z1-9]{25,33})\b/);
  if (btcLegacyMatch && BASE58_CHARS.test(btcLegacyMatch[1])) {
    return { address: btcLegacyMatch[1], chain: 'BTC' };
  }

  // TRON: T + 33 chars (Base58)
  const tronMatch = trimmed.match(/\b(T[1-9A-HJ-NP-Za-km-z]{33})\b/);
  if (tronMatch && BASE58_CHARS.test(tronMatch[1])) {
    return { address: tronMatch[1], chain: 'TRON' };
  }

  // SOL: Base58, 32-44 chars (match longer strings to avoid false positives)
  // Solana addresses are typically 32-44 characters in base58
  const solMatch = trimmed.match(/\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/);
  if (solMatch && BASE58_CHARS.test(solMatch[1])) {
    // Additional heuristic: Solana addresses don't start with T (TRON) or 1/3 (BTC legacy)
    const first = solMatch[1][0];
    if (first !== 'T' && first !== '1' && first !== '3') {
      // Make sure it's not too short or suspiciously like a word
      if (solMatch[1].length >= 32) {
        return { address: solMatch[1], chain: 'SOL' };
      }
    }
  }

  return null;
}

/**
 * Check if a full text string IS a crypto address (not just contains one).
 * More strict - the trimmed text should be predominantly the address.
 */
function isFullCryptoAddress(text: string): AddressMatch | null {
  const trimmed = text.trim();
  // If the text is very long with lots of other content, skip
  if (trimmed.length > 100) return null;
  return detectCryptoAddress(trimmed);
}

// ===== Clipboard State Tracking =====

let lastCopiedAddress: AddressMatch | null = null;
let lastCopyTimestamp = 0;

// How long to remember the last copy (5 minutes)
const COPY_MEMORY_DURATION_MS = 5 * 60 * 1000;

// ===== Warning UI (Shadow DOM) =====

let warningCounter = 0;

function showClipboardHijackWarning(
  copied: string | null,
  pasted: string,
  chain: CryptoAddressChain,
  isHijack: boolean
): void {
  warningCounter++;
  const warningId = `aegis-clipboard-warn-${warningCounter}`;

  const host = document.createElement('div');
  host.id = warningId;
  host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;right:0;pointer-events:none;';

  const shadow = host.attachShadow({ mode: 'closed' });

  const truncCopied = copied
    ? `${escapeHtml(copied.slice(0, 10))}...${escapeHtml(copied.slice(-8))}`
    : 'N/A';
  const truncPasted = `${escapeHtml(pasted.slice(0, 10))}...${escapeHtml(pasted.slice(-8))}`;

  const title = isHijack
    ? 'CLIPBOARD HIJACK DETECTED'
    : 'Suspicious Clipboard Activity';

  const description = isHijack
    ? 'The address you copied was CHANGED before pasting! A malicious program may have replaced it.'
    : 'A crypto address is being pasted that was not recently copied. Verify the address carefully.';

  const bgColor = isHijack ? '#ef4444' : '#f59e0b';
  const borderColor = isHijack ? '#dc2626' : '#d97706';

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .warning {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      padding: 20px 24px;
      border-radius: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 2px ${borderColor};
      border-left: 5px solid ${bgColor};
      max-width: 480px;
      pointer-events: auto;
      animation: slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .icon { font-size: 24px; }
    .title {
      font-weight: 800;
      font-size: 14px;
      color: ${bgColor};
      letter-spacing: 0.5px;
    }
    .desc {
      color: #94a3b8;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .address-compare {
      background: rgba(0,0,0,0.3);
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 8px;
    }
    .address-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
    }
    .address-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-width: 55px;
    }
    .label-copied { color: #22c55e; }
    .label-pasted { color: #ef4444; }
    .address-value {
      font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #e2e8f0;
      word-break: break-all;
    }
    .chain-badge {
      display: inline-flex;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      background: ${bgColor}22;
      color: ${bgColor};
      border: 1px solid ${bgColor}44;
      margin-left: auto;
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }
    .btn-dismiss {
      background: rgba(100,116,139,0.15);
      color: #94a3b8;
      border: 1px solid rgba(100,116,139,0.3);
      flex: 1;
    }
    .btn-dismiss:hover { background: rgba(100,116,139,0.3); }
    .aegis-tag {
      font-size: 9px;
      color: #00d4aa;
      text-align: right;
      margin-top: 8px;
    }
    @keyframes slideDown {
      from { transform: translateX(-50%) translateY(-120%); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; pointer-events: none; }
    }
  `;
  shadow.appendChild(style);

  const warning = document.createElement('div');
  warning.className = 'warning';
  warning.innerHTML = `
    <div class="header">
      <span class="icon">${isHijack ? '\ud83d\udea8' : '\u26a0\ufe0f'}</span>
      <span class="title">${title}</span>
      <span class="chain-badge">${escapeHtml(chain)}</span>
    </div>
    <div class="desc">${description}</div>
    <div class="address-compare">
      ${isHijack ? `
      <div class="address-row">
        <span class="address-label label-copied">Copied:</span>
        <span class="address-value">${truncCopied}</span>
      </div>
      ` : ''}
      <div class="address-row">
        <span class="address-label label-pasted">Pasting:</span>
        <span class="address-value">${truncPasted}</span>
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-dismiss">Dismiss</button>
    </div>
    <div class="aegis-tag">\ud83d\udee1\ufe0f Aegis OmniGuard - Clipboard Guard</div>
  `;
  shadow.appendChild(warning);

  // Event handlers
  shadow.querySelector('.btn-dismiss')?.addEventListener('click', () => host.remove());

  document.body.appendChild(host);

  // Auto-dismiss after 15 seconds for non-hijack, persist longer for hijack
  const timeout = isHijack ? 30000 : 15000;
  setTimeout(() => {
    if (host.parentNode) {
      const el = shadow.querySelector('.warning');
      if (el) {
        (el as HTMLElement).style.animation = 'fadeOut 0.4s ease-in forwards';
        setTimeout(() => host.remove(), 400);
      }
    }
  }, timeout);
}

// ===== Log to Background =====

function logClipboardEvent(
  type: 'clipboard_hijack' | 'suspicious_paste',
  copiedAddress: string | null,
  pastedAddress: string,
  chain: CryptoAddressChain
): void {
  chrome.runtime.sendMessage({
    type: MSG.CLIPBOARD_HIJACK_ALERT,
    payload: {
      detections: [{
        type,
        masked: pastedAddress.slice(0, 10) + '...' + pastedAddress.slice(-6),
      }],
      url: window.location.href,
      timestamp: Date.now(),
      copiedAddress: copiedAddress ? copiedAddress.slice(0, 10) + '...' : null,
      pastedAddress: pastedAddress.slice(0, 10) + '...' + pastedAddress.slice(-6),
      chain,
    },
  });
}

// ===== Copy Event Handler =====

function handleCopy(_e: ClipboardEvent): void {
  if (!isEnabled || !extensionEnabled) return;

  // Get selected text (what the user intended to copy)
  const selection = window.getSelection()?.toString();
  if (!selection) return;

  const addressMatch = isFullCryptoAddress(selection);
  if (addressMatch) {
    lastCopiedAddress = addressMatch;
    lastCopyTimestamp = Date.now();
  }
}

// ===== Paste Event Handler =====

function handlePaste(e: ClipboardEvent): void {
  if (!isEnabled || !extensionEnabled) return;

  const pastedText = e.clipboardData?.getData('text/plain');
  if (!pastedText) return;

  const pastedAddress = detectCryptoAddress(pastedText);
  if (!pastedAddress) return;

  // Check if this paste is within our memory window
  const withinMemory = (Date.now() - lastCopyTimestamp) < COPY_MEMORY_DURATION_MS;

  if (lastCopiedAddress && withinMemory) {
    // We have a recent copy to compare against
    if (lastCopiedAddress.address !== pastedAddress.address) {
      // HIJACK: User copied address A but clipboard now contains address B
      showClipboardHijackWarning(
        lastCopiedAddress.address,
        pastedAddress.address,
        pastedAddress.chain,
        true
      );
      logClipboardEvent(
        'clipboard_hijack',
        lastCopiedAddress.address,
        pastedAddress.address,
        pastedAddress.chain
      );
    }
    // If addresses match, the paste is legitimate - no action needed
  } else {
    // No recent copy recorded but user is pasting a crypto address
    // This could indicate malware injecting addresses
    // Only warn if the pasted content ONLY contains an address (not a long text with an address in it)
    const trimmedPaste = pastedText.trim();
    if (trimmedPaste.length < 100) {
      showClipboardHijackWarning(
        null,
        pastedAddress.address,
        pastedAddress.chain,
        false
      );
      logClipboardEvent(
        'suspicious_paste',
        null,
        pastedAddress.address,
        pastedAddress.chain
      );
    }
  }
}

// ===== Initialization =====

function init(): void {
  loadSettings();

  // Listen at the capture phase to get events before other handlers
  document.addEventListener('copy', handleCopy as EventListener, true);
  document.addEventListener('paste', handlePaste as EventListener, true);

  console.log('[Aegis] Clipboard Guard v0.1.0 initialized.');
}

init();
