/**
 * Shadow DOM Host Manager
 *
 * CRITICAL (Difficulty #4):
 * All injected UI must be wrapped in Shadow DOM to prevent:
 * 1. Host page CSS from polluting our components
 * 2. Our Tailwind classes from breaking the host page
 *
 * Uses 'closed' mode for maximum isolation.
 */

export function createShadowHost(id: string): {
  host: HTMLElement;
  shadow: ShadowRoot;
  container: HTMLDivElement;
} {
  // Remove existing host if present
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = id;

  // Ensure host is on top of everything
  host.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  `;

  const shadow = host.attachShadow({ mode: 'closed' });

  const container = document.createElement('div');
  container.style.pointerEvents = 'auto';
  shadow.appendChild(container);

  document.body.appendChild(host);

  return { host, shadow, container };
}

/**
 * Inject CSS into a shadow root
 */
export function injectStyles(shadow: ShadowRoot, css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  shadow.prepend(style);
}
