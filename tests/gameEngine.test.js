import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  reduce,
  getCurrentQuestion,
  getFaceOffTeams,
  getRanking,
  getWinners,
  canUndo,
  getRoundSummaries,
} from '../src/lib/gameEngine.js';
import demoData from '../src/data/demo.json' with { type: 'json' };

const sampleQuestions = [
  {
    id: 'q-1',
    question_text: 'Tindakan menghadapi perundungan?',
    multiplier: 1,
    sort_order: 1,
    answers: [
      { id: 'ans-1', answer_text: 'Mendampingi Korban', points: 100 },
      { id: 'ans-2', answer_text: 'Lapor Guru BK', points: 80 },
      { id: 'ans-3', answer_text: 'Menegur Pelaku', points: 60 },
      { id: 'ans-4', answer_text: 'Jangan Menonton', points: 40 },
    ],
  },
  {
    id: 'q-2',
    question_text: 'Sikap positif di kelas?',
    multiplier: 2,
    sort_order: 2,
    answers: [
      { id: 'ans-2-1', answer_text: 'Menghargai Perbedaan', points: 100 },
      { id: 'ans-2-2', answer_text: 'Ramah Menyapa', points: 80 },
      { id: 'ans-2-3', answer_text: 'Mengajak Gabung', points: 60 },
      { id: 'ans-2-4', answer_text: 'Saling Tolong', points: 40 },
    ],
  },
];

const basicTeams = [
  { id: 'team-a', name: 'Tim Rajawali', color: '#ef4444' },
  { id: 'team-b', name: 'Tim Garuda', color: '#3b82f6' },
];

test('1. createGame valid dan tolak config tidak valid', () => {
  // Valid
  const state = createGame(
    {
      teams: basicTeams,
      roundCount: 2,
    },
    sampleQuestions
  );
  assert.equal(state.version, 1);
  assert.equal(state.questions.length, 2);
  assert.equal(state.phase, 'FACE_OFF');

  // Tolak tim < 2
  assert.throws(
    () => createGame({ teams: [{ id: '1', name: 'A' }] }, sampleQuestions),
    /antara 2 hingga 4 tim/
  );

  // Tolak tim > 4
  assert.throws(
    () =>
      createGame(
        {
          teams: [
            { id: '1', name: 'A' },
            { id: '2', name: 'B' },
            { id: '3', name: 'C' },
            { id: '4', name: 'D' },
            { id: '5', name: 'E' },
          ],
        },
        sampleQuestions
      ),
    /antara 2 hingga 4 tim/
  );

  // Tolak nama tim kosong / kembar
  assert.throws(
    () =>
      createGame(
        {
          teams: [
            { id: '1', name: '   ' },
            { id: '2', name: 'B' },
          ],
        },
        sampleQuestions
      ),
    /tidak boleh kosong/
  );

  assert.throws(
    () =>
      createGame(
        {
          teams: [
            { id: '1', name: 'Garuda' },
            { id: '2', name: 'garuda' },
          ],
        },
        sampleQuestions
      ),
    /tidak boleh kembar/
  );

  // Tolak soal kosong
  assert.throws(() => createGame({ teams: basicTeams }, []), /tidak boleh kosong/);
});

test('2. Face-off: peringkat 1 oleh buzz pertama langsung menang kontrol', () => {
  let s = createGame({ teams: basicTeams }, sampleQuestions);

  // Buzz tim A
  const buzzRes = reduce(s, { type: 'BUZZ', teamId: 'team-a' });
  s = buzzRes.state;
  assert.equal(buzzRes.events[0].type, 'BUZZED');

  // Tim A menjawab peringkat 1 ('ans-1' = 100 poin, rank 1)
  const ansRes = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-a', answerId: 'ans-1' });
  s = ansRes.state;

  assert.equal(s.roundData.faceOff.winnerTeamId, 'team-a');
  assert.equal(s.roundData.faceOff.waitingForChoice, true);
  assert.ok(ansRes.events.some((e) => e.type === 'CONTROL_WON' && e.teamId === 'team-a'));
});

