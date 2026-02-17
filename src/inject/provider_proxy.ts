/**
 * Provider Proxy - Web3 Wallet Hijack (Main World)
 *
 * CRITICAL: This script runs in the Main World (not Isolated World).
 * It must execute BEFORE any DApp reads window.ethereum.
 *
 * Strategy:
 * 1. Wrap window.ethereum.request() with ES6 Proxy
 * 2. Intercept dangerous methods (eth_sendTransaction, signing, etc.)
 * 3. Hold the Promise while background + user makes a decision
 * 4. Resolve or reject based on user action
 *
 * Communication: window.postMessage ↔ Content Script (bridge.ts) ↔ Background
 *
 * Built as IIFE - no module imports, no dependencies.
 */

;(function aegisProviderProxy() {
  'use strict';

  // ===== Constants =====

  const AEGIS_PREFIX = '__AEGIS_BRIDGE__';
  const INTERCEPT_TIMEOUT = 5 * 60 * 1000; // 5 minutes for user decision

  // Methods that require interception
  const DANGEROUS_METHODS: Record<string, string> = {
    'eth_sendTransaction': 'Transaction',
    'eth_signTypedData_v4': 'Typed Data Signing',
    'eth_signTypedData_v3': 'Typed Data Signing',
    'eth_signTypedData': 'Typed Data Signing',
    'personal_sign': 'Personal Sign',
    'eth_sign': 'Raw Sign (Dangerous)',
  };

  // ===== State =====

  // Pending requests: requestId → { resolve, reject }
  const pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  // Track if we've already proxied
  let isProxied = false;

  // ===== Utility =====

  function generateRequestId(): string {
    return `aegis-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function log(...args: unknown[]): void {
    console.log('[Aegis Proxy]', ...args);
  }

  // ===== Message Communication =====

  /**
   * Send message to Content Script via postMessage
   */
  function sendToBridge(payload: Record<string, unknown>, requestId: string): void {
    window.postMessage({
      source: AEGIS_PREFIX,
      direction: 'to_background',
      payload,
      requestId,
    }, '*');
  }

  /**
   * Listen for responses from Content Script
   */
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    const data = event.data;
    if (!data || data.source !== AEGIS_PREFIX) return;
    if (data.direction !== 'to_main_world') return;

    // Check if this is a response to a pending request
    const responsePayload = data.payload;
    if (!responsePayload || !responsePayload.requestId) return;

    const pending = pendingRequests.get(responsePayload.requestId);
    if (!pending) return;

    // Clear timeout
    clearTimeout(pending.timer);
    pendingRequests.delete(responsePayload.requestId);

    const response = responsePayload.response;

    if (response?.action === 'approve') {
      // User approved - resolve with 'approved' flag so the proxy can forward
      pending.resolve({ __aegis_approved: true });
    } else {
      // User rejected - reject the promise
      pending.reject(new Error('Aegis: Transaction rejected by user'));
    }
  });

  // ===== Proxy Logic =====

  /**
   * Intercept a dangerous RPC call.
   * Returns a Promise that hangs until user approves/rejects.
   */
  function interceptRequest(
    method: string,
    params: unknown[],
    originalRequest: (args: { method: string; params: unknown[] }) => Promise<unknown>
  ): Promise<unknown> {
    const requestId = generateRequestId();
    const methodLabel = DANGEROUS_METHODS[method] || method;

    log(`Intercepting: ${method} (${methodLabel})`);

    return new Promise((resolve, reject) => {
      // Timeout: auto-reject after 5 minutes
      const timer = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Aegis: Request timed out (5 min). Transaction cancelled for safety.'));
      }, INTERCEPT_TIMEOUT);

      pendingRequests.set(requestId, { resolve, reject, timer });

      // Send to Content Script → Background for analysis
      sendToBridge({
        type: 'WEB3_INTERCEPT',
        method,
        params,
        origin: window.location.origin,
        methodLabel,
      }, requestId);
    }).then(async (result: unknown) => {
      // If user approved, forward the original request to the real provider
      if (result && typeof result === 'object' && '__aegis_approved' in (result as Record<string, unknown>)) {
        log(`User approved: ${method}. Forwarding to wallet...`);
        return originalRequest({ method, params });
      }
      return result;
    });
  }

  /**
   * Create a Proxy handler for the ethereum.request() method
   */
  function createRequestProxy(
    originalRequest: (...args: unknown[]) => Promise<unknown>
  ): (...args: unknown[]) => Promise<unknown> {
    return function proxiedRequest(this: unknown, ...args: unknown[]): Promise<unknown> {
      const arg = args[0] as { method?: string; params?: unknown[] } | undefined;

      if (!arg || typeof arg !== 'object' || !arg.method) {
        return originalRequest.apply(this, args);
      }

      const { method, params = [] } = arg;

      // Check if this method needs interception
      if (method in DANGEROUS_METHODS) {
        return interceptRequest(method, params, (fwdArgs) => {
          return originalRequest.apply(this, [fwdArgs]);
        });
      }

      // Pass through non-dangerous methods
      return originalRequest.apply(this, args);
    };
  }

  /**
   * Wrap an ethereum provider object with our Proxy
   */
  function proxyProvider(provider: Record<string, unknown>): Record<string, unknown> {
    if ((provider as { __aegis_proxied?: boolean }).__aegis_proxied) {
      return provider; // Already proxied
    }

    const originalRequest = provider.request;
    if (typeof originalRequest !== 'function') {
      return provider; // No request method, not a valid provider
    }

    // Proxy the request method
    const proxiedRequest = createRequestProxy(originalRequest.bind(provider));

    return new Proxy(provider, {
      get(target, prop, receiver) {
        if (prop === 'request') {
          return proxiedRequest;
        }
        if (prop === '__aegis_proxied') {
          return true;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  // ===== Provider Detection & Installation =====

  /**
   * Install proxy on window.ethereum
   * Handles both immediate and delayed (MetaMask) injection
   */
  function installProxy(): void {
    if (isProxied) return;

    // Use 'any' for window.ethereum access since it's not in standard Window type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;

    // Case 1: Provider already exists
    if (typeof win.ethereum !== 'undefined') {
      const original = win.ethereum;
      if (original && typeof original === 'object') {
        const proxied = proxyProvider(original as Record<string, unknown>);
        win.ethereum = proxied;
        isProxied = true;
        log('Proxy installed on existing window.ethereum');
        return;
      }
    }

    // Case 2: Provider not yet injected (MetaMask injects late)
    // Use Object.defineProperty to intercept when it's set
    let _ethereum: unknown = win.ethereum;

    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      enumerable: true,
      get() {
        return _ethereum;
      },
      set(newProvider: unknown) {
        if (newProvider && typeof newProvider === 'object' && !isProxied) {
          _ethereum = proxyProvider(newProvider as Record<string, unknown>);
          isProxied = true;
          log('Proxy installed on newly injected window.ethereum');
        } else {
          _ethereum = newProvider;
        }
      },
    });

    log('Watching for window.ethereum injection...');
  }

  // ===== EIP-6963: Multi-Wallet Support =====
  // Modern wallets announce themselves via custom events

  function interceptEIP6963(): void {
    const originalDispatch = window.dispatchEvent.bind(window);

    window.dispatchEvent = function(event: Event): boolean {
      if (event.type === 'eip6963:announceProvider') {
        const detail = (event as CustomEvent).detail;
        if (detail && detail.provider && typeof detail.provider === 'object') {
          detail.provider = proxyProvider(detail.provider);
          log('Proxy installed on EIP-6963 provider:', detail.info?.name || 'unknown');
        }
      }
      return originalDispatch(event);
    };
  }

  // ===== Initialize =====

  try {
    installProxy();
    interceptEIP6963();
    log('Provider Proxy v0.2.0 initialized');
  } catch (err) {
    console.error('[Aegis Proxy] Failed to initialize:', err);
  }

})();
