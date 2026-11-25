/**
 * Admin Route Guard Helpers.
 *
 * CATATAN PENTING KEAMANAN:
 * Pengecekan guard di sisi client ini hanya berfungsi untuk menyembunyikan atau mengalihkan
 * halaman UI demi kenyamanan pengguna. Keamanan data yang sesungguhnya serta otorisasi
 * hak akses admin mutlak berada di Row Level Security (RLS) database Supabase.
 */

import { isDemoMode } from './neon.js';
import { getSession, isAdmin } from './dataService.js';

let demoNoticeRendered = false;

function showDemoNotice() {
  if (demoNoticeRendered || typeof document === 'undefined') return;
  demoNoticeRendered = true;

  const notice = document.createElement('div');
  notice.id = 'demo-admin-notice';
  notice.style.cssText =
    'padding: 12px 16px; margin: 12px 0; background: #fee2e2; color: #991b1b; border: 1px solid #ef4444; border-radius: 4px; font-family: sans-serif; font-weight: bold;';
  notice.textContent = 'Mode demo: admin butuh koneksi database';

  if (document.body) {
    document.body.prepend(notice);
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      document.body.prepend(notice);
    });
  }
}

/**
 * Ensures the user has an active session and is an admin.
 * If not, redirects to /admin/login.html.
 * In demo mode, renders a notice without looping.
 *
 * @returns {Promise<{ user: object }|null>}
 */
export async function requireAdmin() {
  if (isDemoMode) {
    showDemoNotice();
    return null;
  }

  try {
    const sessionRes = await getSession();
    if (sessionRes.error || !sessionRes.data || !sessionRes.data.user) {
      if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/admin/login.html')) {
        window.location.href = '/admin/login.html';
      }
      return null;
    }

    const adminRes = await isAdmin();
    if (adminRes.error || !adminRes.data) {
      if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/admin/login.html')) {
        window.location.href = '/admin/login.html';
      }
      return null;
    }

    return { user: sessionRes.data.user };
  } catch (err) {
    console.error('requireAdmin guard error:', err);
    if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/admin/login.html')) {
      window.location.href = '/admin/login.html';
    }
    return null;
  }
}

/**
 * Used on login page: if already logged in and confirmed as admin,
 * redirect immediately to /admin/index.html.
 * In demo mode, shows a notice and does nothing to avoid infinite redirect loops.
 *
 * @returns {Promise<void>}
 */
export async function redirectIfLoggedIn() {
  if (isDemoMode) {
    showDemoNotice();
    return;
  }

  try {
    const sessionRes = await getSession();
    if (sessionRes.data && sessionRes.data.user) {
      const adminRes = await isAdmin();
      if (adminRes.data) {
        if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/admin/index.html')) {
          window.location.href = '/admin/index.html';
        }
      }
    }
  } catch (err) {
    console.error('redirectIfLoggedIn guard error:', err);
  }
}
