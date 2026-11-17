import { getCategories, getQuestions } from './lib/dataService.js';
import { createGame } from './lib/gameEngine.js';
import { saveGame, hasSavedGame, clearGame } from './lib/gameStore.js';
import { renderNavbar, renderFooter, showToast, confirmModal, styles } from './lib/components.js';
import { escapeHtml } from './lib/ui.js';

// Pre-defined soft team palette
const AVAILABLE_COLORS = [
  { id: '#3b82f6', name: 'Biru', class: 'bg-blue-500' },
  { id: '#ef4444', name: 'Merah', class: 'bg-red-500' },
  { id: '#10b981', name: 'Hijau', class: 'bg-emerald-500' },
  { id: '#f97316', name: 'Oranye', class: 'bg-orange-500' },
];

let state = {
  currentStep: 1,
  categories: [],
  selectedCategoryId: null,
  selectedCategory: null,
  roundCount: 3,
  teams: [
    { id: 'team-1', name: 'Tim 1', color: '#3b82f6' },
    { id: 'team-2', name: 'Tim 2', color: '#ef4444' },
  ],
  timerSeconds: 20,
  maxStrikes: 3,
  multiplierEnabled: true,
  soundEnabled: true,
};

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('#navbar-container', { active: 'setup' });
  renderFooter('#footer-container');

  checkSavedGameBanner();
  await loadCategories();
  setupEventListeners();
  renderStep();
});

function checkSavedGameBanner() {
  const banner = document.getElementById('saved-game-banner');
  if (!banner) return;

  if (hasSavedGame()) {
    banner.classList.remove('hidden');
    banner.querySelector('#btn-resume-game')?.addEventListener('click', () => {
      window.location.href = '/game.html';
    });
    banner.querySelector('#btn-clear-saved')?.addEventListener('click', async () => {
      const confirmed = await confirmModal(
        'Sesi permainan yang tersimpan akan dihapus dan Anda akan memulai dari awal. Lanjutkan?',
        {
          title: 'Hapus Sesi Tersimpan',
          confirmText: 'Mulai Baru',
          isDanger: true,
        }
      );
      if (confirmed) {
        clearGame();
        banner.classList.add('hidden');
        showToast('Sesi sebelumnya telah dibersihkan.', 'info');
      }
    });
  } else {
    banner.classList.add('hidden');
  }
}

async function loadCategories() {
  const container = document.getElementById('categories-list');
  const loading = document.getElementById('categories-loading');
  const errorEl = document.getElementById('categories-error');

  try {
    const res = await getCategories();
    if (loading) loading.classList.add('hidden');

    if (res.error) {
      if (errorEl) {
        errorEl.textContent = res.error || 'Gagal memuat kategori.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    state.categories = res.data || [];
    if (state.categories.length === 0) {
      if (errorEl) {
        errorEl.textContent = 'Belum ada paket topik BK yang tersedia. Silakan hubungi admin.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    // Check query params for ?category=<id>
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedId = urlParams.get('category');
    if (preselectedId) {
      const match = state.categories.find((c) => String(c.id) === String(preselectedId));
      if (match) {
        state.selectedCategoryId = match.id;
        state.selectedCategory = match;
      }
    }

    // Default select first if none selected
    if (!state.selectedCategoryId && state.categories.length > 0) {
      state.selectedCategoryId = state.categories[0].id;
      state.selectedCategory = state.categories[0];
    }

    renderCategoryCards();
    updateRoundOptions();
  } catch (err) {
    console.error('Error fetching categories in setup:', err);
    if (loading) loading.classList.add('hidden');
    if (errorEl) {
      errorEl.textContent = 'Gagal terhubung ke database. Silakan muat ulang halaman.';
      errorEl.classList.remove('hidden');
    }
  }
}

function renderCategoryCards() {
  const container = document.getElementById('categories-list');
  if (!container) return;

  container.innerHTML = state.categories
    .map((cat) => {
      const isSelected = String(cat.id) === String(state.selectedCategoryId);
      const qCount = cat.question_count ?? (Array.isArray(cat.questions) ? cat.questions.length : 0);
      const borderClass = isSelected
        ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20'
        : 'border-slate-200 hover:border-slate-300 bg-white';

      return `
        <div data-cat-id="${escapeHtml(cat.id)}" class="category-card cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between ${borderClass}">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="${isSelected ? styles.badgeAmber : styles.badgeSlate}">${qCount} Soal</span>
              ${
                isSelected
                  ? '<span class="text-xs font-bold text-indigo-600 flex items-center">&check; Terpilih</span>'
                  : ''
              }
            </div>
            <h3 class="font-bold text-base text-slate-900 mb-1 leading-snug">${escapeHtml(cat.title)}</h3>
            <p class="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-3">
              ${escapeHtml(cat.description || 'Paket pembelajaran bimbingan konseling.')}
            </p>
          </div>
          <div class="text-[11px] text-slate-400 font-medium">Klik untuk memilih topik ini</div>
        </div>
      `;
    })
    .join('');

  // Attach click listeners to cards
  container.querySelectorAll('.category-card').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.catId;
      const found = state.categories.find((c) => String(c.id) === String(id));
      if (found) {
        state.selectedCategoryId = found.id;
        state.selectedCategory = found;
        renderCategoryCards();
        updateRoundOptions();
      }
    });
  });
}

