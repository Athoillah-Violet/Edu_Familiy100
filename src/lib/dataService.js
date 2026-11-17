import { supabase, isDemoMode } from './supabase.js';
import demoData from '../data/demo.json' with { type: 'json' };

const DEMO_MODE_ERROR = 'Mode demo: fitur ini butuh koneksi database';

function getDemoCategories(publishedOnly = true) {
  const cats = Array.isArray(demoData.categories) ? demoData.categories : [];
  return publishedOnly ? cats.filter((c) => c.is_published) : cats;
}

function getDemoQuestionsWithAnswers(categoryId) {
  const allQuestions = Array.isArray(demoData.questions) ? demoData.questions : [];
  // If specific category is matched, filter; otherwise if demo category, return all demo questions
  const filtered = allQuestions.filter(
    (q) => q.category_id === categoryId || !categoryId || categoryId === 'demo-cat-bullying'
  );

  return filtered
    .map((q) => {
      const answers = Array.isArray(q.answers) ? [...q.answers] : [];
      answers.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return {
        ...q,
        answers,
      };
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

/* ==========================================================================
   PUBLIC READ & WRITE FUNCTIONS
   ========================================================================== */

/**
 * Retrieves published categories. Falls back to demo.json on demo mode or network error.
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getCategories() {
  if (isDemoMode || !supabase) {
    return { data: getDemoCategories(true), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, title, description, is_published, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Gagal mengambil kategori dari Supabase, beralih ke data demo:', error.message);
      return { data: getDemoCategories(true), error: null };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.warn('Network error saat getCategories, beralih ke data demo:', err);
    return { data: getDemoCategories(true), error: null };
  }
}

/**
 * Retrieves questions for a category, including sorted answers.
 * Falls back to demo.json on demo mode or network error.
 * @param {string} categoryId
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getQuestions(categoryId) {
  if (!categoryId) {
    return { data: null, error: 'ID kategori wajib disertakan.' };
  }

  if (isDemoMode || !supabase) {
    return { data: getDemoQuestionsWithAnswers(categoryId), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('questions')
      .select(`
        id, category_id, question_text, reflection_note, discussion_prompts, multiplier, sort_order, created_at,
        answers (id, question_id, answer_text, points, keywords, sort_order)
      `)
      .eq('category_id', categoryId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('Gagal mengambil soal dari Supabase, beralih ke data demo:', error.message);
      return { data: getDemoQuestionsWithAnswers(categoryId), error: null };
    }

    const formatted = (data || []).map((q) => {
      const answers = Array.isArray(q.answers) ? [...q.answers] : [];
      answers.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return {
        ...q,
        answers,
      };
    });

    return { data: formatted, error: null };
  } catch (err) {
    console.warn('Network error saat getQuestions, beralih ke data demo:', err);
    return { data: getDemoQuestionsWithAnswers(categoryId), error: null };
  }
}

/**
 * Saves a completed or active game session.
 * @param {string} categoryId
 * @param {Array|object} teams
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function saveSession(categoryId, teams) {
  if (!categoryId) {
    return { data: null, error: 'ID kategori sesi permainan wajib diisi.' };
  }
  if (!teams || (Array.isArray(teams) && teams.length === 0)) {
    return { data: null, error: 'Data tim sesi permainan tidak boleh kosong.' };
  }

  if (isDemoMode || !supabase) {
    return { data: null, error: DEMO_MODE_ERROR };
  }

  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .insert([
        {
          category_id: categoryId,
          teams: teams,
          played_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return { data: null, error: 'Gagal menyimpan sesi permainan. Silakan periksa koneksi Anda.' };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: 'Terjadi gangguan jaringan saat menyimpan sesi permainan.' };
  }
}

/* ==========================================================================
   AUTHENTICATION FUNCTIONS
   ========================================================================== */

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function login(email, password) {
  if (!email || !email.trim()) {
    return { data: null, error: 'Email tidak boleh kosong.' };
  }
  if (!password) {
    return { data: null, error: 'Kata sandi tidak boleh kosong.' };
  }

  if (isDemoMode || !supabase) {
    return { data: null, error: DEMO_MODE_ERROR };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { data: null, error: 'Email atau kata sandi tidak sesuai. Silakan periksa kembali.' };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: 'Terjadi gangguan jaringan saat mencoba masuk.' };
  }
}

/**
 * Sign out current session.
 * @returns {Promise<{ data: boolean|null, error: string|null }>}
 */
export async function logout() {
  if (isDemoMode || !supabase) {
    return { data: true, error: null };
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { data: null, error: 'Gagal keluar dari sesi. Silakan coba lagi.' };
    }
    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: 'Terjadi gangguan jaringan saat keluar sesi.' };
  }
}

