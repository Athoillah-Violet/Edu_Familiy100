import { isDemoMode } from './neon.js';
import { escapeHtml } from './ui.js';

/**
 * Reusable styling tokens for consistent UI
 */
export const styles = {
  card: 'bg-[#0f1a36] rounded-xl border border-[#1e2f5c] shadow-lg shadow-black/30 p-6',
  cardCompact: 'bg-[#0f1a36] rounded-lg border border-[#1e2f5c] shadow-md shadow-black/30 p-4',
  btnPrimary:
    'inline-flex items-center justify-center font-bold px-4 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-950/60 hover:shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#080e1e]',
  btnSecondary:
    'inline-flex items-center justify-center font-medium px-4 py-2 text-sm rounded-xl bg-[#132247] border border-[#1e2f5c] text-slate-200 hover:bg-[#1a2f60] hover:text-white hover:border-blue-500/50 active:bg-[#101b38] shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#080e1e]',
  btnDanger:
    'inline-flex items-center justify-center font-bold px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-500 active:bg-red-700 shadow-md shadow-red-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#080e1e]',
  input:
    'w-full px-3 py-2 text-sm text-white bg-[#0a1226] border border-[#1e2f5c] rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-500',
  label: 'block text-sm font-semibold text-slate-200 mb-1',
  badgeAmber:
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/40',
  badgeGreen:
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40',
  badgeSlate:
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700',
};

/**
 * Renders the top standard school navigation bar
 * @param {HTMLElement|string} target
 * @param {{ active?: string, showAdminLink?: boolean, currentAdmin?: string|null, onLogout?: Function }} [options]
 */
export function renderNavbar(target, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;

  const { active = '', showAdminLink = true, currentAdmin = null, onLogout = null } = options;

  const demoNotice = isDemoMode
    ? `<span class="${styles.badgeAmber} ml-2">Mode Demo</span>`
    : '';

  const adminSection = currentAdmin
    ? `<div class="flex items-center space-x-3 text-xs sm:text-sm">
         <span class="text-slate-400 hidden sm:inline">Admin: <strong class="text-white">${escapeHtml(currentAdmin)}</strong></span>
         <button id="nav-logout-btn" type="button" class="${styles.btnSecondary} !py-1 !px-2.5 text-xs">Keluar</button>
       </div>`
    : showAdminLink
    ? `<a href="/admin/login.html" class="text-xs sm:text-sm font-medium ${
        active === 'admin' ? 'text-blue-400 font-bold border-b-2 border-orange-500 pb-1' : 'text-slate-300 hover:text-white pb-1'
      } transition-colors">Login Admin</a>`
    : '';

  const adminSectionMobile = currentAdmin
    ? `<div class="pt-2 border-t border-[#1e2f5c] flex items-center justify-between">
         <span class="text-xs text-slate-400">Admin: <strong class="text-white">${escapeHtml(currentAdmin)}</strong></span>
         <button id="nav-logout-btn-mobile" type="button" class="${styles.btnSecondary} !py-1 !px-2.5 text-xs">Keluar</button>
       </div>`
    : showAdminLink
    ? `<a href="/admin/login.html" class="block py-2 text-sm font-medium ${
        active === 'admin' ? 'text-blue-400 font-bold' : 'text-slate-300 hover:text-white'
      } transition-colors">Login Admin Guru</a>`
    : '';

  el.innerHTML = `
    <header class="bg-[#0b1329]/95 backdrop-blur-md border-b border-[#1e2f5c] sticky top-0 z-40">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <a href="/index.html" class="flex items-center space-x-2 group">
            <span class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-blue-900/50 group-hover:bg-blue-500 transition-all group-hover:scale-105">
              F
            </span>
            <div class="flex flex-col">
              <span class="font-bold text-white text-base leading-tight group-hover:text-blue-400 transition-colors">
                Family 100 <span class="text-orange-500">BK</span>
              </span>
              <span class="text-[11px] text-slate-400 font-normal leading-tight hidden xs:inline">
                Bimbingan &amp; Konseling
              </span>
            </div>
          </a>
          ${demoNotice}
        </div>

        <!-- Desktop Navigation -->
        <nav class="hidden sm:flex items-center space-x-6">
          <a href="/index.html" class="text-xs sm:text-sm font-medium ${
            active === 'home' ? 'text-blue-400 font-bold border-b-2 border-orange-500 pb-1' : 'text-slate-300 hover:text-white transition-colors pb-1'
          }">Beranda</a>
          <a href="/setup.html" class="text-xs sm:text-sm font-medium ${
            active === 'setup' ? 'text-blue-400 font-bold border-b-2 border-orange-500 pb-1' : 'text-slate-300 hover:text-white transition-colors pb-1'
          }">Main</a>
          ${adminSection}
        </nav>

        <!-- Mobile Hamburger Button -->
        <div class="flex items-center sm:hidden">
          <button id="nav-hamburger-btn" type="button" class="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#132247] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Buka Menu">
            <svg id="hamburger-icon-open" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
            <svg id="hamburger-icon-close" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Dropdown Menu -->
      <div id="nav-mobile-menu" class="hidden sm:hidden border-t border-[#1e2f5c] bg-[#0b1329] px-4 pt-2 pb-4 space-y-1 shadow-xl">
        <a href="/index.html" class="block py-2 text-sm font-medium ${
          active === 'home' ? 'text-blue-400 font-bold' : 'text-slate-300 hover:text-white'
        } transition-colors">Beranda</a>
        <a href="/setup.html" class="block py-2 text-sm font-medium ${
          active === 'setup' ? 'text-blue-400 font-bold' : 'text-slate-300 hover:text-white'
        } transition-colors">Main Permainan</a>
        ${adminSectionMobile}
      </div>
    </header>
  `;

  // Hamburger toggle logic
  const hamburgerBtn = el.querySelector('#nav-hamburger-btn');
  const mobileMenu = el.querySelector('#nav-mobile-menu');
  const iconOpen = el.querySelector('#hamburger-icon-open');
  const iconClose = el.querySelector('#hamburger-icon-close');

  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
      const isHidden = mobileMenu.classList.toggle('hidden');
      iconOpen?.classList.toggle('hidden', !isHidden);
      iconClose?.classList.toggle('hidden', isHidden);
    });
  }

  if (currentAdmin && onLogout) {
    const logoutBtn = el.querySelector('#nav-logout-btn');
    const logoutBtnMobile = el.querySelector('#nav-logout-btn-mobile');
    logoutBtn?.addEventListener('click', onLogout);
    logoutBtnMobile?.addEventListener('click', onLogout);
  }
}