function updateRoundOptions() {
  const select = document.getElementById('round-count-select');
  if (!select) return;

  const totalQuestions = state.selectedCategory?.question_count ?? (Array.isArray(state.selectedCategory?.questions) ? state.selectedCategory.questions.length : 5);
  const maxRounds = Math.max(1, totalQuestions || 1);

  const options = [];
  const standardChoices = [1, 2, 3, 4, 5, 8, 10];
  for (const count of standardChoices) {
    if (count <= maxRounds) {
      options.push(count);
    }
  }
  if (!options.includes(maxRounds)) {
    options.push(maxRounds);
  }
  options.sort((a, b) => a - b);

  select.innerHTML = options
    .map(
      (opt) =>
        `<option value="${opt}" ${opt === state.roundCount || (opt === maxRounds && state.roundCount > maxRounds) ? 'selected' : ''}>${opt} Ronde ${
          opt === maxRounds ? '(Semua Soal)' : ''
        }</option>`
    )
    .join('');

  state.roundCount = Number(select.value) || 1;
}

function renderTeamsUI() {
  const listContainer = document.getElementById('teams-list');
  const addBtn = document.getElementById('btn-add-team');
  if (!listContainer) return;

  if (addBtn) {
    addBtn.disabled = state.teams.length >= 4;
  }

  listContainer.innerHTML = state.teams
    .map((team, idx) => {
      return `
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3" data-team-index="${idx}">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style="background-color: ${escapeHtml(team.color)};">
              ${idx + 1}
            </span>
            <span class="text-xs font-bold text-slate-700">Tim ${idx + 1}</span>
          </div>
          ${
            state.teams.length > 2
              ? `<button type="button" class="btn-remove-team text-xs text-red-600 hover:text-red-700 font-semibold focus:outline-none" data-team-index="${idx}">Hapus</button>`
              : ''
          }
        </div>

        <div>
          <label class="${styles.label}">Nama Tim / Kelompok:</label>
          <input type="text" maxlength="20" class="${styles.input} team-name-input" data-team-index="${idx}" value="${escapeHtml(team.name)}" placeholder="Contoh: Kelompok Empati">
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1.5">Pilih Warna Tim:</label>
          <div class="flex items-center space-x-2">
            ${AVAILABLE_COLORS.map((c) => {
              const isSelected = c.id === team.color;
              return `
                <button type="button" class="team-color-btn w-7 h-7 rounded-full flex items-center justify-center border-2 transition-transform ${
                  isSelected ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
                }" style="background-color: ${c.id};" data-team-index="${idx}" data-color="${c.id}" title="${c.name}">
                  ${isSelected ? '<span class="text-white text-xs font-bold">&check;</span>' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  // Wire event listeners for team names
  listContainer.querySelectorAll('.team-name-input').forEach((input) => {
    input.addEventListener('input', (e) => {
      const idx = Number(e.target.dataset.teamIndex);
      if (state.teams[idx]) {
        state.teams[idx].name = e.target.value;
      }
    });
  });

  // Wire color buttons
  listContainer.querySelectorAll('.team-color-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = Number(btn.dataset.teamIndex);
      const color = btn.dataset.color;
      if (state.teams[idx]) {
        state.teams[idx].color = color;
        renderTeamsUI();
      }
    });
  });

  // Wire remove buttons
  listContainer.querySelectorAll('.btn-remove-team').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.teamIndex);
      if (state.teams.length > 2) {
        state.teams.splice(idx, 1);
        renderTeamsUI();
      }
    });
  });
}

