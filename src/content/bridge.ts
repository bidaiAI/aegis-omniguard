/**
 * Bridge - Communication bridge between Main World and Content Script
 *
 * Main World (provider_proxy.ts) cannot access chrome.runtime directly.
 * This bridge relays messages via window.postMessage.
 *
 * Flow:
 *   Main World → postMessage → Content Script → chrome.runtime → Background
 *   Background → chrome.runtime → Content Script → postMessage → Main World
 *
 * For Web3 intercepted transactions:
 *   1. provider_proxy.ts sends WEB3_INTERCEPT via postMessage
 *   2. bridge.ts receives it, relays to background for analysis
 *   3. bridge.ts shows AlertPanel with analysis results
 *   4. User clicks approve/reject in AlertPanel
 *   5. bridge.ts sends decision back to provider_proxy.ts via postMessage
 */

import { MSG } from '../shared/message_types';
import { createShadowHost, injectStyles } from '../overlay/shadow_host';

const AEGIS_MSG_PREFIX = '__AEGIS_BRIDGE__';

export interface BridgeMessage {
  source: typeof AEGIS_MSG_PREFIX;
  direction: 'to_background' | 'to_main_world';
  payload: Record<string, unknown>;
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
export function sendToMainWorld(payload: Record<string, unknown>, requestId?: string): void {
  const message: BridgeMessage = {
    source: AEGIS_MSG_PREFIX,
    direction: 'to_main_world',
    payload,
    requestId: requestId || generateRequestId(),
  };
  window.postMessage(message, '*');
}

// ===== AlertPanel UI =====

const ALERT_PANEL_CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 2147483647;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: fadeIn 0.2s ease;
  }

  .panel {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-radius: 20px;
    width: 420px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
    color: #e2e8f0;
    padding: 28px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }
  .header .shield { font-size: 28px; }
  .header .title { font-size: 18px; font-weight: 700; }

  .risk-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .risk-safe { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
  .risk-warning { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
  .risk-danger { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
  .risk-analyzing { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }

  .section { margin-bottom: 16px; }
  .section-title {
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 1px; color: #64748b; margin-bottom: 8px;
  }
  .section-body {
    background: rgba(0,0,0,0.2); border-radius: 12px; padding: 12px 16px;
    font-size: 13px; line-height: 1.6; color: #cbd5e1; word-break: break-all;
  }
  .mono {
    font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
    font-size: 12px;
  }
  .detail-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .detail-label { color: #64748b; }
  .detail-value { color: #e2e8f0; font-weight: 500; }
  .explanation { font-size: 13px; line-height: 1.7; color: #94a3b8; }

  .actions { display: flex; gap: 12px; margin-top: 24px; }
  .btn {
    flex: 1; padding: 14px 20px; border-radius: 12px; font-size: 14px;
    font-weight: 600; cursor: pointer; border: none;
    transition: all 0.15s; text-align: center;
  }
  .btn:active { transform: scale(0.97); }

  .btn-reject {
    background: rgba(0,212,170,0.1); color: #00d4aa;
    border: 2px solid rgba(0,212,170,0.3);
  }
  .btn-reject:hover { background: rgba(0,212,170,0.2); border-color: #00d4aa; }

  .btn-approve {
    background: rgba(100,116,139,0.1); color: #94a3b8;
    border: 2px solid rgba(100,116,139,0.2);
  }
  .btn-approve:hover { background: rgba(100,116,139,0.2); border-color: #94a3b8; }

  .btn-approve-danger {
    background: rgba(239,68,68,0.1); color: #ef4444;
    border: 2px solid rgba(239,68,68,0.3);
  }
  .btn-approve-danger:hover { background: rgba(239,68,68,0.2); border-color: #ef4444; }

  .spinner {
    display: inline-block; width: 16px; height: 16px;
    border: 2px solid rgba(129,140,248,0.3); border-top-color: #818cf8;
    border-radius: 50%; animation: spin 0.8s linear infinite;
    margin-right: 8px; vertical-align: middle;
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

interface AlertData {
  method: string;
  methodLabel: string;
  params: unknown[];
  origin: string;
  riskLevel?: 'safe' | 'warning' | 'danger';
  explanation?: string;
  analysisComplete?: boolean;
}

/**
 * Show the AlertPanel and wait for user decision.
 * Returns a Promise that resolves with 'approve' or 'reject'.
 */
function showAlertPanelAndWait(data: AlertData): Promise<'approve' | 'reject'> {
  return new Promise((resolve) => {
    const { host, shadow } = createShadowHost('aegis-alert-panel');

    // Make host cover full screen for alert overlay
    host.style.cssText = `
      position: fixed; z-index: 2147483647;
      top: 0; left: 0; width: 100vw; height: 100vh;
      pointer-events: auto;
    `;

    injectStyles(shadow, ALERT_PANEL_CSS);

    const riskLevel = data.riskLevel || 'warning';
    const riskMeta: Record<string, { cls: string; emoji: string; label: string }> = {
      safe: { cls: 'risk-safe', emoji: '\u2705', label: 'Low Risk' },
      warning: { cls: 'risk-warning', emoji: '\u26a0\ufe0f', label: 'Medium Risk' },
      danger: { cls: 'risk-danger', emoji: '\ud83d\udea8', label: 'High Risk' },
    };
    const risk = riskMeta[riskLevel] || riskMeta.warning;
    const isDanger = riskLevel === 'danger';

    // Parse transaction details
    const txParams = (data.params?.[0] || {}) as Record<string, string>;
    const toAddr = txParams.to || 'Unknown';
    const value = txParams.value ? `${parseInt(txParams.value, 16) / 1e18} ETH` : '0 ETH';

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="panel">
        <div class="header">
          <span class="shield">\ud83d\udee1\ufe0f</span>
          <span class="title">Aegis Web3 Guard</span>
        </div>

        <div style="margin-bottom: 16px;">
          <span class="risk-badge ${data.analysisComplete ? risk.cls : 'risk-analyzing'}">
            ${data.analysisComplete ? risk.emoji : '<span class="spinner"></span>'}
            ${data.analysisComplete ? risk.label : 'Analyzing...'}
          </span>
        </div>

        <div class="section">
          <div class="section-title">Transaction Details</div>
          <div class="section-body">
            <div class="detail-row">
              <span class="detail-label">Method</span>
              <span class="detail-value">${data.methodLabel}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">DApp</span>
              <span class="detail-value">${data.origin}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">To</span>
              <span class="detail-value mono">${toAddr.slice(0, 10)}...${toAddr.slice(-8)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Value</span>
              <span class="detail-value">${value}</span>
            </div>
          </div>
        </div>

        ${data.explanation ? `
        <div class="section">
          <div class="section-title">Risk Analysis</div>
          <div class="section-body explanation">${data.explanation}</div>
        </div>
        ` : ''}

        <div class="actions">
          <button class="btn btn-reject" id="aegis-reject">\ud83d\uded1 Reject</button>
          <button class="btn ${isDanger ? 'btn-approve-danger' : 'btn-approve'}" id="aegis-approve">
            ${isDanger ? '\u26a0\ufe0f Force Approve' : '\u2705 Approve'}
          </button>
        </div>
      </div>
    `;

    shadow.appendChild(overlay);

    function cleanup(action: 'approve' | 'reject') {
      host.remove();
      resolve(action);
    }

    shadow.getElementById('aegis-reject')?.addEventListener('click', () => cleanup('reject'));
    shadow.getElementById('aegis-approve')?.addEventListener('click', () => cleanup('approve'));

    // ESC key rejects
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.removeEventListener('keydown', escHandler);
        cleanup('reject');
      }
    };
    window.addEventListener('keydown', escHandler);
  });
}

// ===== Bridge Message Handler =====

/**
 * Listen for messages from Main World and relay to Background.
 * Special handling for WEB3_INTERCEPT: shows AlertPanel + waits for user.
 */
export function initBridge(): void {
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;

    const data = event.data as BridgeMessage;
    if (data?.source !== AEGIS_MSG_PREFIX) return;
    if (data.direction !== 'to_background') return;

    const payload = data.payload;

    // === Web3 Intercept: Show AlertPanel ===
    if (payload.type === 'WEB3_INTERCEPT') {
      await handleWeb3Intercept(data);
      return;
    }

    // === Default: relay to background and send response back ===
    try {
      const response = await chrome.runtime.sendMessage(payload);
      sendToMainWorld(
        { requestId: data.requestId, response },
        data.requestId
      );
    } catch (err) {
      console.error('[Aegis Bridge] Error relaying message:', err);
      sendToMainWorld(
        { requestId: data.requestId, response: { error: String(err) } },
        data.requestId
      );
    }
  });

  console.log('[Aegis] Bridge initialized');
}

/**
 * Handle Web3 intercept: send to background for analysis,
 * show AlertPanel with results, relay user decision.
 */
async function handleWeb3Intercept(data: BridgeMessage): Promise<void> {
  const payload = data.payload;

  // Send to background for analysis
  let analysisResult: Record<string, unknown>;

  try {
    analysisResult = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: MSG.WEB3_INTERCEPT,
          payload: {
            method: payload.method,
            params: payload.params,
            origin: payload.origin,
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              riskLevel: 'warning',
              explanation: 'Analysis service unavailable. Please review the transaction carefully.',
            });
            return;
          }
          resolve(response || {
            riskLevel: 'warning',
            explanation: 'No response from analyzer.',
          });
        }
      );
    });
  } catch {
    analysisResult = {
      riskLevel: 'warning',
      explanation: 'Analysis failed. Please review the transaction carefully.',
    };
  }

  // Show AlertPanel with analysis results
  const alertData: AlertData = {
    method: payload.method as string,
    methodLabel: (payload.methodLabel as string) || (payload.method as string),
    params: payload.params as unknown[],
    origin: payload.origin as string,
    riskLevel: (analysisResult.riskLevel as AlertData['riskLevel']) || 'warning',
    explanation: (analysisResult.explanation as string) || undefined,
    analysisComplete: true,
  };

  const action = await showAlertPanelAndWait(alertData);

  // Send user decision back to Main World
  sendToMainWorld(
    { requestId: data.requestId, response: { action } },
    data.requestId
  );
}
