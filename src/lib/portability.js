import { neon, isDemoMode } from './neon.js';
import { getQuestions, upsertCategory, saveQuestionWithAnswers, getAllCategories } from './dataService.js';
import { validateImportPackage } from './validators.js';
import demoData from '../data/demo.json' with { type: 'json' };
import * as XLSX from 'xlsx';

const DEMO_MODE_ERROR = 'Mode demo: fitur ini butuh koneksi database';

/**
 * Creates and downloads an Excel template (.xlsx) for teachers to fill in easily.
 */
export function downloadExcelTemplate() {
  const sampleRows = [
    {
      'Judul Paket': 'Membangun Karakter Positif dan Empati di Sekolah',
      'Deskripsi Paket': 'Topik panduan BK untuk melatih sikap saling menghargai dan empati antarteman.',
      'Teks Soal': 'Apa tindakan yang menunjukkan sikap empati ketika melihat teman sedang bersedih?',
      'Multiplier': 1,
      'Jawaban 1': 'Mendengarkan keluh kesahnya',
      'Poin 1': 100,
      'Sinonim 1': 'mendengar, curhat, menyimak',
      'Jawaban 2': 'Memberikan kata-kata semangat',
      'Poin 2': 80,
      'Sinonim 2': 'menghibur, menyemangati, motivasi',
      'Jawaban 3': 'Mengajak istirahat atau jalan bersama',
      'Poin 3': 60,
      'Sinonim 3': 'nemenin, menemani, jalan santai',
      'Jawaban 4': 'Menawarkan bantuan bila diperlukan',
      'Poin 4': 40,
      'Sinonim 4': 'tolong, bantu, menolong',
      'Jawaban 5': 'Menjaga privasinya dari olokan teman',
      'Poin 5': 20,
      'Sinonim 5': 'jaga rahasia, tidak ejek',
      'Jawaban 6': '',
      'Poin 6': '',
      'Sinonim 6': '',
      'Jawaban 7': '',
      'Poin 7': '',
      'Sinonim 7': '',
      'Jawaban 8': '',
      'Poin 8': '',
      'Sinonim 8': '',
      'Catatan Refleksi BK': 'Empati dimulai dari kesediaan mendengarkan tanpa menghakimi.',
      'Pertanyaan Diskusi 1': 'Kapan terakhir kali kamu merasa sangat terbantu oleh perhatian seorang teman?',
      'Pertanyaan Diskusi 2': 'Apa hal tersulit yang biasanya menghalangi kita untuk mendengarkan orang lain?'
    },
    {
      'Judul Paket': 'Membangun Karakter Positif dan Empati di Sekolah',
      'Deskripsi Paket': 'Topik panduan BK untuk melatih sikap saling menghargai dan empati antarteman.',
      'Teks Soal': 'Bagaimana cara terbaik menyelesaikan kesalahpahaman antarteman di kelas?',
      'Multiplier': 1,
      'Jawaban 1': 'Berbicara langsung empat mata dengan tenang',
      'Poin 1': 100,
      'Sinonim 1': 'bicara baik-baik, empat mata, ngobrol santai',
      'Jawaban 2': 'Meminta maaf jika berbuat salah',
      'Poin 2': 80,
      'Sinonim 2': 'minta maaf, mengakui kesalahan',
      'Jawaban 3': 'Mencari penengah atau guru BK',
      'Poin 3': 60,
      'Sinonim 3': 'mediator, lapor guru bk, konselor',
      'Jawaban 4': 'Memaafkan dan melupakan masalah',
      'Poin 4': 40,
      'Sinonim 4': 'berdamai, saling memaafkan',
      'Jawaban 5': 'Fokus pada solusi bukan saling menyalahkan',
      'Poin 5': 20,
      'Sinonim 5': 'cari solusi, damai',
      'Jawaban 6': '',
      'Poin 6': '',
      'Sinonim 6': '',
      'Jawaban 7': '',
      'Poin 7': '',
      'Sinonim 7': '',
      'Jawaban 8': '',
      'Poin 8': '',
      'Sinonim 8': '',
      'Catatan Refleksi BK': 'Menyelesaikan konflik secara dewasa melatih kedewasaan emosi.',
      'Pertanyaan Diskusi 1': 'Mengapa gengsi meminta maaf sering menjadi penghalang damai?',
      'Pertanyaan Diskusi 2': 'Bagaimana peran guru BK membantu kita saat konflik terasa rumit?'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Paket Soal BK');

  XLSX.writeFile(workbook, 'Template_Soal_BK_Family100.xlsx');
}

/**
 * Converts parsed Excel worksheet data into the standard Family 100 package structure.
 * @param {Array<object>} rows
 * @returns {object} Standard package object { version, category, questions }
 */
export function parseExcelRowsToPackage(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Berkas Excel kosong atau tidak memiliki data.');
  }

  // Cari judul dan deskripsi dari baris pertama yang memiliki judul
  const firstRow = rows[0];
  const title = (
    firstRow['Judul Paket'] ||
    firstRow['judul_paket'] ||
    firstRow['Judul'] ||
    firstRow['judul'] ||
    'Paket Materi BK Baru'
  ).toString().trim();

  const description = (
    firstRow['Deskripsi Paket'] ||
    firstRow['deskripsi_paket'] ||
    firstRow['Deskripsi'] ||
    firstRow['deskripsi'] ||
    ''
  ).toString().trim();

  const questions = [];

  rows.forEach((row, rowIndex) => {
    // Ambil teks soal
    const qText = (
      row['Teks Soal'] ||
      row['teks_soal'] ||
      row['Soal'] ||
      row['soal'] ||
      row['Pertanyaan'] ||
      ''
    ).toString().trim();

    if (!qText) return; // Lewati baris kosong

    const multiplierRaw = Number(row['Multiplier'] || row['multiplier'] || 1);
    const multiplier = [1, 2, 3].includes(multiplierRaw) ? multiplierRaw : 1;

    const reflectionNote = (
      row['Catatan Refleksi BK'] ||
      row['catatan_refleksi'] ||
      row['Refleksi'] ||
      row['refleksi'] ||
      ''
    ).toString().trim();

    const discussionPrompts = [];
    const prompt1 = (row['Pertanyaan Diskusi 1'] || row['diskusi_1'] || '').toString().trim();
    const prompt2 = (row['Pertanyaan Diskusi 2'] || row['diskusi_2'] || '').toString().trim();
    if (prompt1) discussionPrompts.push(prompt1);
    if (prompt2) discussionPrompts.push(prompt2);

    // Kumpulkan jawaban 1 sampai 8
    const answers = [];
    for (let i = 1; i <= 8; i++) {
      const ansText = (
        row[`Jawaban ${i}`] ||
        row[`jawaban_${i}`] ||
        row[`Jawaban${i}`] ||
        row[`jawaban${i}`] ||
        ''
      ).toString().trim();

      if (!ansText) continue;

      const ptsRaw = row[`Poin ${i}`] ?? row[`poin_${i}`] ?? row[`Poin${i}`] ?? row[`poin${i}`] ?? (100 - (i - 1) * 20);
      const points = Math.max(0, Number(ptsRaw) || 0);

      const sinonimRaw = (
        row[`Sinonim ${i}`] ||
        row[`sinonim_${i}`] ||
        row[`Sinonim${i}`] ||
        row[`Kata Kunci ${i}`] ||
        ''
      ).toString().trim();

      const keywords = sinonimRaw
        ? sinonimRaw
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0)
        : [];

      answers.push({
        answer_text: ansText,
        points,
        keywords,
        sort_order: i,
      });
    }

    if (answers.length > 0) {
      questions.push({
        question_text: qText,
        multiplier,
        reflection_note: reflectionNote,
        discussion_prompts: discussionPrompts,
        sort_order: questions.length + 1,
        answers,
      });
    }
  });

  return {
    version: 1,
    category: {
      title,
      description,
      is_published: false,
    },
    questions,
  };
}

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

  if (isDemoMode || !neon) {
    category = (demoData.categories || []).find((c) => c.id === categoryId);
  } else {
    try {
      const { data, error } = await neon
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
 * Imports a category package from Excel buffer/file, JSON string, or object.
 * Validates ALL contents before writing anything.
 * Creates a NEW category with status draft (is_published = false) without overwriting old packages.
 *
 * @param {string|object|ArrayBuffer|Uint8Array} input
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function importCategory(input) {
  let pkg = null;

  if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
    try {
      const workbook = XLSX.read(input, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return { data: null, error: 'Berkas Excel tidak memiliki sheet data.' };
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      pkg = parseExcelRowsToPackage(rows);
    } catch (parseErr) {
      return { data: null, error: 'Format berkas Excel tidak valid atau gagal dibaca: ' + parseErr.message };
    }
  } else if (typeof input === 'string') {
    try {
      pkg = JSON.parse(input);
    } catch (parseErr) {
      return { data: null, error: 'Format file tidak valid (gagal membaca data).' };
    }
  } else if (typeof input === 'object' && input !== null) {
    pkg = input;
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

  if (isDemoMode || !neon) {
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