function validateTeams() {
  const errorEl = document.getElementById('step-2-error');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }

  if (state.teams.length < 2 || state.teams.length > 4) {
    showError(errorEl, 'Jumlah tim harus antara 2 hingga 4 tim.');
    return false;
  }

  const seenNames = new Set();
  const seenColors = new Set();

  for (let i = 0; i < state.teams.length; i++) {
    const t = state.teams[i];
    const name = t.name.trim();
    if (!name) {
      showError(errorEl, `Nama Tim ${i + 1} tidak boleh kosong.`);
      return false;
    }
    if (name.length > 20) {
      showError(errorEl, `Nama Tim ${i + 1} maksimal 20 karakter.`);
      return false;
    }
    const lower = name.toLowerCase();
    if (seenNames.has(lower)) {
      showError(errorEl, `Nama tim tidak boleh kembar: "${name}".`);
      return false;
    }
    seenNames.add(lower);

    if (seenColors.has(t.color)) {
      showError(errorEl, `Warna tim tidak boleh sama antar tim. Silakan ganti warna Tim ${i + 1}.`);
      return false;
    }
    seenColors.add(t.color);
  }

  return true;
}

function showError(el, msg) {
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
  } else {
    showToast(msg, 'error');
  }
}

function setupEventListeners() {
  // Step 1: Round count select
  const roundSelect = document.getElementById('round-count-select');
  roundSelect?.addEventListener('change', (e) => {
    state.roundCount = Number(e.target.value) || 1;
  });

  // Step 1 -> Step 2
  document.getElementById('btn-step-1-next')?.addEventListener('click', () => {
    if (!state.selectedCategoryId) {
      showToast('Silakan pilih salah satu topik pembelajaran terlebih dahulu.', 'warning');
      return;
    }
    state.currentStep = 2;
    renderStep();
  });

  // Step 2: Add Team
  document.getElementById('btn-add-team')?.addEventListener('click', () => {
    if (state.teams.length >= 4) return;
    const newIdx = state.teams.length + 1;
    // Pick an unused color if available
    const usedColors = new Set(state.teams.map((t) => t.color));
    const nextColor = AVAILABLE_COLORS.find((c) => !usedColors.has(c.id))?.id || AVAILABLE_COLORS[0].id;

    state.teams.push({
      id: `team-${newIdx}`,
      name: `Tim ${newIdx}`,
      color: nextColor,
    });
    renderTeamsUI();
  });

  // Step 2 -> Step 1 (Back)
  document.getElementById('btn-step-2-back')?.addEventListener('click', () => {
    state.currentStep = 1;
    renderStep();
  });

  // Step 2 -> Step 3
  document.getElementById('btn-step-2-next')?.addEventListener('click', () => {
    if (!validateTeams()) return;
    state.currentStep = 3;
    renderStep();
  });

  // Step 3 -> Step 2 (Back)
  document.getElementById('btn-step-3-back')?.addEventListener('click', () => {
    state.currentStep = 2;
    renderStep();
  });

  // Step 3: Timer & Strike radios/checkboxes
  document.querySelectorAll('input[name="timer-option"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.timerSeconds = Number(e.target.value);
    });
  });

  document.querySelectorAll('input[name="max-strikes"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.maxStrikes = Number(e.target.value);
    });
  });

  const multiplierToggle = document.getElementById('multiplier-toggle');
  multiplierToggle?.addEventListener('change', (e) => {
    state.multiplierEnabled = e.target.checked;
  });

  const soundToggle = document.getElementById('sound-toggle');
  soundToggle?.addEventListener('change', (e) => {
    state.soundEnabled = e.target.checked;
  });

  // Step 3: Start Game
  document.getElementById('btn-start-game')?.addEventListener('click', startGame);
}

