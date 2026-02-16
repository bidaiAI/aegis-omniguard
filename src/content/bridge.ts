/**
 * Bridge - Communication bridge between Main World and Content Script
 *
 * Main World (provider_proxy.ts) cannot access chrome.runtime directly.
 * This bridge relays messages via window.postMessage.
 *
 * Flow: Main World → postMessage → Content Script → chrome.runtime → Background
 *
 * NOTE: Phase 2 feature. Skeleton for Phase 1.
 */

const AEGIS_MSG_PREFIX = '__AEGIS_BRIDGE__';

export interface BridgeMessage {
  source: typeof AEGIS_MSG_PREFIX;
  direction: 'to_background' | 'to_main_world';
  payload: unknown;
  requestId: string;
}

/**
 * Generate a unique request ID for message correlation
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Send a message from Content Script to Main World
 */
export function sendToMainWorld(payload: unknown): void {
  const message: BridgeMessage = {
    source: AEGIS_MSG_PREFIX,
    direction: 'to_main_world',
    payload,
    requestId: generateRequestId(),
  };
  window.postMessage(message, '*');
}

/**
 * Listen for messages from Main World and relay to Background
 */
export function initBridge(): void {
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;

    const data = event.data as BridgeMessage;
    if (data?.source !== AEGIS_MSG_PREFIX) return;
    if (data.direction !== 'to_background') return;

    // Relay to background
    const response = await chrome.runtime.sendMessage(data.payload);

    // Send response back to Main World
    sendToMainWorld({
      requestId: data.requestId,
      response,
    });
  });
}