test('3. Face-off: first valid non-top, kedua lebih tinggi -> kedua menang', () => {
  let s = createGame({ teams: basicTeams }, sampleQuestions);
  s = reduce(s, { type: 'BUZZ', teamId: 'team-a' }).state;

  // Tim A menjawab peringkat 3 ('ans-3' = 60 poin)
  s = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-a', answerId: 'ans-3' }).state;
  assert.equal(s.roundData.faceOff.turnTeamId, 'team-b');

  // Tim B menjawab peringkat 2 ('ans-2' = 80 poin > 60 poin)
  const ansResB = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-b', answerId: 'ans-2' });
  s = ansResB.state;

  assert.equal(s.roundData.faceOff.winnerTeamId, 'team-b');
  assert.equal(s.roundData.faceOff.waitingForChoice, true);
  assert.ok(ansResB.events.some((e) => e.type === 'CONTROL_WON' && e.teamId === 'team-b'));
});

test('4. Face-off: first valid non-top, kedua salah -> first menang', () => {
  let s = createGame({ teams: basicTeams }, sampleQuestions);
  s = reduce(s, { type: 'BUZZ', teamId: 'team-a' }).state;

  // Tim A menjawab peringkat 2 ('ans-2' = 80 poin)
  s = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-a', answerId: 'ans-2' }).state;

  // Tim B menjawab salah (null)
  const ansResB = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-b', answerId: null });
  s = ansResB.state;

  assert.equal(s.roundData.faceOff.winnerTeamId, 'team-a');
  assert.equal(s.roundData.faceOff.waitingForChoice, true);
  assert.ok(ansResB.events.some((e) => e.type === 'CONTROL_WON' && e.teamId === 'team-a'));
});

test('5. Face-off: keduanya salah -> reset, tanpa pemenang', () => {
  let s = createGame({ teams: basicTeams }, sampleQuestions);
  s = reduce(s, { type: 'BUZZ', teamId: 'team-a' }).state;

  // Tim A salah
  s = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-a', answerId: null }).state;
  assert.equal(s.roundData.faceOff.turnTeamId, 'team-b');

  // Tim B juga salah
  const ansResB = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-b', answerId: null });
  s = ansResB.state;

  // Reset buzzer
  assert.equal(s.roundData.faceOff.buzzTeamId, null);
  assert.equal(s.roundData.faceOff.winnerTeamId, null);
  assert.equal(s.roundData.faceOff.waitingForChoice, false);
  assert.ok(ansResB.events.some((e) => e.type === 'FACEOFF_RESET'));
});

test('6. Buzz kedua diabaikan', () => {
  let s = createGame({ teams: basicTeams }, sampleQuestions);
  s = reduce(s, { type: 'BUZZ', teamId: 'team-a' }).state;

  // Tim B mencoba buzz saat buzzer aktif
  const buzzB = reduce(s, { type: 'BUZZ', teamId: 'team-b' });
  assert.equal(buzzB.events[0].type, 'IGNORED');
  assert.equal(buzzB.state.roundData.faceOff.buzzTeamId, 'team-a');
});

test('7. CHOOSE_CONTROL pass memindahkan kontrol dan stealTeamId benar', () => {
  let s = createGame({ teams: basicTeams }, sampleQuestions);
  s = reduce(s, { type: 'BUZZ', teamId: 'team-a' }).state;
  s = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-a', answerId: 'ans-1' }).state;

  // Tim A menang face-off, tapi memilih 'pass'
  const choiceRes = reduce(s, { type: 'CHOOSE_CONTROL', choice: 'pass' });
  s = choiceRes.state;

  assert.equal(s.phase, 'PLAYING');
  assert.equal(s.roundData.controlTeamId, 'team-b'); // Pindah ke lawan
  assert.equal(s.roundData.stealTeamId, 'team-a');
  assert.equal(choiceRes.events[0].controlTeamId, 'team-b');
});

