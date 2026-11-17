import { requireAdmin } from '../lib/guard.js';
import {
  getQuestions,
  deleteQuestion,
  reorderQuestions,
  saveQuestionWithAnswers,
} from '../lib/dataService.js';
import { exportCategory } from '../lib/portability.js';
import { validateQuestion, validateAnswers, parseKeywords } from '../lib/validators.js';
import { escapeHtml } from '../lib/ui.js';
import { showToast, confirmModal, styles } from '../lib/components.js';
import { isDemoMode, supabase } from '../lib/supabase.js';
import demoData from '../data/demo.json' with { type: 'json' };

async function main() {
  const auth = await requireAdmin();
  if (!auth || !auth.user) {
    // Di mode demo atau belum login, requireAdmin sudah menampilkan notice / redirect
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const categoryId = urlParams.get('category');

  const categoryTitleEl = document.getElementById('category-title');
  const categoryDescEl = document.getElementById('category-desc');
  const btnExport = document.getElementById('btn-export-pkg');

  if (!categoryId) {
    showFatalError('Parameter kategori (?category=...) tidak ditemukan.');
    return;
  }

  // Ambil info kategori
  const category = await fetchCategoryInfo(categoryId);
  if (!category) {
    showFatalError('Paket kategori dengan ID tersebut tidak ditemukan di database.');
    return;
  }

  categoryTitleEl.textContent = category.title;
  categoryDescEl.textContent = category.description || '(Tidak ada deskripsi materi)';

  // Tombol Export
  btnExport?.addEventListener('click', async () => {
    btnExport.disabled = true;
    btnExport.textContent = 'Mengekspor...';
    const res = await exportCategory(categoryId);
    btnExport.disabled = false;
    btnExport.textContent = 'Ekspor Paket (.json)';
    if (res.error) {
      showToast(`Gagal mengekspor: ${res.error}`, 'error');
    } else {
      showToast('Paket materi berhasil diekspor!', 'success');
    }
  });

  initQuestionManager(categoryId);
}

function showFatalError(msg) {
  const container = document.getElementById('error-container');
  if (container) {
    container.innerHTML = `
      <div class="border border-red-200 bg-red-50 p-6 rounded-xl text-center space-y-3">
        <h3 class="text-base font-bold text-red-900">Perhatian</h3>
        <p class="text-xs text-red-700">${escapeHtml(msg)}</p>
        <div>
          <a href="/admin/index.html" class="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            &larr; Kembali ke Dashboard Kategori
          </a>
        </div>
      </div>
    `;
  }
  const formSection = document.getElementById('form-section');
  const questionsListSection = document.getElementById('questions-list-section');
  if (formSection) formSection.style.display = 'none';
  if (questionsListSection) questionsListSection.style.display = 'none';
}

async function fetchCategoryInfo(categoryId) {
  if (isDemoMode || !supabase) {
    return (demoData.categories || []).find((c) => c.id === categoryId);
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, title, description, is_published')
      .eq('id', categoryId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch (err) {
    console.error('Error fetchCategoryInfo:', err);
    return null;
  }
}

function initQuestionManager(categoryId) {
  const form = document.getElementById('question-form');
  const formHeading = document.getElementById('form-heading');
  const qIdInput = document.getElementById('q-id');
  const qSortOrderInput = document.getElementById('q-sort-order');
  const qTextInput = document.getElementById('q-text');
  const qMultiplierInput = document.getElementById('q-multiplier');
  const qReflectionInput = document.getElementById('q-reflection');
  const qPrompt1Input = document.getElementById('q-prompt-1');
  const qPrompt2Input = document.getElementById('q-prompt-2');
  const btnSave = document.getElementById('btn-save-question');
  const btnCancel = document.getElementById('btn-cancel-question');
  const btnAddAnswer = document.getElementById('btn-add-answer');
  const answersContainer = document.getElementById('answers-container');

  const statusIndicator = document.getElementById('status-indicator');
  const loadingQuestionsEl = document.getElementById('loading-questions');
  const emptyQuestionsEl = document.getElementById('empty-questions');
  const questionsListEl = document.getElementById('questions-list');

  let questions = [];

  function setStatus(type, msg) {
    if (!statusIndicator) return;
    statusIndicator.classList.remove('hidden');

    if (type === 'loading') {
      statusIndicator.className =
        'p-3 rounded-lg border border-sky-200 bg-sky-50 text-sky-800 text-xs font-medium flex items-center space-x-2';
      statusIndicator.innerHTML = `<span>⏳</span><span>${escapeHtml(msg || 'Menyimpan...')}</span>`;
    } else if (type === 'success') {
      statusIndicator.className =
        'p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center space-x-2';
      statusIndicator.innerHTML = `<span>&check;</span><span>${escapeHtml(msg || 'Tersimpan')}</span>`;
      setTimeout(() => {
        statusIndicator.classList.add('hidden');
      }, 3500);
    } else if (type === 'error') {
      statusIndicator.className =
        'p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs font-medium flex items-center space-x-2';
      statusIndicator.innerHTML = `<span>&cross;</span><span>Gagal: ${escapeHtml(msg)}</span>`;
    }
  }

  // Answer rows builder
  function renderAnswerRow(text = '', points = 100, keywords = '') {
    const row = document.createElement('div');
    row.className =
      'answer-row p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2';

    row.innerHTML = `
      <div class="flex-1">
        <input type="text" class="ans-text w-full px-2.5 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500" required placeholder="Teks jawaban siswa..." value="${escapeHtml(
          text
        )}">
      </div>
      <div class="w-full sm:w-24">
        <input type="number" class="ans-points w-full px-2.5 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500" min="0" required value="${points}" placeholder="Poin">
      </div>
      <div class="w-full sm:w-48">
        <input type="text" class="ans-keywords w-full px-2.5 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500" placeholder="Sinonim, pisah koma..." value="${escapeHtml(
          keywords
        )}">
      </div>
      <div>
        <button type="button" class="btn-remove-row text-xs text-red-600 hover:text-red-800 px-2 py-1.5 font-medium focus:outline-none">Hapus</button>
      </div>
    `;

    row.querySelector('.btn-remove-row')?.addEventListener('click', () => {
      const allRows = answersContainer.querySelectorAll('.answer-row');
      if (allRows.length <= 3) {
        showToast('Minimal harus ada 3 jawaban per soal.', 'warning');
        return;
      }
      row.remove();
      updateAddButtonState();
    });

    answersContainer.appendChild(row);
    updateAddButtonState();
  }

  function updateAddButtonState() {
    if (!btnAddAnswer) return;
    const allRows = answersContainer.querySelectorAll('.answer-row');
    btnAddAnswer.disabled = allRows.length >= 8;
  }

  function resetAnswerRows(initialAnswers = null) {
    answersContainer.innerHTML = '';
    if (Array.isArray(initialAnswers) && initialAnswers.length >= 3) {
      initialAnswers.forEach((ans) => {
        const kwStr = Array.isArray(ans.keywords) ? ans.keywords.join(', ') : '';
        renderAnswerRow(ans.answer_text, ans.points, kwStr);
      });
    } else {
      // Default 5 jawaban dengan poin standar
      const defaultPoints = [100, 80, 60, 40, 20];
      defaultPoints.forEach((pts) => {
        renderAnswerRow('', pts, '');
      });
    }
  }

  btnAddAnswer?.addEventListener('click', () => {
    const allRows = answersContainer.querySelectorAll('.answer-row');
    if (allRows.length >= 8) {
      showToast('Maksimal jawaban per soal adalah 8 buah.', 'warning');
      return;
    }
    renderAnswerRow('', 10, '');
  });

  // Muat daftar soal
  async function loadQuestions() {
    loadingQuestionsEl?.classList.remove('hidden');
    emptyQuestionsEl?.classList.add('hidden');
    if (questionsListEl) questionsListEl.innerHTML = '';

    const res = await getQuestions(categoryId);
    loadingQuestionsEl?.classList.add('hidden');

    if (res.error) {
      setStatus('error', res.error);
      return;
    }

    questions = res.data || [];

    if (questions.length === 0) {
      emptyQuestionsEl?.classList.remove('hidden');
      return;
    }

    renderQuestionsList();
  }

  function renderQuestionsList() {
    if (!questionsListEl) return;
    questionsListEl.innerHTML = '';

    questions.forEach((q, index) => {
      const qCard = document.createElement('div');
      qCard.className = `${styles.card} hover:border-slate-300 transition-colors`;

      const promptsHtml =
        Array.isArray(q.discussion_prompts) && q.discussion_prompts.length > 0
          ? `<ul class="list-disc pl-4 space-y-0.5 text-xs text-slate-600 mt-1">${q.discussion_prompts
              .map((p) => `<li>${escapeHtml(p)}</li>`)
              .join('')}</ul>`
          : '<em class="text-xs text-slate-400">(Tidak ada pertanyaan panduan diskusi)</em>';

      const answersList = Array.isArray(q.answers) ? q.answers : [];
      const answersHtml = answersList
        .map(
          (a, i) => `
          <div class="flex items-center justify-between py-1.5 px-2.5 rounded bg-slate-50 border border-slate-100 text-xs">
            <div class="flex items-center space-x-2">
              <span class="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center border border-indigo-100">#${
                i + 1
              }</span>
              <span class="font-medium text-slate-800">${escapeHtml(a.answer_text)}</span>
              ${
                Array.isArray(a.keywords) && a.keywords.length > 0
                  ? `<span class="text-[11px] text-slate-400 hidden sm:inline">(${escapeHtml(
                      a.keywords.join(', ')
                    )})</span>`
                  : ''
              }
            </div>
            <span class="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">${
              a.points
            } Poin</span>
          </div>
        `
        )
        .join('');

      qCard.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div class="flex items-center space-x-2 mb-1">
              <span class="font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Soal #${index + 1}
              </span>
              <span class="${styles.badgeAmber}">
                Multiplier: x${q.multiplier || 1}
              </span>
            </div>
            <h3 class="text-base font-bold text-slate-900 leading-snug">${escapeHtml(
              q.question_text
            )}</h3>
          </div>

          <div class="flex items-center space-x-1 self-end sm:self-auto">
            <button type="button" class="btn-move-up inline-flex items-center justify-center px-2 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" data-idx="${index}" ${
        index === 0 ? 'disabled' : ''
      } title="Naikkan Urutan">&uarr;</button>
            <button type="button" class="btn-move-down inline-flex items-center justify-center px-2 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" data-idx="${index}" ${
        index === questions.length - 1 ? 'disabled' : ''
      } title="Turunkan Urutan">&darr;</button>
            <button type="button" class="btn-edit-q inline-flex items-center justify-center px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 text-slate-700 transition-colors">Edit</button>
            <button type="button" class="btn-delete-q inline-flex items-center justify-center px-2.5 py-1 text-xs border border-red-200 rounded hover:bg-red-50 text-red-600 transition-colors">Hapus</button>
          </div>
        </div>

        <div class="py-3 space-y-2">
          ${
            q.reflection_note
              ? `<div class="p-2.5 bg-indigo-50/40 rounded-lg border border-indigo-100/60 text-xs">
                  <span class="font-semibold text-indigo-900">Catatan Refleksi:</span>
                  <span class="text-indigo-800 ml-1">${escapeHtml(q.reflection_note)}</span>
                </div>`
              : ''
          }
          <div>
            <span class="text-xs font-semibold text-slate-700">Pertanyaan Diskusi Kelas:</span>
            ${promptsHtml}
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-700">Papan Jawaban (${answersList.length} Jawaban):</span>
            <span class="text-[11px] text-slate-400">Urut poin terbesar</span>
          </div>
          <div class="space-y-1.5">${answersHtml}</div>
        </div>
      `;

      // Event handlers
      qCard.querySelector('.btn-move-up')?.addEventListener('click', () => moveQuestion(index, -1));
      qCard.querySelector('.btn-move-down')?.addEventListener('click', () => moveQuestion(index, 1));
      qCard.querySelector('.btn-edit-q')?.addEventListener('click', () => startEditQuestion(q));
      qCard.querySelector('.btn-delete-q')?.addEventListener('click', () => confirmDeleteQuestion(q));

      questionsListEl.appendChild(qCard);
    });
  }

  // Aksi Naik / Turun
  async function moveQuestion(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    setStatus('loading', 'Menyusun ulang urutan soal...');

    const newOrder = [...questions];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const orderedIds = newOrder.map((q) => q.id);
    const res = await reorderQuestions(categoryId, orderedIds);

    if (res.error) {
      setStatus('error', res.error);
    } else {
      setStatus('success', 'Urutan soal berhasil diperbarui');
      await loadQuestions();
    }
  }

  // Aksi Edit Soal
  function startEditQuestion(q) {
    formHeading.textContent = `Ubah Soal #${q.sort_order || ''}`;
    qIdInput.value = q.id;
    qSortOrderInput.value = q.sort_order || 0;
    qTextInput.value = q.question_text || '';
    qMultiplierInput.value = q.multiplier || 1;
    qReflectionInput.value = q.reflection_note || '';

    const prompts = Array.isArray(q.discussion_prompts) ? q.discussion_prompts : [];
    qPrompt1Input.value = prompts[0] || '';
    qPrompt2Input.value = prompts[1] || '';

    resetAnswerRows(q.answers);

    btnCancel.classList.remove('hidden');
    btnSave.textContent = 'Simpan Perubahan Soal';

    form.scrollIntoView({ behavior: 'smooth' });
  }

  // Batal Edit
  btnCancel?.addEventListener('click', () => {
    formHeading.textContent = 'Tambah Soal Baru';
    form.reset();
    qIdInput.value = '';
    qSortOrderInput.value = '';
    btnCancel.classList.add('hidden');
    btnSave.textContent = 'Simpan Soal';
    resetAnswerRows();
  });

  // Aksi Hapus Soal
  async function confirmDeleteQuestion(q) {
    const confirmed = await confirmModal(
      `Apakah Anda yakin ingin menghapus soal:\n"${q.question_text}"?\nJawaban yang terkait dengan soal ini juga akan terhapus.`,
      {
        title: 'Hapus Soal BK',
        confirmText: 'Hapus Soal',
        isDanger: true,
      }
    );
    if (!confirmed) return;

    setStatus('loading', 'Menghapus soal...');
    const res = await deleteQuestion(q.id);

    if (res.error) {
      setStatus('error', res.error);
    } else {
      setStatus('success', 'Soal berhasil dihapus.');
      await loadQuestions();
    }
  }

  // Form Submit: Tambah / Update Soal
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const question_text = qTextInput.value.trim();
    const multiplier = Number(qMultiplierInput.value);
    const reflection_note = qReflectionInput.value.trim();
    const prompts = [qPrompt1Input.value.trim(), qPrompt2Input.value.trim()].filter(Boolean);

    // Kumpulkan jawaban dari form rows
    const answerRows = answersContainer.querySelectorAll('.answer-row');
    const answersData = [];

    answerRows.forEach((row) => {
      const text = row.querySelector('.ans-text')?.value || '';
      const points = Number(row.querySelector('.ans-points')?.value || 0);
      const rawKw = row.querySelector('.ans-keywords')?.value || '';
      const keywords = parseKeywords(rawKw);

      answersData.push({
        answer_text: text,
        points,
        keywords,
      });
    });

    // Validasi murni
    const qValidation = validateQuestion({
      question_text,
      multiplier,
      discussion_prompts: prompts,
    });
    const ansValidation = validateAnswers(answersData);

    if (!qValidation.ok || !ansValidation.ok) {
      const combinedErrors = [...qValidation.errors, ...ansValidation.errors];
      showToast(combinedErrors.join(' | '), 'warning');
      return;
    }

    setStatus('loading', 'Menyimpan soal dan daftar jawaban...');
    btnSave.disabled = true;

    const existingId = qIdInput.value;
    const sort_order = Number(qSortOrderInput.value) || questions.length + 1;

    const questionPayload = {
      category_id: categoryId,
      question_text,
      multiplier,
      reflection_note,
      discussion_prompts: prompts,
      sort_order,
    };
    if (existingId) {
      questionPayload.id = existingId;
    }

    const saveRes = await saveQuestionWithAnswers(questionPayload, answersData);
    btnSave.disabled = false;

    if (saveRes.error) {
      setStatus('error', saveRes.error);
    } else {
      setStatus('success', 'Tersimpan');
      showToast('Soal dan jawaban berhasil disimpan!', 'success');

      // Reset form
      formHeading.textContent = 'Tambah Soal Baru';
      form.reset();
      qIdInput.value = '';
      qSortOrderInput.value = '';
      btnCancel.classList.add('hidden');
      btnSave.textContent = 'Simpan Soal';
      resetAnswerRows();

      await loadQuestions();
    }
  });

  // Inisialisasi awal
  resetAnswerRows();
  loadQuestions();
}

main();
