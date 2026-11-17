import { supabase, isDemoMode } from './supabase.js';
import demoData from '../data/demo.json' with { type: 'json' };
import { validateCategory, validateQuestion, validateAnswers } from './validators.js';

const DEMO_MODE_ERROR = 'Mode demo: fitur ini butuh koneksi database';

function getDemoCategories(publishedOnly = true) {
  const cats = Array.isArray(demoData.categories) ? demoData.categories : [];
  const allQ = Array.isArray(demoData.questions) ? demoData.questions : [];
  const filtered = publishedOnly ? cats.filter((c) => c.is_published) : cats;
  return filtered.map((c) => {
    const count = allQ.filter((q) => q.category_id === c.id).length;
    return {
      ...c,
      questions_count: count,
      question_count: count,
    };
  });
}

function getDemoQuestionsWithAnswers(categoryId) {
  const allQuestions = Array.isArray(demoData.questions) ? demoData.questions : [];
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
 * Retrieves published categories.
 * Fallback ke demo.json HANYA jika isDemoMode true (env kosong).
 * Jika Supabase terkonfigurasi tetapi error, mengembalikan { data: null, error, error_detail }.
 * @returns {Promise<{ data: Array|null, error: string|null, error_detail?: string }>}
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
      return {
        data: null,
        error: 'Gagal mengambil daftar kategori dari database.',
        error_detail: error.message || String(error),
      };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: 'Terjadi gangguan jaringan saat mengambil kategori.',
      error_detail: err.message || String(err),
    };
  }
}

/**
 * Retrieves questions for a category, including sorted answers.
 * Fallback ke demo.json HANYA jika isDemoMode true.
 * @param {string} categoryId
 * @returns {Promise<{ data: Array|null, error: string|null, error_detail?: string }>}
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
      return {
        data: null,
        error: 'Gagal mengambil soal dari database.',
        error_detail: error.message || String(error),
      };
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
    return {
      data: null,
      error: 'Terjadi gangguan jaringan saat mengambil soal.',
      error_detail: err.message || String(err),
    };
  }
}

/**
 * Saves a completed or active game session.
 * @param {string} categoryId
 * @param {Array|object} teams
 * @returns {Promise<{ data: object|null, error: string|null, error_detail?: string }>}
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
      return {
        data: null,
        error: 'Gagal menyimpan sesi permainan. Silakan periksa koneksi Anda.',
        error_detail: error.message || String(error),
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: 'Terjadi gangguan jaringan saat menyimpan sesi permainan.',
      error_detail: err.message || String(err),
    };
  }
}

/* ==========================================================================
   AUTHENTICATION FUNCTIONS
   ========================================================================== */

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: object|null, error: string|null, error_detail?: string }>}
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
      return {
        data: null,
        error: 'Email atau kata sandi tidak sesuai. Silakan periksa kembali.',
        error_detail: error.message || String(error),
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: 'Terjadi gangguan jaringan saat mencoba masuk.',
      error_detail: err.message || String(err),
    };
  }
}

/**
 * Sign out current session.
 * @returns {Promise<{ data: boolean|null, error: string|null, error_detail?: string }>}
 */
export async function logout() {
  if (isDemoMode || !supabase) {
    return { data: true, error: null };
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return {
        data: null,
        error: 'Gagal keluar dari sesi. Silakan coba lagi.',
        error_detail: error.message || String(error),
      };
    }
    return { data: true, error: null };
  } catch (err) {
    return {
      data: null,
      error: 'Terjadi gangguan jaringan saat keluar sesi.',
      error_detail: err.message || String(err),
    };
  }
}

/**
 * Gets the current active session.
 * @returns {Promise<{ data: object|null, error: string|null, error_detail?: string }>}
 */
export async function getSession() {
  if (isDemoMode || !supabase) {
    return { data: null, error: null };
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return {
        data: null,
        error: 'Gagal memeriksa sesi pengguna.',
        error_detail: error.message || String(error),
      };
    }
    return { data: data?.session || null, error: null };
  } catch (err) {
    return {
      data: null,
      error: 'Gangguan jaringan saat memeriksa sesi pengguna.',
      error_detail: err.message || String(err),
    };
  }
}

/**
 * Checks if current logged-in user is an admin by querying the admins table.
 * @returns {Promise<{ data: boolean, error: string|null, error_detail?: string }>}
 */