test('8. Semua jawaban terbuka di PLAYING -> ROUND_END, skor benar', () => {
  let s = createGame({ teams: basicTeams, multiplierEnabled: true }, sampleQuestions);
  s = reduce(s, { type: 'BUZZ', teamId: 'team-a' }).state;
  s = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-a', answerId: 'ans-1' }).state; // 100 pt
  s = reduce(s, { type: 'CHOOSE_CONTROL', choice: 'play' }).state; // control: team-a

  // Reveal sisa jawaban: ans-2 (80), ans-3 (60), ans-4 (40)
  s = reduce(s, { type: 'REVEAL', answerId: 'ans-2' }).state;
  s = reduce(s, { type: 'REVEAL', answerId: 'ans-3' }).state;
  const lastReveal = reduce(s, { type: 'REVEAL', answerId: 'ans-4' });
  s = lastReveal.state;

  assert.equal(s.phase, 'REFLECTION');
  // Total pot = 100 + 80 + 60 + 40 = 280. Multiplier soal 1 = 1x -> 280
  assert.equal(s.scores['team-a'], 280);
  assert.equal(s.scores['team-b'], 0);
  assert.ok(lastReveal.events.some((e) => e.type === 'ROUND_ENDED' && e.winnerTeamId === 'team-a'));
});

test('9. Jawaban yang sudah terbuka tidak menambah strike', () => {
  let s = createGame({ teams: basicTeams }, sampleQuestions);
  s = reduce(s, { type: 'BUZZ', teamId: 'team-a' }).state;
  s = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-a', answerId: 'ans-1' }).state;
  s = reduce(s, { type: 'CHOOSE_CONTROL', choice: 'play' }).state;

  // Coba reveal lagi ans-1 yang sudah terbuka di face-off
  const dupRes = reduce(s, { type: 'REVEAL', answerId: 'ans-1' });
  assert.equal(dupRes.events[0].type, 'ALREADY_REVEALED');
  assert.equal(dupRes.state.roundData.strikes, 0); // Strikes tidak bertambah
});

test('10. 3 strike -> STEAL; steal berhasil memindahkan seluruh pot', () => {
  let s = createGame({ teams: basicTeams, maxStrikes: 3 }, sampleQuestions);
  s = reduce(s, { type: 'BUZZ', teamId: 'team-a' }).state;
  s = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-a', answerId: 'ans-1' }).state; // 100 pt
  s = reduce(s, { type: 'CHOOSE_CONTROL', choice: 'play' }).state; // control: team-a, steal: team-b

  // Reveal 1 jawaban lagi: ans-2 (80 pt) -> Pot = 180
  s = reduce(s, { type: 'REVEAL', answerId: 'ans-2' }).state;
  assert.equal(s.roundData.pot, 180);

  // 3 Kali Strike
  s = reduce(s, { type: 'STRIKE' }).state;
  s = reduce(s, { type: 'STRIKE' }).state;
  const strike3 = reduce(s, { type: 'STRIKE' });
  s = strike3.state;

  assert.equal(s.phase, 'STEAL');
  assert.ok(strike3.events.some((e) => e.type === 'STEAL_STARTED' && e.teamId === 'team-b'));

  // Tim B melakukan steal sukses dengan ans-3 (60 pt) -> Pot jadi 180 + 60 = 240
  const stealRes = reduce(s, { type: 'STEAL_ANSWER', answerId: 'ans-3' });
  s = stealRes.state;

  assert.equal(s.phase, 'REFLECTION');
  assert.equal(s.roundData.winnerTeamId, 'team-b');
  assert.equal(s.scores['team-b'], 240); // Seluruh pot masuk ke tim steal
  assert.equal(s.scores['team-a'], 0);
  assert.ok(stealRes.events.some((e) => e.type === 'STEAL_SUCCESS'));
});

