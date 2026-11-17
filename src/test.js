import { isDemoMode, supabase } from './lib/supabase.js';
import {
  getCategories,
  getQuestions,
  getAllCategories,
  getSession,
  login,
  logout,
  isAdmin,
} from './lib/dataService.js';
import { suggestMatches } from './lib/matcher.js';
import { renderDemoBadge, showToast } from './lib/ui.js';

const outputEl = document.getElementById('output');
const demoIndicatorContainer = document.getElementById('demo-indicator-container');

function logOutput(title, data) {
  const timestamp = new Date().toLocaleTimeString();
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  outputEl.textContent = `[${timestamp}] === ${title} ===\n${content}\n\n` + outputEl.textContent;
}

// Render demo badge if demo mode is active
renderDemoBadge(demoIndicatorContainer);

// 1. Status Mode
document.getElementById('btn-status')?.addEventListener('click', () => {
  const status = {
    isDemoMode,
    supabaseClientAvailable: Boolean(supabase),
    supabaseUrlConfigured: Boolean(import.meta.env.VITE_SUPABASE_URL),
    supabasePublishableKeyConfigured: Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    note: isDemoMode
      ? 'Aplikasi berjalan dalam MODE DEMO (menggunakan src/data/demo.json).'
      : 'Aplikasi terhubung dengan konfigurasi Supabase.',
  };
  logOutput('STATUS MODE', status);
  showToast(isDemoMode ? 'Aktif dalam Mode Demo' : 'Terhubung ke Supabase', isDemoMode ? 'warning' : 'success');
});

// 2. Data
document.getElementById('btn-categories')?.addEventListener('click', async () => {
  logOutput('MEMUAT...', 'Memanggil getCategories()...');
  const result = await getCategories();
  logOutput('HASIL getCategories()', result);
});

document.getElementById('btn-questions')?.addEventListener('click', async () => {
  logOutput('MEMUAT...', 'Mengambil kategori pertama...');
  const catRes = await getCategories();
  if (catRes.error || !catRes.data || catRes.data.length === 0) {
    logOutput('ERROR getQuestions()', { error: 'Kategori tidak ditemukan', catRes });
    return;
  }
  const firstCategoryId = catRes.data[0].id;
  logOutput(`MEMUAT SOAL untuk categoryId: ${firstCategoryId}...`, null);
  const qRes = await getQuestions(firstCategoryId);
  logOutput('HASIL getQuestions()', qRes);
});

document.getElementById('btn-all-categories')?.addEventListener('click', async () => {
  logOutput('MEMUAT...', 'Memanggil getAllCategories()...');
  const result = await getAllCategories();
  logOutput('HASIL getAllCategories()', result);
});

// 3. Auth
document.getElementById('btn-session')?.addEventListener('click', async () => {
  const session = await getSession();
  logOutput('HASIL getSession()', session);
});

document.getElementById('btn-is-admin')?.addEventListener('click', async () => {
  const adminCheck = await isAdmin();
  logOutput('HASIL isAdmin()', adminCheck);
});

document.getElementById('btn-login')?.addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  logOutput('LOGIN...', `Mencoba login untuk: ${email}`);
  const loginRes = await login(email, password);
  logOutput('HASIL login()', loginRes);

  if (loginRes.error) {
    showToast(loginRes.error, 'error');
  } else {
    showToast('Login berhasil', 'success');
  }

  // Check isAdmin immediately
  const adminRes = await isAdmin();
  logOutput('HASIL isAdmin() SETELAH LOGIN', adminRes);
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  const res = await logout();
  logOutput('HASIL logout()', res);
  showToast('Sesi telah keluar', 'info');
});

// 4. Matcher
document.getElementById('btn-matcher')?.addEventListener('click', async () => {
  const input = document.getElementById('matcher-input').value;
  // Get first question answers
  const catRes = await getCategories();
  if (!catRes.data || catRes.data.length === 0) {
    logOutput('MATCHER ERROR', 'Data demo/kategori belum tersedia');
    return;
  }
  const qRes = await getQuestions(catRes.data[0].id);
  const firstQ = qRes.data?.[0];
  if (!firstQ || !firstQ.answers) {
    logOutput('MATCHER ERROR', 'Soal pertama tidak memiliki daftar jawaban');
    return;
  }

  const suggestions = suggestMatches(input, firstQ.answers);
  logOutput(`HASIL suggestMatches("${input}") terhadap Soal: "${firstQ.question_text}"`, {
    input,
    jumlahSaran: suggestions.length,
    saran: suggestions,
  });
});

// Clear
document.getElementById('btn-clear')?.addEventListener('click', () => {
  outputEl.textContent = '';
});