/**
 * Gets the current active session.
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function getSession() {
  if (isDemoMode || !supabase) {
    return { data: null, error: null };
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { data: null, error: 'Gagal memeriksa sesi pengguna.' };
    }
    return { data: data?.session || null, error: null };
  } catch (err) {
    return { data: null, error: 'Gangguan jaringan saat memeriksa sesi pengguna.' };
  }
}

/**
 * Checks if current logged-in user is an admin by querying the admins table.
 * @returns {Promise<{ data: boolean, error: string|null }>}
 */
export async function isAdmin() {
  if (isDemoMode || !supabase) {
    return { data: false, error: null };
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.user) {
      return { data: false, error: null };
    }

    const userId = sessionData.session.user.id;
    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error checking admin status:', error.message);
      return { data: false, error: 'Gagal memverifikasi hak akses admin.' };
    }

    return { data: Boolean(data && data.user_id), error: null };
  } catch (err) {
    return { data: false, error: 'Gangguan koneksi saat verifikasi admin.' };
  }
}

/**
 * Subscribes to auth state changes.
 * @param {Function} callback - (event, session) => void
 * @returns {{ data: { subscription: { unsubscribe: Function } } }}
 */
export function onAuthChange(callback) {
  if (isDemoMode || !supabase) {
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  }

  return supabase.auth.onAuthStateChange(callback);
}

/* ==========================================================================
   ADMIN CRUD FUNCTIONS
   ========================================================================== */

/**
 * Retrieves all categories including drafts, along with question counts.
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function getAllCategories() {
  if (isDemoMode || !supabase) {
    const demoCats = getDemoCategories(false).map((cat) => {
      const qCount = (demoData.questions || []).filter((q) => q.category_id === cat.id).length;
      return {
        ...cat,
        questions_count: qCount,
      };
    });
    return { data: demoCats, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select(`
        id, title, description, is_published, created_at,
        questions (id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: 'Gagal memuat daftar kategori admin.' };
    }

    const formatted = (data || []).map((cat) => ({
      id: cat.id,
      title: cat.title,
      description: cat.description,
      is_published: cat.is_published,
      created_at: cat.created_at,
      questions_count: Array.isArray(cat.questions) ? cat.questions.length : 0,
    }));

    return { data: formatted, error: null };
  } catch (err) {
    return { data: null, error: 'Gangguan jaringan saat memuat daftar kategori.' };
  }
}

/**
 * Creates or updates a category.
 * @param {object} category - { id?, title, description, is_published }
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function upsertCategory(category) {
  if (!category?.title || !category.title.trim()) {
    return { data: null, error: 'Judul kategori tidak boleh kosong.' };
  }

  if (isDemoMode || !supabase) {
    return { data: null, error: DEMO_MODE_ERROR };
  }

  try {
    const payload = {
      title: category.title.trim(),
      description: category.description?.trim() || '',
      is_published: Boolean(category.is_published),
    };
    if (category.id) {
      payload.id = category.id;
    }

    const { data, error } = await supabase
      .from('categories')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return { data: null, error: 'Gagal menyimpan kategori. Pastikan Anda memiliki izin admin.' };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: 'Gangguan jaringan saat menyimpan kategori.' };
  }
}

/**
 * Deletes a category by ID.
 * @param {string} id
 * @returns {Promise<{ data: boolean|null, error: string|null }>}
 */
export async function deleteCategory(id) {
  if (!id) {
    return { data: null, error: 'ID kategori wajib diisi.' };
  }

  if (isDemoMode || !supabase) {
    return { data: null, error: DEMO_MODE_ERROR };
  }

  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      return { data: null, error: 'Gagal menghapus kategori. Pastikan tidak ada dependensi yang menghalangi.' };
    }

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: 'Gangguan jaringan saat menghapus kategori.' };
  }
}