test('11. Steal gagal -> pot ke tim berkontrol', () => {
  let s = createGame({ teams: basicTeams, maxStrikes: 3 }, sampleQuestions);
  s = reduce(s, { type: 'BUZZ', teamId: 'team-a' }).state;
  s = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-a', answerId: 'ans-1' }).state; // 100 pt
  s = reduce(s, { type: 'CHOOSE_CONTROL', choice: 'play' }).state;

  // 3 Strikes
  s = reduce(s, { type: 'STRIKE' }).state;
  s = reduce(s, { type: 'STRIKE' }).state;
  s = reduce(s, { type: 'STRIKE' }).state;
  assert.equal(s.phase, 'STEAL');

  // Tim B gagal steal (jawaban salah / null)
  const stealRes = reduce(s, { type: 'STEAL_ANSWER', answerId: null });
  s = stealRes.state;

  assert.equal(s.phase, 'REFLECTION');
  assert.equal(s.roundData.winnerTeamId, 'team-a'); // Pot kembali ke tim berkontrol
  assert.equal(s.scores['team-a'], 100);
  assert.equal(s.scores['team-b'], 0);
  assert.ok(stealRes.events.some((e) => e.type === 'STEAL_FAILED'));
});

test('12. Pengali soal diterapkan, dan dimatikan saat multiplierEnabled false', () => {
  // Ronde 2 multiplier = 2
  // Test dengan multiplierEnabled: true
  let sMulti = createGame({ teams: basicTeams, multiplierEnabled: true }, sampleQuestions);
  sMulti.roundIndex = 1; // Soal 2 (multiplier 2)
  sMulti.roundData.pot = 100;
  sMulti.roundData.controlTeamId = 'team-a';
  sMulti.phase = 'PLAYING';

  const finishRes = reduce(sMulti, { type: 'FINISH_ROUND' });
  // 100 * 2 = 200
  assert.equal(finishRes.state.scores['team-a'], 200);

  // Test dengan multiplierEnabled: false
  let sNoMulti = createGame({ teams: basicTeams, multiplierEnabled: false }, sampleQuestions);
  sNoMulti.roundIndex = 1;
  sNoMulti.roundData.pot = 100;
  sNoMulti.roundData.controlTeamId = 'team-a';
  sNoMulti.phase = 'PLAYING';

  const finishResNo = reduce(sNoMulti, { type: 'FINISH_ROUND' });
  // 100 * 1 = 100 (multiplier diabaikan)
  assert.equal(finishResNo.state.scores['team-a'], 100);
});

test('13. TIMER_EXPIRED di tiap fase', () => {
  let s = createGame({ teams: basicTeams }, sampleQuestions);

  // 1. Di FACE_OFF saat giliran tim A
  s = reduce(s, { type: 'BUZZ', teamId: 'team-a' }).state;
  const timeFaceOff = reduce(s, { type: 'TIMER_EXPIRED' });
  // Tim A dianggap salah, giliran ke tim B
  assert.equal(timeFaceOff.state.roundData.faceOff.turnTeamId, 'team-b');

  // 2. Di PLAYING -> jadi Strike
  s = timeFaceOff.state;
  s = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-b', answerId: 'ans-1' }).state;
  s = reduce(s, { type: 'CHOOSE_CONTROL', choice: 'play' }).state; // phase PLAYING
  const timePlaying = reduce(s, { type: 'TIMER_EXPIRED' });
  assert.equal(timePlaying.state.roundData.strikes, 1);

  // 3. Di STEAL -> steal gagal
  s = timePlaying.state;
  s = reduce(s, { type: 'STRIKE' }).state;
  s = reduce(s, { type: 'STRIKE' }).state; // strikes = 3 -> phase STEAL
  assert.equal(s.phase, 'STEAL');
  const timeSteal = reduce(s, { type: 'TIMER_EXPIRED' });
  assert.equal(timeSteal.state.phase, 'REFLECTION');
  assert.equal(timeSteal.state.roundData.winnerTeamId, 'team-b'); // tim berkontrol menang
});

test('14. Aksi pada fase salah -> IGNORED dan state tidak berubah (immutability check)', () => {
  const initial = createGame({ teams: basicTeams }, sampleQuestions);
  const jsonBefore = JSON.stringify(initial);

  // Coba aksi STRIKE pada fase FACE_OFF
  const res = reduce(initial, { type: 'STRIKE' });
  assert.equal(res.events[0].type, 'IGNORED');
  assert.equal(JSON.stringify(initial), jsonBefore, 'State lama tidak boleh termutasi');
  assert.equal(JSON.stringify(res.state), jsonBefore, 'State baru harus identik dengan state lama');
});

