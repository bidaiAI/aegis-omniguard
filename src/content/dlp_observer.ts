/**
 * DLP Observer - Content Script (Isolated World)
 *
 * Monitors user input in web pages (especially AI chat platforms).
 * Intercepts sensitive data BEFORE it's submitted.
 *
 * Supports THREE input modes:
 *   1. <input> / <textarea> - traditional form inputs
 *   2. [contenteditable] - modern AI chat UIs (ChatGPT, Claude, etc.)
 *   3. Submit button click interception
 *
 * CRITICAL (Difficulty #1):
 * Uses Native Value Setter Override to sync with React/Vue state.
 * For contenteditable, manipulates DOM text nodes directly and
 * dispatches InputEvent to trigger framework state sync.
 */

import { MSG } from '../shared/message_types';
import type { DLPDetection } from '../shared/types';

// ===== Native Setter Cache (Difficulty #1) =====

const nativeInputSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value'
)!.set!;

const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype,
  'value'
)!.set!;

/**
 * Set <input>/<textarea> value via native prototype setter + event dispatch.
 * This forces React/Vue/Angular state machines to sync.
 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const setter = el instanceof HTMLTextAreaElement ? nativeTextareaSetter : nativeInputSetter;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ===== Text Extraction Helpers =====

/**
 * Extract text content from any input-like element
 */
function getElementText(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.value;
  }
  // contenteditable or other
  return el.innerText || el.textContent || '';
}

/**
 * Apply masked text to any input-like element
 */
function setElementText(el: HTMLElement, maskedText: string): void {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    setNativeValue(el, maskedText);
    return;
  }

  // For contenteditable elements
  if (el.getAttribute('contenteditable') === 'true' || el.isContentEditable) {
    // Store original for framework sync
    el.innerText = maskedText;

    // Dispatch InputEvent to notify React's synthetic event system
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: maskedText,
      })
    );
    // Also trigger beforeinput for frameworks that listen to it
    el.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: maskedText,
      })
    );
    return;
  }
}

// ===== Background Communication =====

interface ScanResponse {
  verdict: string;
  detections: DLPDetection[];
}

async function requestDlpScan(text: string): Promise<ScanResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: MSG.DLP_SCAN,
        payload: { text, url: window.location.href },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({ verdict: 'pass', detections: [] });
          return;
        }
        if (response?.payload) {
          resolve(response.payload as ScanResponse);
        } else {
          resolve({ verdict: 'pass', detections: [] });
        }
      }
    );
  });
}

/**
 * Log an interception event to background for Popup display
 */
function logInterception(detections: DLPDetection[], url: string): void {
  chrome.runtime.sendMessage({
    type: MSG.SHOW_TOAST,
    payload: {
      detections: detections.map((d) => ({ type: d.type, masked: d.masked })),
      url,
      timestamp: Date.now(),
    },
  });
}

// ===== Text Masking =====

function maskText(text: string, detections: DLPDetection[]): string {
  if (detections.length === 0) return text;

  // Sort by position descending to replace from end to start
  const sorted = [...detections].sort((a, b) => b.position.start - a.position.start);
  let result = text;
  for (const d of sorted) {
    result = result.slice(0, d.position.start) + d.masked + result.slice(d.position.end);
  }
  return result;
}

// ===== Toast Notification (Shadow DOM - Difficulty #4) =====

let toastCounter = 0;

