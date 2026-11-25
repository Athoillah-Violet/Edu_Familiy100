import { isDemoMode } from './neon.js';

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
 * Displays a styled toast notification matching app aesthetic.
 * @param {string} message - Toast message to show.
 * @param {'info'|'success'|'error'|'warning'} [type='info'] - Notification type.
 */
export function showToast(message, type = 'info') {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className =
      'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none';
    document.body.appendChild(container);
  }

  const colorStyles = {
    info: 'bg-white border-indigo-200 text-indigo-900 shadow-sm border-l-4 border-l-indigo-600',
    success: 'bg-white border-emerald-200 text-emerald-900 shadow-sm border-l-4 border-l-emerald-600',
    error: 'bg-white border-red-200 text-red-900 shadow-sm border-l-4 border-l-red-600',
    warning: 'bg-white border-amber-200 text-amber-900 shadow-sm border-l-4 border-l-amber-500',
  };

  const toast = document.createElement('div');
  toast.className = `p-3 rounded-lg border text-sm flex items-start justify-between shadow pointer-events-auto transition-all duration-200 transform translate-y-2 opacity-0 ${
    colorStyles[type] || colorStyles.info
  }`;

  toast.innerHTML = `
    <div class="flex-1 mr-2 leading-snug">${escapeHtml(message)}</div>
    <button type="button" class="text-slate-400 hover:text-slate-600 text-base leading-none focus:outline-none">&times;</button>
  `;

  const closeBtn = toast.querySelector('button');
  const dismiss = () => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  };

  closeBtn?.addEventListener('click', dismiss);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  });

  setTimeout(dismiss, 3500);
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
  badge.className =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200';
  badge.textContent = 'Mode Demo (Offline / Mock Data)';

  if (target) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el) el.appendChild(badge);
  }

  return badge;
}

