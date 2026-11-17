import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, suggestMatches, levenshteinDistance } from '../src/lib/matcher.js';

// Sample answers dataset resembling question 1 from demo.json
const mockAnswers = [
  {
    id: 'demo-a-1-1',
    question_id: 'demo-q-1',
    answer_text: 'Mendampingi dan merangkul teman korban',
    points: 100,
    keywords: ['mendampingi', 'merangkul', 'menemani', 'menghibur', 'ajak bicara', 'rangkul', 'peduli'],
    sort_order: 1,
  },
  {
    id: 'demo-a-1-2',
    question_id: 'demo-q-1',
    answer_text: 'Melapor ke guru atau guru BK',
    points: 80,
    keywords: ['lapor guru', 'laporkan guru', 'guru bk', 'wali kelas', 'konselor', 'beritahu guru'],
    sort_order: 2,
  },
  {
    id: 'demo-a-1-3',
    question_id: 'demo-q-1',
    answer_text: 'Menegur pelaku secara tegas dan sopan',
    points: 60,
    keywords: ['menegur', 'ingatkan', 'nasihati', 'hentikan', 'tegur baik baik'],
    sort_order: 3,
  },
  {
    id: 'demo-a-1-4',
    question_id: 'demo-q-1',
    answer_text: 'Tidak ikut tertawa atau menonton',
    points: 40,
    keywords: ['tidak tertawa', 'jangan menertawakan', 'jangan menonton', 'tinggalkan kerumunan'],
    sort_order: 4,
  },
  {
    id: 'demo-a-1-5',
    question_id: 'demo-q-1',
    answer_text: 'Mengajak teman lain untuk bersama membela',
    points: 20,
    keywords: ['ajak teman lain', 'solidaritas', 'kompak', 'bersama sama', 'minta bantuan kawan'],
    sort_order: 5,
  },
];

test('1. Exact match: harus mencocokkan teks jawaban persis dengan skor tertinggi (100)', () => {
  const matches = suggestMatches('Mendampingi dan merangkul teman korban', mockAnswers);
  assert.ok(matches.length > 0, 'Harus ada saran yang cocok');
  assert.equal(matches[0].answer.id, 'demo-a-1-1');
  assert.equal(matches[0].score, 100);
  assert.equal(matches[0].matchType, 'exact');
});

test('2. Sinonim / keyword: harus mencocokkan kata kunci sinonim yang telah didaftarkan', () => {
  const matches = suggestMatches('konselor', mockAnswers);
  assert.ok(matches.length > 0, 'Harus mencocokkan keyword sinonim');
  assert.equal(matches[0].answer.id, 'demo-a-1-2');
  assert.equal(matches[0].matchType, 'exact_keyword');

  const matchesPhrase = suggestMatches('lapor guru', mockAnswers);
  assert.ok(matchesPhrase.length > 0);
  assert.equal(matchesPhrase[0].answer.id, 'demo-a-1-2');
});

test('3. Typo kata panjang: Levenshtein mentoleransi typo ketat pada kata >= 5 huruf', () => {
  // "merangkuul" (10 huruf, typo 1 huruf dari "merangkul" (9 huruf))
  const matches = suggestMatches('merangkuul', mockAnswers);
  assert.ok(matches.length > 0, 'Typo pada kata panjang harus terdeteksi');
  assert.equal(matches[0].answer.id, 'demo-a-1-1');
  assert.equal(matches[0].matchType, 'fuzzy_keyword');

  // "konseloor" (9 huruf, typo 1 huruf dari "konselor" (8 huruf))
  const matches2 = suggestMatches('konseloor', mockAnswers);
  assert.ok(matches2.length > 0);
  assert.equal(matches2[0].answer.id, 'demo-a-1-2');
});

test('4. Kata pendek tidak boleh salah cocok (false positive prevention)', () => {
  // Kata < 4 huruf seperti "dia", "apa", atau kata pendek yang tidak terkait tidak boleh mencocokkan sembarangan
  const matchesDia = suggestMatches('dia', mockAnswers);
  assert.equal(matchesDia.length, 0, 'Kata pendek "dia" tidak boleh mencocokkan jawaban apa pun');

  const matchesApa = suggestMatches('apa', mockAnswers);
  assert.equal(matchesApa.length, 0, 'Kata pendek "apa" tidak boleh mencocokkan jawaban apa pun');
});

test('5. Jawaban yang sudah terbuka (revealedIds) harus diabaikan', () => {
  const revealed = ['demo-a-1-1'];
  // User memasukkan jawaban yang persis demo-a-1-1
  const matches = suggestMatches('Mendampingi dan merangkul teman korban', mockAnswers, revealed);
  const foundRevealed = matches.some((m) => m.answer.id === 'demo-a-1-1');
  assert.equal(foundRevealed, false, 'Jawaban yang sudah terbuka tidak boleh muncul dalam daftar saran');
});

test('6. Input kosong / hanya spasi harus mengembalikan array kosong', () => {
  assert.deepEqual(suggestMatches('', mockAnswers), []);
  assert.deepEqual(suggestMatches('   ', mockAnswers), []);
  assert.deepEqual(suggestMatches(null, mockAnswers), []);
  assert.deepEqual(suggestMatches(undefined, mockAnswers), []);
});

test('7. Huruf besar / kecil (case-insensitive) harus memberikan hasil yang sama persis', () => {
  const lowerMatches = suggestMatches('merangkul', mockAnswers);
  const upperMatches = suggestMatches('MERANGKUL', mockAnswers);
  const mixedMatches = suggestMatches('MeRaNgKuL', mockAnswers);

  assert.equal(lowerMatches[0].answer.id, upperMatches[0].answer.id);
  assert.equal(lowerMatches[0].score, upperMatches[0].score);
  assert.equal(upperMatches[0].answer.id, mixedMatches[0].answer.id);
});

test('8. Tanda baca: input dengan tanda baca harus dinormalisasi dan tetap cocok', () => {
  const matches = suggestMatches('Merangkul, teman korban!???', mockAnswers);
  assert.ok(matches.length > 0, 'Tanda baca harus dibersihkan oleh normalizeText');
  assert.equal(matches[0].answer.id, 'demo-a-1-1');
});