function showToast(detections: DLPDetection[]): void {
  toastCounter++;
  const toastId = `aegis-toast-${toastCounter}`;

  const host = document.createElement('div');
  host.id = toastId;
  host.style.cssText = 'position:fixed;z-index:2147483647;top:0;right:0;pointer-events:none;';

  const shadow = host.attachShadow({ mode: 'closed' });

  // Type label mapping
  const typeLabels: Record<string, string> = {
    credit_card: 'Credit Card',
    mnemonic: 'Mnemonic Phrase',
    private_key: 'Private Key',
    api_key: 'API Key',
    pii_id_card: 'ID Card Number',
    pii_phone: 'Phone Number',
    pii_email: 'Email Address',
  };

  const typeList = [...new Set(detections.map((d) => typeLabels[d.type] || d.type))];
  const count = detections.length;
  const offset = ((toastCounter - 1) % 5) * 60; // Stack up to 5 toasts

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .toast {
      position: fixed;
      top: ${16 + offset}px;
      right: 16px;
      z-index: 2147483647;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      padding: 14px 20px;
      border-radius: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,170,0.15);
      border-left: 4px solid #00d4aa;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      max-width: 380px;
      pointer-events: auto;
      animation: slideIn 0.35s cubic-bezier(0.34,1.56,0.64,1), fadeOut 0.4s ease-in 4.6s forwards;
    }
    .icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
    .body { flex: 1; }
    .title { font-weight: 600; color: #00d4aa; font-size: 13px; margin-bottom: 3px; }
    .detail { color: #94a3b8; font-size: 11px; }
    .types { color: #f59e0b; font-weight: 500; }
    .close {
      background: none; border: none; color: #475569; cursor: pointer;
      font-size: 16px; padding: 0 0 0 8px; line-height: 1;
    }
    .close:hover { color: #e2e8f0; }
    @keyframes slideIn {
      from { transform: translateX(120%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; pointer-events: none; }
    }
  `;
  shadow.appendChild(style);

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="icon">&#x1f6e1;&#xfe0f;</span>
    <div class="body">
      <div class="title">Aegis: Data Leak Blocked</div>
      <div class="detail">
        Intercepted <strong>${count}</strong> sensitive item${count > 1 ? 's' : ''}:
        <span class="types">${typeList.join(', ')}</span>
      </div>
    </div>
    <button class="close" title="Dismiss">&times;</button>
  `;
  shadow.appendChild(toast);

  // Close button handler
  const closeBtn = shadow.querySelector('.close');
  closeBtn?.addEventListener('click', () => host.remove());

  document.body.appendChild(host);

  // Auto-remove after animation
  setTimeout(() => host.remove(), 5200);
}

// ===== Core Interception Logic =====

/**
 * Find the nearest input-like element for a given event target
 */
function findInputElement(target: EventTarget | null): HTMLElement | null {
  if (!target || !(target instanceof HTMLElement)) return null;

  // Direct match
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  ) {
    return target;
  }

  // Walk up for contenteditable parent (ChatGPT nests the cursor inside child divs)
  let parent = target.parentElement;
  while (parent) {
    if (parent.isContentEditable) return parent;
    parent = parent.parentElement;
  }

  return null;
}

// Track whether we're currently processing to avoid re-entrancy
let isProcessing = false;

/**
 * Intercept Enter key (submit) or Ctrl+Enter
 */
async function handleKeydown(e: KeyboardEvent): Promise<void> {
  if (e.key !== 'Enter' || e.shiftKey || isProcessing) return;

  const el = findInputElement(e.target);
  if (!el) return;

  const text = getElementText(el);
  if (!text || text.trim().length < 5) return; // Skip very short inputs

  isProcessing = true;

  try {
    const result = await requestDlpScan(text);

    if (result.verdict === 'block' && result.detections.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const maskedText = maskText(text, result.detections);
      setElementText(el, maskedText);
      showToast(result.detections);
      logInterception(result.detections, window.location.href);
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Intercept paste events
 */
async function handlePaste(e: ClipboardEvent): Promise<void> {
  if (isProcessing) return;

  const text = e.clipboardData?.getData('text/plain');
  if (!text || text.trim().length < 5) return;

  isProcessing = true;

  try {
    const result = await requestDlpScan(text);

    if (result.verdict === 'block' && result.detections.length > 0) {
      e.preventDefault();
      e.stopPropagation();

      const el = findInputElement(e.target);
      if (!el) return;

      const maskedText = maskText(text, result.detections);

      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const current = el.value;
        setNativeValue(el, current.slice(0, start) + maskedText + current.slice(end));
      } else {
        // For contenteditable: insert at selection
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(maskedText));
          range.collapse(false);
          // Trigger framework sync
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
        }
      }

      showToast(result.detections);
      logInterception(result.detections, window.location.href);
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Intercept submit button clicks
 * Scans nearby input/textarea/contenteditable before allowing form submission
 */
async function handleClick(e: MouseEvent): Promise<void> {
  if (isProcessing) return;

  const target = e.target as HTMLElement;
  if (!target) return;

  // Detect submit-like buttons
  const isSubmitButton =
    (target.tagName === 'BUTTON' && (target as HTMLButtonElement).type === 'submit') ||
    target.getAttribute('data-testid')?.includes('send') ||
    target.getAttribute('aria-label')?.toLowerCase().includes('send') ||
    target.closest('button[data-testid*="send"]') !== null ||
    target.closest('button[aria-label*="Send"]') !== null;

  if (!isSubmitButton) return;

  // Find the associated input area
  // Look for contenteditable or textarea near the button
  const form = target.closest('form');
  const container = form || target.closest('[role="presentation"]') || target.parentElement?.parentElement;

  if (!container) return;

  const inputEl =
    container.querySelector<HTMLElement>('[contenteditable="true"]') ||
    container.querySelector<HTMLTextAreaElement>('textarea') ||
    container.querySelector<HTMLInputElement>('input[type="text"]');

  if (!inputEl) return;

  const text = getElementText(inputEl);
  if (!text || text.trim().length < 5) return;

  isProcessing = true;

  try {
    const result = await requestDlpScan(text);

    if (result.verdict === 'block' && result.detections.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const maskedText = maskText(text, result.detections);
      setElementText(inputEl, maskedText);
      showToast(result.detections);
      logInterception(result.detections, window.location.href);
    }
  } finally {
    isProcessing = false;
  }
}

// ===== MutationObserver for Dynamic Elements =====

function observeNewInputs(): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        // Attach listeners to new contenteditable elements
        const editables = node.querySelectorAll('[contenteditable="true"]');
        editables.forEach((el) => {
          el.addEventListener('keydown', handleKeydown as unknown as EventListener, true);
          el.addEventListener('paste', handlePaste as unknown as EventListener, true);
        });

        if (node.isContentEditable) {
          node.addEventListener('keydown', handleKeydown as unknown as EventListener, true);
          node.addEventListener('paste', handlePaste as unknown as EventListener, true);
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// ===== Initialization =====

function init(): void {
  // Global capture-phase listeners (catches all events before they reach targets)
  document.addEventListener('keydown', handleKeydown as unknown as EventListener, true);
  document.addEventListener('paste', handlePaste as unknown as EventListener, true);
  document.addEventListener('click', handleClick as unknown as EventListener, true);

  // Watch for dynamically added inputs
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeNewInputs);
  } else {
    observeNewInputs();
  }

  console.log('[Aegis] DLP Observer v0.1.0 initialized.');
}

init();