function renderStep() {
  const step1 = document.getElementById('step-1-section');
  const step2 = document.getElementById('step-2-section');
  const step3 = document.getElementById('step-3-section');

  const stepBadge = document.getElementById('wizard-step-badge');
  const stepGuidance = document.getElementById('wizard-step-guidance');
  const progressBar = document.getElementById('wizard-progress-bar');

  // Hide all steps
  step1?.classList.add('hidden');
  step2?.classList.add('hidden');
  step3?.classList.add('hidden');

  if (state.currentStep === 1) {
    step1?.classList.remove('hidden');
    if (stepBadge) stepBadge.textContent = 'Langkah 1 dari 3';
    if (stepGuidance)
      stepGuidance.textContent = 'Pilih satu materi bimbingan konseling dan tentukan jumlah ronde permainan.';
    if (progressBar) progressBar.style.width = '33.33%';
  } else if (state.currentStep === 2) {
    step2?.classList.remove('hidden');
    if (stepBadge) stepBadge.textContent = 'Langkah 2 dari 3';
    if (stepGuidance)
      stepGuidance.textContent = 'Bagi siswa ke dalam 2–4 kelompok, tentukan nama tim dan warna pembeda.';
    if (progressBar) progressBar.style.width = '66.66%';
    renderTeamsUI();
  } else if (state.currentStep === 3) {
    step3?.classList.remove('hidden');
    if (stepBadge) stepBadge.textContent = 'Langkah 3 dari 3';
    if (stepGuidance)
      stepGuidance.textContent = 'Atur waktu menjawab, batas kesalahan (strike), dan tinjau aturan bermain.';
    if (progressBar) progressBar.style.width = '100%';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function startGame() {
  const startBtn = document.getElementById('btn-start-game');
  const statusEl = document.getElementById('step-3-status');

  if (!state.selectedCategoryId) {
    showToast('Kategori belum dipilih. Kembali ke langkah 1.', 'error');
    state.currentStep = 1;
    renderStep();
    return;
  }

  if (!validateTeams()) {
    state.currentStep = 2;
    renderStep();
    return;
  }

  startBtn.disabled = true;
  startBtn.textContent = 'Menyiapkan Permainan...';
  if (statusEl) {
    statusEl.textContent = 'Mengambil soal dari database...';
    statusEl.classList.remove('hidden');
  }

  try {
    const qRes = await getQuestions(state.selectedCategoryId);
    if (qRes.error) {
      throw new Error(qRes.error);
    }

    const rawQuestions = qRes.data || [];
    if (rawQuestions.length === 0) {
      throw new Error('Topik ini belum memiliki soal. Silakan pilih topik lain atau buat soal di panel admin.');
    }

    const config = {
      categoryId: state.selectedCategoryId,
      teams: state.teams.map((t) => ({
        id: t.id,
        name: t.name.trim(),
        color: t.color,
      })),
      roundCount: state.roundCount,
      timerSeconds: state.timerSeconds,
      maxStrikes: state.maxStrikes,
      multiplierEnabled: state.multiplierEnabled,
      soundEnabled: state.soundEnabled,
    };

    // Initialize game state with pure deterministic engine
    const gameState = createGame(config, rawQuestions);

    // Persist to localStorage
    const saved = saveGame(gameState);
    if (!saved) {
      console.warn('Gagal menyimpan sesi ke localStorage (kemungkinan kuota penuh / private mode).');
    }

    // Redirect to game page
    window.location.href = '/game.html';
  } catch (err) {
    console.error('Error starting game:', err);
    if (statusEl) {
      statusEl.textContent = err.message || 'Gagal memulai permainan. Silakan coba lagi.';
      statusEl.classList.add('text-red-600');
    }
    showToast(err.message || 'Gagal memulai permainan.', 'error');
    startBtn.disabled = false;
    startBtn.textContent = 'Mulai Permainan';
  }
}