/**
 * Creates or updates a question.
 * @param {object} question - { id?, category_id, question_text, reflection_note, discussion_prompts, multiplier, sort_order }
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function upsertQuestion(question) {
  if (!question?.question_text || !question.question_text.trim()) {
    return { data: null, error: 'Teks soal tidak boleh kosong.' };
  }
  if (!question?.category_id) {
    return { data: null, error: 'Kategori soal wajib dipilih.' };
  }

  const mult = Number(question.multiplier);
  if (isNaN(mult) || mult < 1 || mult > 3) {
    return { data: null, error: 'Multiplier harus berupa angka antara 1 sampai 3.' };
  }

  if (isDemoMode || !supabase) {
    return { data: null, error: DEMO_MODE_ERROR };
  }

  try {
    const payload = {
      category_id: question.category_id,
      question_text: question.question_text.trim(),
      reflection_note: question.reflection_note?.trim() || '',
      discussion_prompts: Array.isArray(question.discussion_prompts)
        ? question.discussion_prompts.map((p) => String(p).trim()).filter(Boolean)
        : [],
      multiplier: Math.floor(mult),
      sort_order: Number(question.sort_order) || 0,
    };
    if (question.id) {
      payload.id = question.id;
    }

    const { data, error } = await supabase
      .from('questions')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return { data: null, error: 'Gagal menyimpan soal. Pastikan data sudah sesuai.' };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: 'Gangguan jaringan saat menyimpan soal.' };
  }
}

/**
 * Deletes a question by ID.
 * @param {string} id
 * @returns {Promise<{ data: boolean|null, error: string|null }>}
 */
export async function deleteQuestion(id) {
  if (!id) {
    return { data: null, error: 'ID soal wajib diisi.' };
  }

  if (isDemoMode || !supabase) {
    return { data: null, error: DEMO_MODE_ERROR };
  }

  try {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) {
      return { data: null, error: 'Gagal menghapus soal.' };
    }

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: 'Gangguan jaringan saat menghapus soal.' };
  }
}

/**
 * Replaces all answers for a specific question (validates 3-8 answers, points >= 0).
 * @param {string} questionId
 * @param {Array<{ answer_text: string, points: number, keywords?: Array<string>, sort_order?: number }>} answers
 * @returns {Promise<{ data: Array|null, error: string|null }>}
 */
export async function replaceAnswers(questionId, answers) {
  if (!questionId) {
    return { data: null, error: 'ID soal wajib diisi.' };
  }
  if (!Array.isArray(answers) || answers.length < 3 || answers.length > 8) {
    return { data: null, error: 'Jumlah jawaban harus antara 3 hingga 8 buah.' };
  }

  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (!a?.answer_text || !a.answer_text.trim()) {
      return { data: null, error: `Jawaban nomor ${i + 1} tidak boleh kosong.` };
    }
    const pts = Number(a?.points);
    if (isNaN(pts) || pts < 0) {
      return { data: null, error: `Poin jawaban nomor ${i + 1} harus berupa angka >= 0.` };
    }
  }

  if (isDemoMode || !supabase) {
    return { data: null, error: DEMO_MODE_ERROR };
  }

  try {
    // 1. Delete existing answers for this question
    const { error: delError } = await supabase
      .from('answers')
      .delete()
      .eq('question_id', questionId);

    if (delError) {
      return { data: null, error: 'Gagal membersihkan data jawaban lama.' };
    }

    // 2. Insert new answers
    const payload = answers.map((ans, idx) => ({
      question_id: questionId,
      answer_text: ans.answer_text.trim(),
      points: Math.floor(Number(ans.points)),
      keywords: Array.isArray(ans.keywords)
        ? ans.keywords.map((k) => String(k).trim()).filter(Boolean)
        : [],
      sort_order: ans.sort_order !== undefined ? Number(ans.sort_order) : idx + 1,
    }));

    const { data, error: insError } = await supabase
      .from('answers')
      .insert(payload)
      .select();

    if (insError) {
      return { data: null, error: 'Gagal memasukkan daftar jawaban baru.' };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: 'Gangguan jaringan saat memperbarui jawaban.' };
  }
}

/**
 * Reorders questions within a category by updating sort_order for each ID in order.
 * @param {string} categoryId
 * @param {Array<string>} orderedIds
 * @returns {Promise<{ data: boolean|null, error: string|null }>}
 */
export async function reorderQuestions(categoryId, orderedIds) {
  if (!categoryId) {
    return { data: null, error: 'ID kategori wajib diisi.' };
  }
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { data: null, error: 'Daftar ID urutan soal tidak boleh kosong.' };
  }

  if (isDemoMode || !supabase) {
    return { data: null, error: DEMO_MODE_ERROR };
  }

  try {
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('questions')
        .update({ sort_order: index + 1 })
        .eq('id', id)
        .eq('category_id', categoryId)
    );

    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      return { data: null, error: 'Gagal memperbarui beberapa urutan soal.' };
    }

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: 'Gangguan jaringan saat menyusun ulang urutan soal.' };
  }
}
