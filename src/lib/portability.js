import { supabase, isDemoMode } from './supabase.js';
import { getQuestions, upsertCategory, saveQuestionWithAnswers, getAllCategories } from './dataService.js';
import { validateImportPackage } from './validators.js';
import demoData from '../data/demo.json' with { type: 'json' };

const DEMO_MODE_ERROR = 'Mode demo: fitur ini butuh koneksi database';

/**
 * Exports a category with its questions and answers (without database IDs)
 * and triggers a file download in the browser.
 *
 * @param {string} categoryId
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function exportCategory(categoryId) {
  if (!categoryId) {
    return { data: null, error: 'ID kategori wajib disertakan untuk ekspor.' };
  }

  let category = null;

  if (isDemoMode || !supabase) {
    category = (demoData.categories || []).find((c) => c.id === categoryId);
  } else {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, title, description, is_published')
        .eq('id', categoryId)
        .maybeSingle();

      if (error || !data) {
        return { data: null, error: 'Kategori tidak ditemukan untuk diekspor.' };
      }
      category = data;
    } catch (err) {
      return { data: null, error: 'Gangguan koneksi saat mengekspor kategori.' };
    }
  }

  if (!category) {
    return { data: null, error: 'Kategori tidak ditemukan.' };
  }

  const qRes = await getQuestions(categoryId);
  if (qRes.error) {
    return { data: null, error: qRes.error };
  }

  const rawQuestions = qRes.data || [];

  const cleanQuestions = rawQuestions.map((q) => ({
    question_text: q.question_text,
    reflection_note: q.reflection_note || '',
    discussion_prompts: Array.isArray(q.discussion_prompts) ? q.discussion_prompts : [],
    multiplier: q.multiplier || 1,
    sort_order: q.sort_order || 1,
    answers: (q.answers || []).map((a) => ({
      answer_text: a.answer_text,
      points: a.points,
      keywords: Array.isArray(a.keywords) ? a.keywords : [],
      sort_order: a.sort_order || 1,
    })),
  }));

  const exportPayload = {
    version: 1,
    category: {
      title: category.title,
      description: category.description || '',
      is_published: Boolean(category.is_published),
    },
    questions: cleanQuestions,
  };

  // Unduh otomatis file .json jika berjalan di browser
  if (typeof document !== 'undefined') {
    try {
      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = (category.title || 'paket')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
      a.href = url;
      a.download = `paket_${safeTitle || 'bk'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (downloadErr) {
      console.warn('Gagal memicu unduhan otomatis browser:', downloadErr);
    }
  }

  return { data: exportPayload, error: null };
}

/**
 * Imports a category package from JSON string or object.
 * Validates ALL contents before writing anything.
 * Creates a NEW category with status draft (is_published = false) without overwriting old packages.
 *
 * @param {string|object} jsonInput
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function importCategory(jsonInput) {
  let pkg = null;

  if (typeof jsonInput === 'string') {
    try {
      pkg = JSON.parse(jsonInput);
    } catch (parseErr) {
      return { data: null, error: 'Format file tidak valid (gagal parsing JSON).' };
    }
  } else if (typeof jsonInput === 'object' && jsonInput !== null) {
    pkg = jsonInput;
  } else {
    return { data: null, error: 'Data impor tidak boleh kosong.' };
  }

  // 1. Validasi SEMUA isi paket sebelum menulis apa pun ke database
  const validation = validateImportPackage(pkg);
  if (!validation.ok) {
    return {
      data: null,
      error: `Validasi berkas impor gagal: ${validation.errors.join('; ')}`,
    };
  }

  if (isDemoMode || !supabase) {
    return { data: null, error: DEMO_MODE_ERROR };
  }

  // 2. Buat paket kategori baru berstatus draft (is_published = false)
  const newCategoryData = {
    title: pkg.category.title.trim(),
    description: pkg.category.description ? pkg.category.description.trim() : '',
    is_published: false, // Wajib draft
  };

  const catRes = await upsertCategory(newCategoryData);
  if (catRes.error || !catRes.data) {
    return {
      data: null,
      error: `Gagal membuat kategori baru saat impor: ${catRes.error}`,
    };
  }

  const newCategoryId = catRes.data.id;
  const questions = pkg.questions || [];
  let savedCount = 0;

  // 3. Simpan setiap soal beserta daftar jawabannya
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qPayload = {
      category_id: newCategoryId,
      question_text: q.question_text.trim(),
      reflection_note: q.reflection_note ? q.reflection_note.trim() : '',
      discussion_prompts: Array.isArray(q.discussion_prompts) ? q.discussion_prompts : [],
      multiplier: Number(q.multiplier) || 1,
      sort_order: i + 1,
    };

    const saveRes = await saveQuestionWithAnswers(qPayload, q.answers || []);
    if (saveRes.error) {
      return {
        data: {
          categoryId: newCategoryId,
          savedCount,
        },
        error: `Terjadi kendala saat menyimpan soal ke-${i + 1}: ${saveRes.error}`,
      };
    }
    savedCount++;
  }

  return {
    data: {
      categoryId: newCategoryId,
      category: catRes.data,
      totalQuestions: savedCount,
    },
    error: null,
  };
}
