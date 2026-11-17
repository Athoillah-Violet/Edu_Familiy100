import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveGame,
  loadGame,
  clearGame,
  hasSavedGame,
  validateGameState,
} from '../src/lib/gameStore.js';
import {
  buildSessionPayload,
  finishGameSession,
  getPendingSessions,
  retryPendingSessions,
} from '../src/lib/sessionReport.js';
import { createGame } from '../src/lib/gameEngine.js';

// Setup mock in-memory localStorage for Node test runner
function setupMockStorage() {
  let store = {};
  const mock = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
  globalThis.localStorage = mock;
  return mock;
}

const mockTeams = [
  { id: 't1', name: 'Tim Merah', color: '#ef4444' },
  { id: 't2', name: 'Tim Biru', color: '#3b82f6' },
];

const mockQuestions = [
  {
    id: 'q1',
    question_text: 'Soal 1',
    multiplier: 1,
    answers: [
      { id: 'a1', answer_text: 'Jawaban 1', points: 100 },
      { id: 'a2', answer_text: 'Jawaban 2', points: 80 },
      { id: 'a3', answer_text: 'Jawaban 3', points: 60 },
    ],
  },
];

test('1. gameStore: Simpan dan muat ulang game menghasilkan data identik', () => {
  setupMockStorage();
  const gameState = createGame({ teams: mockTeams, categoryId: 'cat-1' }, mockQuestions);

  const saveOk = saveGame(gameState);
  assert.equal(saveOk, true);
  assert.equal(hasSavedGame(), true);

  const loaded = loadGame();
  assert.ok(loaded);
  assert.deepEqual(loaded, gameState);
});

test('2. gameStore: Data rusak dibuang dengan aman dan mengembalikan null', () => {
  const storage = setupMockStorage();

  // Kasus A: JSON sintaks rusak
  storage.setItem('family100bk:game:v1', 'INVALID_JSON{{{');
  assert.equal(loadGame(), null);
  assert.equal(hasSavedGame(), false, 'Kunci harus dibersihkan setelah deteksi korupsi');

  // Kasus B: Bentuk state tidak valid (fase palsu atau hilang version)
  storage.setItem('family100bk:game:v1', JSON.stringify({ version: 99, phase: 'HACKED' }));
  assert.equal(loadGame(), null);
  assert.equal(hasSavedGame(), false);
});

test('3. gameStore: localStorage melempar error (kuota/private mode) tidak membuat aplikasi crash', () => {
  const brokenStorage = {
    getItem() {
      throw new Error('QuotaExceededError: Access denied in private mode');
    },
    setItem() {
      throw new Error('QuotaExceededError: Storage quota exceeded');
    },
    removeItem() {
      throw new Error('SecurityError: LocalStorage blocked');
    },
  };
  globalThis.localStorage = brokenStorage;

  const gameState = createGame({ teams: mockTeams }, mockQuestions);

  // Semua operasi harus aman tanpa melempar exception
  assert.doesNotThrow(() => {
    const saveRes = saveGame(gameState);
    assert.equal(saveRes, false);

    const loadRes = loadGame();
    assert.equal(loadRes, null);

    const hasRes = hasSavedGame();
    assert.equal(hasRes, false);

    const clearRes = clearGame();
    assert.equal(clearRes, false);
  });
});

test('4. sessionReport: buildSessionPayload hanya berisi field yang diizinkan tanpa data pribadi', () => {
  const gameState = createGame({ teams: mockTeams, categoryId: 'cat-bk-1' }, mockQuestions);
  gameState.scores['t1'] = 180;
  gameState.scores['t2'] = 100;
  gameState.roundSummaries = [{ roundIndex: 0, awardedPoints: 180 }];

  const payload = buildSessionPayload(gameState);

  // Pastikan field utama
  assert.equal(payload.categoryId, 'cat-bk-1');
  assert.equal(payload.rounds, 1);
  assert.ok(payload.finishedAt);
  assert.ok(Date.parse(payload.finishedAt) > 0, 'finishedAt harus valid ISO date');

  // Pastikan field tim
  assert.equal(payload.teams.length, 2);
  const team1 = payload.teams[0];
  assert.deepEqual(Object.keys(team1).sort(), ['color', 'name', 'rank', 'score'].sort());
  assert.equal(team1.name, 'Tim Merah');
  assert.equal(team1.score, 180);
  assert.equal(team1.rank, 1);

  // Pastikan tidak ada data yang tidak relevan (seperti ID database internal siswa, pertanyaan, dsb)
  assert.equal(payload.questions, undefined);
  assert.equal(payload.answers, undefined);
});

test('5. sessionReport: finishGameSession gagal masuk antrean pendingSessions (maks 5)', async () => {
  setupMockStorage();
  const gameState = createGame({ teams: mockTeams, categoryId: 'cat-bk-1' }, mockQuestions);

  // finishGameSession akan memanggil dataService.saveSession.
  // Karena saat pengujian Node ini isDemoMode = true (tanpa Supabase aktif), saveSession mengembalikan error ramah mode demo.
  const res = await finishGameSession(gameState);

  assert.equal(res.saved, false);
  assert.ok(res.error);
  assert.ok(res.payload);

  // Verifikasi payload otomatis diantrekan ke localStorage
  const pending = getPendingSessions();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].categoryId, 'cat-bk-1');

  // Simulasikan penumpukan lebih dari 5 kali, antrean harus dibatasi maksimal 5
  for (let i = 0; i < 6; i++) {
    await finishGameSession(gameState);
  }
  const pendingMax = getPendingSessions();
  assert.equal(pendingMax.length, 5, 'Antrean pending sessions harus dibatasi maksimal 5');
});

test('6. sessionReport: retryPendingSessions berhasil memproses antrean', async () => {
  const storage = setupMockStorage();

  // Simpan 2 antrean manual
  const dummyQueue = [
    { categoryId: 'cat-1', teams: [{ name: 'A', score: 10 }] },
    { categoryId: 'cat-2', teams: [{ name: 'B', score: 20 }] },
  ];
  storage.setItem('family100bk:sessions:pending:v1', JSON.stringify(dummyQueue));

  assert.equal(getPendingSessions().length, 2);

  // Panggil retryPendingSessions (di lingkungan demo mode gagal simpan sehingga tetap di antrean tanpa crash)
  const retryRes = await retryPendingSessions();
  assert.equal(typeof retryRes.sent, 'number');
  assert.equal(typeof retryRes.remaining, 'number');
});