test('15. UNDO mengembalikan state; batas 20 langkah', () => {
  let s = createGame({ teams: basicTeams }, sampleQuestions);
  assert.equal(canUndo(s), false);

  // Lakukan 25 aksi berurutan
  for (let i = 0; i < 25; i++) {
    s = reduce(s, { type: 'ADJUST_SCORE', teamId: 'team-a', delta: 10 }).state;
  }
  assert.equal(s.scores['team-a'], 250);
  assert.equal(s.undoStack.length, 20); // Dibatasi maksimal 20 snapshot

  // Undo 1 langkah
  const undoRes = reduce(s, { type: 'UNDO' });
  s = undoRes.state;
  assert.equal(s.scores['team-a'], 240);
  assert.equal(undoRes.events[0].type, 'UNDONE');
});

test('16. PAUSE memblokir aksi lain', () => {
  let s = createGame({ teams: basicTeams }, sampleQuestions);
  s = reduce(s, { type: 'PAUSE' }).state;
  assert.equal(s.paused, true);

  // Coba BUZZ saat pause
  const resBuzz = reduce(s, { type: 'BUZZ', teamId: 'team-a' });
  assert.equal(resBuzz.events[0].type, 'IGNORED');
  assert.ok(resBuzz.events[0].reason.includes('pause'));

  // Resume
  s = reduce(s, { type: 'RESUME' }).state;
  assert.equal(s.paused, false);

  // Sekarang BUZZ berhasil
  const resBuzzAfter = reduce(s, { type: 'BUZZ', teamId: 'team-a' });
  assert.equal(resBuzzAfter.events[0].type, 'BUZZED');
});

test('17. Rotasi pasangan face-off untuk 3 dan 4 tim', () => {
  const teams3 = [
    { id: 't1', name: 'T1' },
    { id: 't2', name: 'T2' },
    { id: 't3', name: 'T3' },
  ];
  // n=3, r=0: (0, 1) -> T1, T2
  assert.deepEqual(getFaceOffTeams({ teams: teams3 }, 0), { teamA: teams3[0], teamB: teams3[1] });
  // n=3, r=1: (2, 3%3=0) -> T3, T1
  assert.deepEqual(getFaceOffTeams({ teams: teams3 }, 1), { teamA: teams3[2], teamB: teams3[0] });
  // n=3, r=2: (4%3=1, 5%3=2) -> T2, T3
  assert.deepEqual(getFaceOffTeams({ teams: teams3 }, 2), { teamA: teams3[1], teamB: teams3[2] });

  const teams4 = [
    { id: 't1', name: 'T1' },
    { id: 't2', name: 'T2' },
    { id: 't3', name: 'T3' },
    { id: 't4', name: 'T4' },
  ];
  // n=4, r=0: (0, 1) -> T1, T2
  assert.deepEqual(getFaceOffTeams({ teams: teams4 }, 0), { teamA: teams4[0], teamB: teams4[1] });
  // n=4, r=1: (2, 3) -> T3, T4
  assert.deepEqual(getFaceOffTeams({ teams: teams4 }, 1), { teamA: teams4[2], teamB: teams4[3] });
  // n=4, r=2: (4%4=0, 5%4=1) -> T1, T2
  assert.deepEqual(getFaceOffTeams({ teams: teams4 }, 2), { teamA: teams4[0], teamB: teams4[1] });
});

test('18. Seri: getWinners mengembalikan lebih dari satu tim', () => {
  const s = createGame({ teams: basicTeams }, sampleQuestions);
  s.scores['team-a'] = 200;
  s.scores['team-b'] = 200;

  const winners = getWinners(s);
  assert.equal(winners.length, 2);
  assert.deepEqual(
    winners.map((w) => w.id),
    ['team-a', 'team-b']
  );
});

test('19. Serialisasi: JSON.parse(JSON.stringify(state)) tetap bisa dipakai reduce dan identik', () => {
  let s = createGame({ teams: basicTeams }, sampleQuestions);
  s = reduce(s, { type: 'BUZZ', teamId: 'team-a' }).state;

  const serialized = JSON.stringify(s);
  const parsed = JSON.parse(serialized);

  const res = reduce(parsed, { type: 'FACEOFF_ANSWER', teamId: 'team-a', answerId: 'ans-1' });
  assert.equal(res.state.roundData.faceOff.winnerTeamId, 'team-a');
  assert.equal(res.state.roundData.revealedIds.includes('ans-1'), true);
});

