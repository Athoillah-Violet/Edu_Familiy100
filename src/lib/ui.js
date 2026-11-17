import { isDemoMode } from './supabase.js';

/**
 * Escapes HTML characters without double-escaping already escaped entities.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const text = String(str);

  // Unescape standard entities first to prevent double-escaping
  const unescaped = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');

  return unescaped
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Displays a lightweight toast notification with minimal inline styles.
 * @param {string} message - Toast message to show.
 * @param {'info'|'success'|'error'|'warning'} [type='info'] - Notification type.
 */
export function showToast(message, type = 'info') {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText =
      'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; font-family: sans-serif; font-size: 14px; pointer-events: none;';
    document.body.appendChild(container);
  }

  const bgColors = {
    info: '#2563eb',
    success: '#16a34a',
    error: '#dc2626',
    warning: '#d97706',
  };

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${bgColors[type] || bgColors.info};
    color: #ffffff;
    padding: 10px 16px;
    border-radius: 4px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    pointer-events: auto;
    transition: opacity 0.3s ease;
  `;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3500);
}

/**
 * Renders or returns a simple text marker if currently running in Demo Mode.
 * @param {HTMLElement|string} [target] - Optional target element or selector to append/render inside.
 * @returns {HTMLElement|null} The created badge element, or null if not demo mode.
 */
export function renderDemoBadge(target = null) {
  if (!isDemoMode || typeof document === 'undefined') {
    return null;
  }

  const badge = document.createElement('div');
  badge.id = 'demo-mode-indicator';
  badge.style.cssText =
    'display: inline-block; padding: 2px 8px; margin: 4px; background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; border-radius: 4px; font-size: 12px; font-weight: bold; font-family: sans-serif;';
  badge.textContent = 'Mode Demo (Offline / Mock Data)';

  if (target) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el) el.appendChild(badge);
  }

  return badge;
}
