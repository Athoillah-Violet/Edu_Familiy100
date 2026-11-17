import { requireAdmin } from '../lib/guard.js';
import {
  getQuestions,
  deleteQuestion,
  reorderQuestions,
  saveQuestionWithAnswers,
  getAllCategories,
} from '../lib/dataService.js';
import { exportCategory } from '../lib/portability.js';
import { validateQuestion, validateAnswers, parseKeywords } from '../lib/validators.js';
import { escapeHtml, showToast } from '../lib/ui.js';
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

  const errorContainer = document.getElementById('error-container');
  const categoryTitleEl = document.getElementById('category-title');
  const categoryDescEl = document.getElementById('category-desc');
  const formSection = document.getElementById('form-section');
  const questionsListSection = document.getElementById('questions-list-section');
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

  categoryTitleEl.textContent = `Editor Soal: ${category.title}`;
  categoryDescEl.textContent = category.description || '(Tidak ada deskripsi)';

  // Tombol Export
  btnExport?.addEventListener('click', async () => {
    btnExport.disabled = true;
    btnExport.textContent = 'Mengekspor...';
    const res = await exportCategory(categoryId);
    btnExport.disabled = false;
    btnExport.textContent = 'Ekspor Paket (.json)';
    if (res.error) {
      alert(`Gagal mengekspor: ${res.error}`);
    } else {
      showToast('Paket berhasil diekspor!', 'success');
    }
  });

  initQuestionManager(categoryId);
}

