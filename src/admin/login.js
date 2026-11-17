import { login, logout, isAdmin } from '../lib/dataService.js';
import { redirectIfLoggedIn } from '../lib/guard.js';
import { isDemoMode } from '../lib/supabase.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const statusMessage = document.getElementById('status-message');

// Cek apakah admin sudah login, jika ya langsung alihkan ke dashboard
redirectIfLoggedIn();

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusMessage.textContent = '';
  statusMessage.style.color = '#b91c1c';

  if (isDemoMode) {
    statusMessage.textContent = 'Mode demo: admin butuh koneksi database.';
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    statusMessage.textContent = 'Email dan kata sandi wajib diisi.';
    return;
  }

  // Set loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Memproses...';

  try {
    const loginRes = await login(email, password);
    if (loginRes.error) {
      statusMessage.textContent = loginRes.error || 'Terjadi kesalahan saat masuk. Silakan coba lagi.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk';
      return;
    }

    // Cek hak akses di tabel admins
    const adminCheck = await isAdmin();
    if (!adminCheck.data) {
      await logout();
      statusMessage.textContent = 'Akun ini tidak memiliki akses admin.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk';
      return;
    }

    // Berhasil dan terverifikasi admin
    submitBtn.textContent = 'Berhasil! Mengalihkan...';
    window.location.href = '/admin/index.html';
  } catch (err) {
    console.error('Error in login submit:', err);
    statusMessage.textContent = 'Terjadi kesalahan jaringan atau server.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Masuk';
  }
});
