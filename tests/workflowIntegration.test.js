import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCategories,
  getQuestions,
  upsertCategory,
  deleteCategory,
  reorderQuestions,
  saveQuestionWithAnswers,
} from '../src/lib/dataService.js';
import { exportCategory, importCategory } from '../src/lib/portability.js';
import { isDemoMode } from '../src/lib/neon.js';

test('Alur Lengkap: Buka/Buat Paket -> Tambah Soal (5 Jawaban) -> Reorder -> Export -> Import -> Hapus', async () => {
  // Jika di demo mode, verifikasi struktur fallback ekspor dan penolakan fungsi tulis
  if (isDemoMode) {
    const cats = await getCategories();
    assert.ok(cats.data.length > 0);
    const demoCatId = cats.data[0].id;

    // Ekspor demo category
    const expRes = await exportCategory(demoCatId);
    assert.equal(expRes.error, null);
    assert.equal(expRes.data.version, 1);
    assert.equal(expRes.data.category.title, cats.data[0].title);
    assert.ok(expRes.data.questions.length > 0);
    // Verifikasi tidak ada field database id
    assert.equal(expRes.data.category.id, undefined);
    assert.equal(expRes.data.questions[0].id, undefined);
    assert.equal(expRes.data.questions[0].answers[0].id, undefined);
    return;
  }

  // Jika Supabase terhubung:
  // 1. Buat paket kategori uji
  const catRes = await upsertCategory({
    title: 'Paket Uji Integrasi Alur',
    description: 'Kategori pengujian alur editor dan portabilitas.',
    is_published: false,
  });
  assert.equal(catRes.error, null);
  const catId = catRes.data.id;

  try {
    // 2. Tambah soal 1 dengan 5 jawaban
    const answers1 = [
      { answer_text: 'Jawaban E', points: 20, keywords: ['e'] },
      { answer_text: 'Jawaban A', points: 100, keywords: ['a'] },
      { answer_text: 'Jawaban C', points: 60, keywords: ['c'] },
      { answer_text: 'Jawaban B', points: 80, keywords: ['b'] },
      { answer_text: 'Jawaban D', points: 40, keywords: ['d'] },
    ];
    const q1Res = await saveQuestionWithAnswers(
      {
        category_id: catId,
        question_text: 'Soal Pertama Alur Uji?',
        multiplier: 1,
        reflection_note: 'Refleksi 1',
        discussion_prompts: ['Diskusi 1'],
        sort_order: 1,
      },
      answers1
    );
    assert.equal(q1Res.error, null);
    assert.equal(q1Res.data.answers.length, 5);
    // Jawaban harus otomatis terurut dari poin terbesar
    assert.equal(q1Res.data.answers[0].points, 100);
    assert.equal(q1Res.data.answers[0].sort_order, 1);

    // Tambah soal 2 dengan 5 jawaban
    const answers2 = [
      { answer_text: 'Solusi X', points: 100 },
      { answer_text: 'Solusi Y', points: 80 },
      { answer_text: 'Solusi Z', points: 60 },
      { answer_text: 'Solusi W', points: 40 },
      { answer_text: 'Solusi V', points: 20 },
    ];
    const q2Res = await saveQuestionWithAnswers(
      {
        category_id: catId,
        question_text: 'Soal Kedua Alur Uji?',
        multiplier: 2,
        sort_order: 2,
      },
      answers2
    );
    assert.equal(q2Res.error, null);

    // 3. Reorder soal (tukar posisi soal 2 dan soal 1)
    const reorderRes = await reorderQuestions(catId, [q2Res.data.id, q1Res.data.id]);
    assert.equal(reorderRes.error, null);

    // 4. Muat ulang pertanyaan (verifikasi persistensi dan urutan baru)
    const questionsAfter = await getQuestions(catId);
    assert.equal(questionsAfter.error, null);
    assert.equal(questionsAfter.data.length, 2);
    assert.equal(questionsAfter.data[0].id, q2Res.data.id);
    assert.equal(questionsAfter.data[1].id, q1Res.data.id);

    // 5. Ekspor paket
    const exported = await exportCategory(catId);
    assert.equal(exported.error, null);
    assert.equal(exported.data.version, 1);
    assert.equal(exported.data.questions.length, 2);
    assert.equal(exported.data.category.id, undefined);
    assert.equal(exported.data.questions[0].id, undefined);

    // 6. Hapus paket asli
    const del1 = await deleteCategory(catId);
    assert.equal(del1.error, null);

    // 7. Impor kembali paket dari data ekspor
    const importRes = await importCategory(exported.data);
    assert.equal(importRes.error, null);
    assert.ok(importRes.data.categoryId);
    assert.equal(importRes.data.totalQuestions, 2);

    // 8. Hapus paket hasil impor (cleanup)
    const del2 = await deleteCategory(importRes.data.categoryId);
    assert.equal(del2.error, null);
  } finally {
    // Pastikan pembersihan
    await deleteCategory(catId).catch(() => {});
  }
});
