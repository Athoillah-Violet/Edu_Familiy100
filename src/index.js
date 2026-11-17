import { getCategories } from './lib/dataService.js';
import { isDemoMode } from './lib/supabase.js';
import { renderNavbar, renderFooter, styles } from './lib/components.js';
import { escapeHtml } from './lib/ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Render Navbar and Footer
  renderNavbar('#navbar-container', { active: 'home' });
  renderFooter('#footer-container');

  // Handle Demo Mode Banner
  const demoBanner = document.getElementById('demo-banner');
  if (isDemoMode && demoBanner) {
    demoBanner.classList.remove('hidden');
  }

  // Load Categories for "Topik Pilihan"
  const categoriesContainer = document.getElementById('categories-container');
  const categoriesLoading = document.getElementById('categories-loading');
  const categoriesEmpty = document.getElementById('categories-empty');
  const categoriesError = document.getElementById('categories-error');

  try {
    const res = await getCategories();
    if (categoriesLoading) categoriesLoading.classList.add('hidden');

    if (res.error) {
      if (categoriesError) {
        categoriesError.textContent = res.error || 'Gagal memuat daftar topik pilihan.';
        categoriesError.classList.remove('hidden');
      }
      return;
    }

    const categories = res.data || [];
    if (categories.length === 0) {
      if (categoriesEmpty) categoriesEmpty.classList.remove('hidden');
      return;
    }

    if (categoriesContainer) {
      categoriesContainer.innerHTML = categories
        .map((cat) => {
          const qCount = cat.question_count ?? (Array.isArray(cat.questions) ? cat.questions.length : 0);
          return `
          <div class="${styles.card} flex flex-col justify-between hover:border-indigo-300 transition-colors">
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <span class="${styles.badgeSlate}">${qCount} Soal Tersedia</span>
                <span class="text-xs text-slate-400 font-medium">SMP / SMA</span>
              </div>
              <h3 class="text-base font-bold text-slate-900 mb-2 leading-snug">
                ${escapeHtml(cat.title)}
              </h3>
              <p class="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                ${escapeHtml(cat.description || 'Topik bimbingan konseling untuk membangun karakter dan pemahaman diri.')}
              </p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <a href="/setup.html?category=${encodeURIComponent(cat.id)}" class="${styles.btnSecondary} w-full text-center text-xs">
                Pilih Topik Ini &rarr;
              </a>
            </div>
          </div>
        `;
        })
        .join('');
    }
  } catch (err) {
    console.error('Error loading categories on landing page:', err);
    if (categoriesLoading) categoriesLoading.classList.add('hidden');
    if (categoriesError) {
      categoriesError.textContent = 'Terjadi kesalahan jaringan saat memuat topik.';
      categoriesError.classList.remove('hidden');
    }
  }
});
