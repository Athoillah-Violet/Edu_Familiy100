import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCategory,
  validateQuestion,
  validateAnswers,
  parseKeywords,
  validateImportPackage,
} from '../src/lib/validators.js';

/* ==========================================================================
   1. VALIDATE CATEGORY TESTS
   ========================================================================== */

test('1. validateCategory: judul kosong atau spasi saja', () => {
  const res1 = validateCategory({ title: '' });
  assert.equal(res1.ok, false);
  assert.ok(res1.errors.includes('Judul kategori tidak boleh kosong.'));

  const res2 = validateCategory({ title: '     ' });
  assert.equal(res2.ok, false);
  assert.ok(res2.errors.includes('Judul kategori tidak boleh kosong.'));
});

test('2. validateCategory: terlalu panjang', () => {
  const longTitle = 'a'.repeat(101);
  const resTitle = validateCategory({ title: longTitle });
  assert.equal(resTitle.ok, false);
  assert.ok(resTitle.errors.includes('Judul kategori maksimal 100 karakter.'));

  const longDesc = 'b'.repeat(301);
  const resDesc = validateCategory({ title: 'Judul Valid', description: longDesc });
  assert.equal(resDesc.ok, false);
  assert.ok(resDesc.errors.includes('Deskripsi kategori maksimal 300 karakter.'));
});

test('3. validateCategory: valid dan deskripsi kosong boleh', () => {
  const valid = validateCategory({ title: 'Karakter Positif', description: '' });
  assert.equal(valid.ok, true);
  assert.equal(valid.errors.length, 0);
});

/* ==========================================================================
   2. VALIDATE QUESTION TESTS
   ========================================================================== */

test('4. validateQuestion: soal kosong atau spasi saja', () => {
  const res1 = validateQuestion({ question_text: '', multiplier: 1 });
  assert.equal(res1.ok, false);
  assert.ok(res1.errors.includes('Teks soal tidak boleh kosong.'));

  const res2 = validateQuestion({ question_text: '    ', multiplier: 1 });
  assert.equal(res2.ok, false);
  assert.ok(res2.errors.includes('Teks soal tidak boleh kosong.'));
});

test('5. validateQuestion: multiplier 0, 4, atau desimal 2.5 (harus integer 1-3)', () => {
  const res0 = validateQuestion({ question_text: 'Soal?', multiplier: 0 });
  assert.equal(res0.ok, false);
  assert.ok(res0.errors.some((e) => e.includes('bilangan bulat antara 1 sampai 3')));

  const res4 = validateQuestion({ question_text: 'Soal?', multiplier: 4 });
  assert.equal(res4.ok, false);
  assert.ok(res4.errors.some((e) => e.includes('bilangan bulat antara 1 sampai 3')));

  const resFloat = validateQuestion({ question_text: 'Soal?', multiplier: 2.5 });
  assert.equal(resFloat.ok, false);
  assert.ok(resFloat.errors.some((e) => e.includes('bilangan bulat antara 1 sampai 3')));
});

test('6. validateQuestion: discussion_prompts maksimal 2 buah', () => {
  const resTooMany = validateQuestion({
    question_text: 'Bagaimana respons kamu?',
    multiplier: 1,
    discussion_prompts: ['Pertanyaan 1', 'Pertanyaan 2', 'Pertanyaan 3'],
  });
  assert.equal(resTooMany.ok, false);
  assert.ok(resTooMany.errors.includes('Maksimal discussion prompts adalah 2.'));

  const resValid = validateQuestion({
    question_text: 'Bagaimana respons kamu?',
    multiplier: 2,
    discussion_prompts: ['Pertanyaan 1', 'Pertanyaan 2'],
  });
  assert.equal(resValid.ok, true);
  assert.equal(resValid.errors.length, 0);
});

/* ==========================================================================
   3. VALIDATE ANSWERS TESTS
   ========================================================================== */