/**
 * Renders the clean standard school footer
 * @param {HTMLElement|string} target
 */
export function renderFooter(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;

  el.innerHTML = `
    <footer class="bg-[#070d1e] border-t border-[#1e2f5c] py-6 mt-auto">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 text-center sm:text-left">
        <p>Family 100 BK &bull; Media Edukatif Bimbingan &amp; Konseling SMP/SMA</p>
        <p>Didesain untuk dipandu Guru BK di layar proyektor kelas.</p>
      </div>
    </footer>
  `;
}

/**
 * Displays a styled toast notification matching app aesthetic
 * @param {string} message
 * @param {'info'|'success'|'error'|'warning'} [type='info']
 */
export function showToast(message, type = 'info') {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none';
    document.body.appendChild(container);
  }

  const colorStyles = {
    info: 'bg-[#0f1a36] border-blue-500/50 text-white shadow-xl shadow-black/40 border-l-4 border-l-blue-500',
    success: 'bg-[#0f1a36] border-emerald-500/50 text-white shadow-xl shadow-black/40 border-l-4 border-l-emerald-500',
    error: 'bg-[#0f1a36] border-red-500/50 text-white shadow-xl shadow-black/40 border-l-4 border-l-red-500',
    warning: 'bg-[#0f1a36] border-orange-500/50 text-white shadow-xl shadow-black/40 border-l-4 border-l-orange-500',
  };

  const toast = document.createElement('div');
  toast.className = `p-3 rounded-xl border text-sm flex items-start justify-between shadow-lg pointer-events-auto transition-all duration-200 transform translate-y-2 opacity-0 ${
    colorStyles[type] || colorStyles.info
  }`;

  toast.innerHTML = `
    <div class="flex-1 mr-2 leading-snug">${escapeHtml(message)}</div>
    <button type="button" class="text-slate-400 hover:text-white text-base leading-none focus:outline-none">&times;</button>
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
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  });

  setTimeout(dismiss, 3500);
}

/**
 * Creates an accessible modal dialog with focus lock and Escape key listener
 * @param {Object} options
 * @param {string} options.title
 * @param {string} [options.bodyHtml]
 * @param {string} [options.confirmText='OK']
 * @param {string} [options.cancelText='Batal']
 * @param {boolean} [options.isDanger=false]
 * @param {Function} [options.onConfirm]
 * @param {Function} [options.onCancel]
 * @returns {{ open: () => void, close: () => void, element: HTMLElement }}
 */
export function createModal({
  title,
  bodyHtml = '',
  confirmText = 'OK',
  cancelText = 'Batal',
  isDanger = false,
  onConfirm = null,
  onCancel = null,
}) {
  const backdrop = document.createElement('div');
  backdrop.className =
    'fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-150 opacity-0 pointer-events-none';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  const btnConfirmClass = isDanger ? styles.btnDanger : styles.btnPrimary;

  backdrop.innerHTML = `
    <div class="bg-[#0f1a36] rounded-2xl border border-[#1e2f5c] shadow-2xl max-w-md w-full p-6 transform transition-all duration-150 scale-95" id="modal-card">
      <div class="flex items-center justify-between pb-3 border-b border-[#1e2f5c]">
        <h3 class="text-base font-bold text-white">${escapeHtml(title)}</h3>
        <button type="button" id="modal-close-icon" class="text-slate-400 hover:text-white text-xl leading-none focus:outline-none">&times;</button>
      </div>
      <div class="py-4 text-sm text-slate-300 leading-relaxed" id="modal-body">
        ${bodyHtml}
      </div>
      <div class="flex items-center justify-end space-x-3 pt-3 border-t border-[#1e2f5c]">
        ${
          cancelText
            ? `<button type="button" id="modal-cancel-btn" class="${styles.btnSecondary}">${escapeHtml(
                cancelText
              )}</button>`
            : ''
        }
        <button type="button" id="modal-confirm-btn" class="${btnConfirmClass}">${escapeHtml(
    confirmText
  )}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  let previousActiveElement = null;

  const focusableSelector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const focusable = backdrop.querySelectorAll(focusableSelector);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      close();
      if (onCancel) onCancel();
    } else if (e.key === 'Tab') {
      trapFocus(e);
    }
  }

  function open() {
    previousActiveElement = document.activeElement;
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    const card = backdrop.querySelector('#modal-card');
    card.classList.remove('scale-95');
    document.addEventListener('keydown', handleKeydown);

    // Focus confirm button
    const confirmBtn = backdrop.querySelector('#modal-confirm-btn');
    setTimeout(() => confirmBtn?.focus(), 50);
  }

  function close() {
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    const card = backdrop.querySelector('#modal-card');
    card.classList.add('scale-95');
    document.removeEventListener('keydown', handleKeydown);
    if (previousActiveElement && previousActiveElement.focus) {
      previousActiveElement.focus();
    }
    setTimeout(() => {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    }, 150);
  }

  backdrop.querySelector('#modal-close-icon')?.addEventListener('click', () => {
    close();
    if (onCancel) onCancel();
  });

  backdrop.querySelector('#modal-cancel-btn')?.addEventListener('click', () => {
    close();
    if (onCancel) onCancel();
  });

  backdrop.querySelector('#modal-confirm-btn')?.addEventListener('click', () => {
    if (onConfirm) {
      onConfirm(close);
    } else {
      close();
    }
  });

  // Click outside to cancel
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      close();
      if (onCancel) onCancel();
    }
  });

  return { open, close, element: backdrop };
}

/**
 * Async modal replacement for window.confirm()
 * @param {string} message
 * @param {Object} [options]
 * @param {string} [options.title='Konfirmasi']
 * @param {string} [options.confirmText='Lanjutkan']
 * @param {string} [options.cancelText='Batal']
 * @param {boolean} [options.isDanger=false]
 * @returns {Promise<boolean>}
 */
export function confirmModal(
  message,
  {
    title = 'Konfirmasi',
    confirmText = 'Lanjutkan',
    cancelText = 'Batal',
    isDanger = false,
  } = {}
) {
  return new Promise((resolve) => {
    const modal = createModal({
      title,
      bodyHtml: `<p>${escapeHtml(message)}</p>`,
      confirmText,
      cancelText,
      isDanger,
      onConfirm: (close) => {
        close();
        resolve(true);
      },
      onCancel: () => {
        resolve(false);
      },
    });
    modal.open();
  });
}