function showFatalError(msg) {
  const container = document.getElementById('error-container');
  if (container) {
    container.innerHTML = `
      <div style="border: 1px solid #dc2626; background: #fee2e2; padding: 16px; border-radius: 4px;">
        <h3>Perhatian</h3>
        <p>${escapeHtml(msg)}</p>
        <p><a href="/admin/index.html">&larr; Kembali ke Dashboard Kategori</a></p>
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
    statusIndicator.style.display = 'block';
    if (type === 'loading') {
      statusIndicator.style.background = '#e0f2fe';
      statusIndicator.style.color = '#0369a1';
      statusIndicator.style.border = '1px solid #7dd3fc';
      statusIndicator.textContent = msg || 'Menyimpan...';
    } else if (type === 'success') {
      statusIndicator.style.background = '#dcfce7';
      statusIndicator.style.color = '#15803d';
      statusIndicator.style.border = '1px solid #86efac';
      statusIndicator.textContent = msg || 'Tersimpan';
      setTimeout(() => {
        statusIndicator.style.display = 'none';
      }, 3500);
    } else if (type === 'error') {
      statusIndicator.style.background = '#fee2e2';
      statusIndicator.style.color = '#b91c1c';
      statusIndicator.style.border = '1px solid #fca5a5';
      statusIndicator.textContent = `Gagal: ${msg}`;
    }
  }

  // Answer rows builder
  function renderAnswerRow(text = '', points = 100, keywords = '') {
    const row = document.createElement('div');
    row.className = 'answer-row';
    row.style.cssText =
      'display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; background: #f9fafb; padding: 6px; border: 1px solid #e5e7eb; border-radius: 4px;';

    row.innerHTML = `
      <label>Jawaban:
        <input type="text" class="ans-text" required placeholder="Teks jawaban siswa..." value="${escapeHtml(text)}" style="width: 250px;">
      </label>
      <label>Poin:
        <input type="number" class="ans-points" min="0" required value="${points}" style="width: 70px;">
      </label>
      <label>Keywords (koma):
        <input type="text" class="ans-keywords" placeholder="sinonim, dipisah koma..." value="${escapeHtml(keywords)}" style="width: 200px;">
      </label>
      <button type="button" class="btn-remove-row">Hapus</button>
    `;

    row.querySelector('.btn-remove-row')?.addEventListener('click', () => {
      const allRows = answersContainer.querySelectorAll('.answer-row');
      if (allRows.length <= 3) {
        alert('Minimal harus ada 3 jawaban.');
        return;
      }
      row.remove();
    });

    answersContainer.appendChild(row);
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
      alert('Maksimal jawaban per soal adalah 8.');
      return;
    }
    renderAnswerRow('', 10, '');
  });

  // Muat daftar soal
  async function loadQuestions() {
    loadingQuestionsEl.style.display = 'block';
    emptyQuestionsEl.style.display = 'none';
    questionsListEl.innerHTML = '';

    const res = await getQuestions(categoryId);
    loadingQuestionsEl.style.display = 'none';

    if (res.error) {
      setStatus('error', res.error);
      return;
    }

    questions = res.data || [];

    if (questions.length === 0) {
      emptyQuestionsEl.style.display = 'block';
      return;
    }

    renderQuestionsList();
  }

  function renderQuestionsList() {
    questionsListEl.innerHTML = '';

    questions.forEach((q, index) => {
      const qCard = document.createElement('div');
      qCard.style.cssText =
        'border: 1px solid #d1d5db; padding: 14px; margin-bottom: 16px; border-radius: 6px; background: #ffffff;';

      const promptsHtml =
        Array.isArray(q.discussion_prompts) && q.discussion_prompts.length > 0
          ? `<ul>${q.discussion_prompts.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
          : '<em>(Tidak ada pertanyaan diskusi)</em>';

      const answersList = Array.isArray(q.answers) ? q.answers : [];
      const answersHtml = answersList
        .map(
          (a, i) =>
            `<li><strong>[#${i + 1} - ${a.points} Poin]</strong> ${escapeHtml(a.answer_text)} <small style="color: #6b7280;">(Keywords: ${escapeHtml((a.keywords || []).join(', ') || '-')})</small></li>`
        )
        .join('');

      qCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h3 style="margin: 0 0 6px 0;">Soal #${index + 1}: ${escapeHtml(q.question_text)}</h3>
            <span style="display: inline-block; padding: 2px 6px; background: #e0e7ff; color: #3730a3; border-radius: 4px; font-size: 12px; font-weight: bold;">
              Multiplier: x${q.multiplier || 1}
            </span>
          </div>
          <div>
            <button type="button" class="btn-move-up" data-idx="${index}" ${index === 0 ? 'disabled' : ''}>&uarr; Naik</button>
            <button type="button" class="btn-move-down" data-idx="${index}" ${index === questions.length - 1 ? 'disabled' : ''}>&darr; Turun</button>
            <button type="button" class="btn-edit-q">Edit</button>
            <button type="button" class="btn-delete-q" style="color: #b91c1c;">Hapus</button>
          </div>
        </div>
        <p style="margin: 8px 0 4px 0;"><strong>Catatan Refleksi:</strong> ${escapeHtml(q.reflection_note || '-')}</p>
        <div><strong>Pertanyaan Diskusi:</strong> ${promptsHtml}</div>
        <div style="margin-top: 8px;">
          <strong>Jawaban Terurut Poin (${answersList.length} Jawaban):</strong>
          <ol style="margin: 4px 0 0 0; padding-left: 20px;">${answersHtml}</ol>
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
    formHeading.textContent = `Edit Soal #${q.sort_order || ''}`;
    qIdInput.value = q.id;
    qSortOrderInput.value = q.sort_order || 0;
    qTextInput.value = q.question_text || '';
    qMultiplierInput.value = q.multiplier || 1;
    qReflectionInput.value = q.reflection_note || '';

    const prompts = Array.isArray(q.discussion_prompts) ? q.discussion_prompts : [];
    qPrompt1Input.value = prompts[0] || '';
    qPrompt2Input.value = prompts[1] || '';

    resetAnswerRows(q.answers);

    btnCancel.style.display = 'inline-block';
    btnSave.textContent = 'Simpan Perubahan Soal';

    form.scrollIntoView({ behavior: 'smooth' });
  }

  // Batal Edit
  btnCancel?.addEventListener('click', () => {
    formHeading.textContent = 'Tambah Soal Baru';
    form.reset();
    qIdInput.value = '';
    qSortOrderInput.value = '';
    btnCancel.style.display = 'none';
    btnSave.textContent = 'Simpan Soal';
    resetAnswerRows();
  });

  // Aksi Hapus Soal
  async function confirmDeleteQuestion(q) {
    const confirmDel = window.confirm(`Apakah Anda yakin ingin menghapus soal:\n"${q.question_text}"?`);
    if (!confirmDel) return;

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
      alert(`Validasi gagal:\n- ${combinedErrors.join('\n- ')}`);
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
      btnCancel.style.display = 'none';
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