test('7. validateAnswers: jumlah jawaban 2 dan 9 buah (harus 3-8 buah)', () => {
  const twoAnswers = [
    { answer_text: 'Jawaban A', points: 100 },
    { answer_text: 'Jawaban B', points: 80 },
  ];
  const resTwo = validateAnswers(twoAnswers);
  assert.equal(resTwo.ok, false);
  assert.ok(resTwo.errors.includes('Jumlah jawaban harus antara 3 hingga 8 buah.'));

  const nineAnswers = Array.from({ length: 9 }, (_, i) => ({
    answer_text: `Jawaban ke-${i + 1}`,
    points: 10 * (9 - i),
  }));
  const resNine = validateAnswers(nineAnswers);
  assert.equal(resNine.ok, false);
  assert.ok(resNine.errors.includes('Jumlah jawaban harus antara 3 hingga 8 buah.'));
});

test('8. validateAnswers: poin negatif atau non-integer', () => {
  const negativeAnswers = [
    { answer_text: 'Jawaban A', points: -10 },
    { answer_text: 'Jawaban B', points: 50 },
    { answer_text: 'Jawaban C', points: 20 },
  ];
  const res = validateAnswers(negativeAnswers);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('bilangan bulat >= 0')));
});

test('9. validateAnswers: jawaban kembar (abaikan huruf besar/kecil)', () => {
  const duplicateAnswers = [
    { answer_text: 'Minta Maaf', points: 100 },
    { answer_text: 'minta maaf', points: 80 },
    { answer_text: 'Lapor Guru', points: 60 },
  ];
  const res = validateAnswers(duplicateAnswers);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('kembar/duplikat')));
});

test('10. validateAnswers: valid (3 sampai 8 jawaban unik dengan poin >= 0)', () => {
  const validAnswers = [
    { answer_text: 'Mendampingi Korban', points: 100 },
    { answer_text: 'Lapor ke Guru BK', points: 80 },
    { answer_text: 'Menegur Pelaku', points: 60 },
    { answer_text: 'Tidak Ikut Menonton', points: 40 },
  ];
  const res = validateAnswers(validAnswers);
  assert.equal(res.ok, true);
  assert.equal(res.errors.length, 0);
});

/* ==========================================================================
   4. PARSE KEYWORDS TESTS
   ========================================================================== */

test('11. parseKeywords: split koma, trim, lowercase, buang kosong dan duplikat', () => {
  const rawInput = ' Merangkul , MERANGKUL,  tegur baik-baik , , TEGUR BAIK-BAIK, peduli  ';
  const result = parseKeywords(rawInput);
  assert.deepEqual(result, ['merangkul', 'tegur baik-baik', 'peduli']);

  assert.deepEqual(parseKeywords(''), []);
  assert.deepEqual(parseKeywords(null), []);
  assert.deepEqual(parseKeywords(['A', ' a ', 'b']), ['a', 'b']);
});

/* ==========================================================================
   5. VALIDATE IMPORT PACKAGE TESTS
   ========================================================================== */

test('12. validateImportPackage: JSON rusak / bukan objek / field hilang', () => {
  assert.equal(validateImportPackage(null).ok, false);
  assert.equal(validateImportPackage('string json').ok, false);
  assert.equal(validateImportPackage([]).ok, false);

  const missingFields = validateImportPackage({});
  assert.equal(missingFields.ok, false);
  assert.ok(missingFields.errors.some((e) => e.includes('version')));
  assert.ok(missingFields.errors.some((e) => e.includes('category')));
  assert.ok(missingFields.errors.some((e) => e.includes('questions')));
});

test('13. validateImportPackage: struktur valid lulus', () => {
  const validPackage = {
    version: 1,
    category: {
      title: 'Resolusi Konflik Siswa',
      description: 'Panduan mengelola perbedaan pendapat.',
      is_published: false,
    },
    questions: [
      {
        question_text: 'Bagaimana cara terbaik bernegosiasi saat terjadi salah paham?',
        multiplier: 1,
        reflection_note: 'Mendengarkan aktif adalah kunci.',
        discussion_prompts: ['Pernahkah kamu salah paham dengan sahabat?'],
        answers: [
          { answer_text: 'Mendengarkan penjelasan teman', points: 100, keywords: ['dengar', 'simak'] },
          { answer_text: 'Bicara dengan kepala dingin', points: 80, keywords: ['tenang', 'santai'] },
          { answer_text: 'Mencari penengah / guru BK', points: 60, keywords: ['mediator', 'guru'] },
        ],
      },
    ],
  };

  const res = validateImportPackage(validPackage);
  assert.equal(res.ok, true);
  assert.equal(res.errors.length, 0);
});