export async function isAdmin() {
  if (isDemoMode || !supabase) {
    return { data: false, error: null };
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return {
        data: false,
        error: 'Gagal memeriksa sesi pengguna.',
        error_detail: sessionError.message || String(sessionError),
      };
    }

    if (!sessionData?.session?.user) {
      return { data: false, error: null };
    }

    const userId = sessionData.session.user.id;
    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return {
        data: false,
        error: 'Gagal memverifikasi hak akses admin.',
        error_detail: error.message || String(error),
      };
    }

    return { data: Boolean(data && data.user_id), error: null };
  } catch (err) {
    return {
      data: false,
      error: 'Gangguan koneksi saat verifikasi admin.',
      error_detail: err.message || String(err),
    };
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
 * Di mode demo mengembalikan error ramah: 'Mode demo: fitur ini butuh koneksi database'.
 * @returns {Promise<{ data: Array|null, error: string|null, error_detail?: string }>}
 */
export async function getAllCategories() {
  if (isDemoMode || !supabase) {
    return { data: null, error: DEMO_MODE_ERROR };
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
      return {
        data: null,
        error: 'Gagal memuat daftar kategori admin.',
        error_detail: error.message || String(error),
      };
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
    return {
      data: null,
      error: 'Gangguan jaringan saat memuat daftar kategori.',
      error_detail: err.message || String(err),
    };
  }
}

/**
 * Creates or updates a category.
 * @param {object} category - { id?, title, description, is_published }
 * @returns {Promise<{ data: object|null, error: string|null, error_detail?: string }>}
 */
export async function upsertCategory(category) {
  const validation = validateCategory(category);
  if (!validation.ok) {
    return { data: null, error: validation.errors.join(' ') };
  }

  if (isDemoMode || !supabase) {
    return { data: null, error: DEMO_MODE_ERROR };
  }

  try {
    const payload = {
      title: category.title.trim(),
      description: category.description ? category.description.trim() : '',
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
      return {
        data: null,
        error: 'Gagal menyimpan kategori. Pastikan Anda memiliki izin admin.',
        error_detail: error.message || String(error),
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: 'Gangguan jaringan saat menyimpan kategori.',
      error_detail: err.message || String(err),
    };
  }
}

/**
 * Deletes a category by ID.
 * @param {string} id
 * @returns {Promise<{ data: boolean|null, error: string|null, error_detail?: string }>}
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
      return {
        data: null,
        error: 'Gagal menghapus kategori. Pastikan tidak ada dependensi yang menghalangi.',
        error_detail: error.message || String(error),
      };
    }

    return { data: true, error: null };
  } catch (err) {
    return {
      data: null,
      error: 'Gangguan jaringan saat menghapus kategori.',
      error_detail: err.message || String(err),
    };
  }
}

/**
 * Creates or updates a question.
 * @param {object} question - { id?, category_id, question_text, reflection_note, discussion_prompts, multiplier, sort_order }
 * @returns {Promise<{ data: object|null, error: string|null, error_detail?: string }>}
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
      reflection_note: question.reflection_note ? question.reflection_note.trim() : '',
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
      return {
        data: null,
        error: 'Gagal menyimpan soal. Pastikan data sudah sesuai.',
        error_detail: error.message || String(error),
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: 'Gangguan jaringan saat menyimpan soal.',
      error_detail: err.message || String(err),
    };
  }
}

/**
 * Deletes a question by ID.
 * @param {string} id
 * @returns {Promise<{ data: boolean|null, error: string|null, error_detail?: string }>}
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
      return {
        data: null,
        error: 'Gagal menghapus soal.',
        error_detail: error.message || String(error),
      };
    }

    return { data: true, error: null };
  } catch (err) {
    return {
      data: null,
      error: 'Gangguan jaringan saat menghapus soal.',
      error_detail: err.message || String(err),
    };
  }
}

/**
 * Replaces all answers for a specific question (validates 3-8 answers, points >= 0).
 * @param {string} questionId
 * @param {Array<{ answer_text: string, points: number, keywords?: Array<string>, sort_order?: number }>} answers
 * @returns {Promise<{ data: Array|null, error: string|null, error_detail?: string }>}
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
      return {
        data: null,
        error: 'Gagal membersihkan data jawaban lama.',
        error_detail: delError.message || String(delError),
      };
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
      return {
        data: null,
        error: 'Gagal memasukkan daftar jawaban baru.',
        error_detail: insError.message || String(insError),
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: 'Gangguan jaringan saat memperbarui jawaban.',
      error_detail: err.message || String(err),
    };
  }
}

/**
 * Saves a question and its answers in one coordinated sequence.
 * 1. Upsert soal
 * 2. Ambil salinan jawaban lama
 * 3. ReplaceAnswers dengan jawaban terurut dari poin terbesar
 * 4. Jika replaceAnswers gagal, coba pulihkan jawaban lama dari salinan.
 * Catatan: Ini bukan transaksi atomik pada level database engine.
 *
 * @param {object} question - { id?, category_id, question_text, reflection_note, discussion_prompts, multiplier, sort_order }
 * @param {Array<{ answer_text: string, points: number, keywords?: Array<string> }>} answers
 * @returns {Promise<{ data: object|null, error: string|null, error_detail?: string }>}
 */
export async function saveQuestionWithAnswers(question, answers) {
  const qVal = validateQuestion(question);
  const ansVal = validateAnswers(answers);

  if (!qVal.ok || !ansVal.ok) {
    const errorList = [...qVal.errors, ...ansVal.errors];
    return { data: null, error: errorList.join(' ') };
  }

  if (isDemoMode || !supabase) {
    return { data: null, error: DEMO_MODE_ERROR };
  }

  // 1. Upsert question
  const qRes = await upsertQuestion(question);
  if (qRes.error || !qRes.data) {
    return {
      data: null,
      error: qRes.error || 'Gagal menyimpan data soal.',
      error_detail: qRes.error_detail,
    };
  }

  const questionId = qRes.data.id;

  // 2. Ambil salinan jawaban lama jika sebelumnya sudah ada
  let oldAnswers = [];
  try {
    const { data: fetchedOld, error: fetchErr } = await supabase
      .from('answers')
      .select('answer_text, points, keywords, sort_order')
      .eq('question_id', questionId);

    if (!fetchErr && Array.isArray(fetchedOld)) {
      oldAnswers = fetchedOld;
    }
  } catch (err) {
    console.warn('Gagal mengambil backup jawaban lama:', err);
  }

  // 3. Urutkan jawaban otomatis dari poin terbesar dan hitung ulang sort_order
  const sortedAnswers = [...answers]
    .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0))
    .map((ans, idx) => ({
      ...ans,
      sort_order: idx + 1,
    }));

  // 4. Replace answers
  const replaceRes = await replaceAnswers(questionId, sortedAnswers);

  // 5. Jika gagal, coba pulihkan dari salinan jawaban lama
  if (replaceRes.error) {
    if (oldAnswers.length > 0) {
      try {
        await supabase.from('answers').delete().eq('question_id', questionId);
        await supabase.from('answers').insert(
          oldAnswers.map((oa, idx) => ({
            question_id: questionId,
            answer_text: oa.answer_text,
            points: oa.points,
            keywords: oa.keywords,
            sort_order: oa.sort_order || idx + 1,
          }))
        );
      } catch (restoreErr) {
        console.error('Gagal melakukan rollback pemulihan jawaban lama:', restoreErr);
      }
    }

    return {
      data: null,
      error: `Gagal memperbarui jawaban (${replaceRes.error}). Sistem telah berusaha memulihkan jawaban sebelumnya.`,
      error_detail: replaceRes.error_detail,
    };
  }

  return {
    data: {
      ...qRes.data,
      answers: replaceRes.data,
    },
    error: null,
  };
}

/**
 * Reorders questions within a category by updating sort_order for each ID in order.
 * @param {string} categoryId
 * @param {Array<string>} orderedIds
 * @returns {Promise<{ data: boolean|null, error: string|null, error_detail?: string }>}
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
    const failed = results.find((r) => r.error);

    if (failed) {
      return {
        data: null,
        error: 'Gagal memperbarui beberapa urutan soal.',
        error_detail: failed.error?.message || String(failed.error),
      };
    }

    return { data: true, error: null };
  } catch (err) {
    return {
      data: null,
      error: 'Gangguan jaringan saat menyusun ulang urutan soal.',
      error_detail: err.message || String(err),
    };
  }
}
