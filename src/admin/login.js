import { login, logout, isAdmin } from '../lib/dataService.js';
import { redirectIfLoggedIn } from '../lib/guard.js';
import { isDemoMode } from '../lib/supabase.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const statusMessage = document.getElementById('status-message');
const togglePasswordBtn = document.getElementById('toggle-password-btn');

// Toggle show / hide password
togglePasswordBtn?.addEventListener('click', () => {
  if (passwordInput) {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    togglePasswordBtn.textContent = isPassword ? 'Sembunyikan' : 'Lihat';
  }
});

// Cek apakah admin sudah login, jika ya langsung alihkan ke dashboard
redirectIfLoggedIn();

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (statusMessage) {
    statusMessage.textContent = '';
    statusMessage.className = 'mt-3 text-xs text-red-600 font-medium text-center';
  }

  if (isDemoMode) {
    if (statusMessage) {
      statusMessage.textContent = 'Mode demo: admin butuh koneksi database.';
    }
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    if (statusMessage) {
      statusMessage.textContent = 'Email dan kata sandi wajib diisi.';
    }
    return;
  }

  // Set loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Memproses...';

  try {
    const loginRes = await login(email, password);
    if (loginRes.error) {
      if (statusMessage) {
        statusMessage.textContent = loginRes.error || 'Terjadi kesalahan saat masuk. Silakan coba lagi.';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk ke Panel Admin';
      return;
    }

    // Cek hak akses di tabel admins
    const adminCheck = await isAdmin();
    if (!adminCheck.data) {
      await logout();
      if (statusMessage) {
        statusMessage.textContent = 'Akun ini tidak memiliki akses admin guru.';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk ke Panel Admin';
      return;
    }

    // Berhasil dan terverifikasi admin
    submitBtn.textContent = 'Berhasil! Mengalihkan...';
    if (statusMessage) {
      statusMessage.className = 'mt-3 text-xs text-emerald-600 font-medium text-center';
      statusMessage.textContent = 'Otentikasi berhasil. Mengalihkan...';
    }
    window.location.href = '/admin/index.html';
  } catch (err) {
    console.error('Error in login submit:', err);
    if (statusMessage) {
      statusMessage.textContent = 'Terjadi kesalahan jaringan atau server.';
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Masuk ke Panel Admin';
  }
});
