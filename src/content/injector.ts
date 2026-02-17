/**
 * Injector - Injects provider_proxy.js into Main World
 *
 * Content Scripts run in an Isolated World and cannot access window.ethereum.
 * This injector creates a <script> tag that loads provider_proxy.js into
 * the Main World context, allowing it to intercept wallet provider calls.
 *
 * Must run at document_start to execute before any DApp code.
 *
 * Also initializes the bridge for Content Script ↔ Main World communication.
 */

import { initBridge } from './bridge';

// Inject provider_proxy.js into Main World via <script> tag
function injectProviderProxy(): void {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('provider_proxy.js');
    script.type = 'text/javascript';

    // Insert as early as possible (before any other scripts run)
    const target = document.head || document.documentElement;
    target.prepend(script);

    // Clean up the <script> tag after it loads (keeps DOM clean)
    script.onload = () => script.remove();

    console.log('[Aegis] Provider proxy injected into Main World');
  } catch (err) {
    console.error('[Aegis] Failed to inject provider proxy:', err);
  }
}

// ===== Initialize =====

// 1. Inject the Main World script
injectProviderProxy();

// 2. Initialize the Content Script bridge
//    (listens for postMessage from Main World, relays to background)
initBridge();