test('20. Simulasi satu permainan penuh 3 ronde dengan data demo.json sampai FINAL_RESULT', () => {
  const demoQuestions = demoData.questions;
  const config = {
    categoryId: demoData.categories[0].id,
    teams: [
      { id: 'team-merah', name: 'Tim Merah', color: '#dc2626' },
      { id: 'team-biru', name: 'Tim Biru', color: '#2563eb' },
    ],
    roundCount: 3,
    multiplierEnabled: true,
  };

  let s = createGame(config, demoQuestions);
  assert.equal(s.questions.length, 3);
  assert.equal(s.roundIndex, 0);

  // --- RONDE 1 ---
  assert.equal(s.phase, 'FACE_OFF');
  s = reduce(s, { type: 'BUZZ', teamId: 'team-merah' }).state;
  const q1 = getCurrentQuestion(s);
  // Tim Merah jawab top answer
  s = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-merah', answerId: q1.answers[0].id }).state;
  s = reduce(s, { type: 'CHOOSE_CONTROL', choice: 'play' }).state;
  assert.equal(s.phase, 'PLAYING');

  // Tim Merah membuka semua sisa jawaban
  for (let i = 1; i < q1.answers.length; i++) {
    s = reduce(s, { type: 'REVEAL', answerId: q1.answers[i].id }).state;
  }
  assert.equal(s.phase, 'REFLECTION');
  // Lanjut ke Ronde 2
  s = reduce(s, { type: 'NEXT' }).state;

  // --- RONDE 2 ---
  assert.equal(s.roundIndex, 1);
  assert.equal(s.phase, 'FACE_OFF');
  s = reduce(s, { type: 'BUZZ', teamId: 'team-biru' }).state;
  const q2 = getCurrentQuestion(s);
  s = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-biru', answerId: q2.answers[0].id }).state;
  s = reduce(s, { type: 'CHOOSE_CONTROL', choice: 'play' }).state;
  assert.equal(s.phase, 'PLAYING');

  // Tim Biru kena 3 strike
  s = reduce(s, { type: 'STRIKE' }).state;
  s = reduce(s, { type: 'STRIKE' }).state;
  s = reduce(s, { type: 'STRIKE' }).state;
  assert.equal(s.phase, 'STEAL');

  // Tim Merah mencuri jawaban kedua
  s = reduce(s, { type: 'STEAL_ANSWER', answerId: q2.answers[1].id }).state;
  assert.equal(s.phase, 'REFLECTION');
  // Lanjut ke Ronde 3
  s = reduce(s, { type: 'NEXT' }).state;

  // --- RONDE 3 ---
  assert.equal(s.roundIndex, 2);
  assert.equal(s.phase, 'FACE_OFF');
  s = reduce(s, { type: 'BUZZ', teamId: 'team-biru' }).state;
  const q3 = getCurrentQuestion(s);
  s = reduce(s, { type: 'FACEOFF_ANSWER', teamId: 'team-biru', answerId: q3.answers[0].id }).state;
  s = reduce(s, { type: 'CHOOSE_CONTROL', choice: 'play' }).state;

  // Selesaikan ronde dengan FINISH_ROUND
  s = reduce(s, { type: 'FINISH_ROUND' }).state;
  assert.equal(s.phase, 'REFLECTION');

  // Selesaikan game
  const finalRes = reduce(s, { type: 'NEXT' });
  s = finalRes.state;

  assert.equal(s.phase, 'FINAL_RESULT');
  assert.ok(finalRes.events.some((e) => e.type === 'GAME_ENDED'));

  const ranking = getRanking(s);
  assert.equal(ranking.length, 2);
  const winners = getWinners(s);
  assert.ok(winners.length >= 1);
  const summaries = getRoundSummaries(s);
  assert.equal(summaries.length, 3);
});
