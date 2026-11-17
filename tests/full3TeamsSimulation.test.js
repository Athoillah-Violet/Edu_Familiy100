import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  reduce,
  getCurrentQuestion,
  getFaceOffTeams,
  getRanking,
  getWinners,
  getRoundSummaries,
} from '../src/lib/gameEngine.js';
import { saveGame, loadGame, clearGame } from '../src/lib/gameStore.js';
import { finishGameSession, buildSessionPayload } from '../src/lib/sessionReport.js';
import demoData from '../src/data/demo.json' with { type: 'json' };

// Mock localStorage for node environment
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

test('Full Game Simulation: 3 Tim (Rebutan, Strike, Steal, Refleksi, Refresh di tengah, Hasil Akhir)', async () => {
  clearGame();

  const category = demoData.categories[0];
  const questions = demoData.questions.filter((q) => q.category_id === category.id);
  assert.ok(questions.length >= 2, 'Kategori harus memiliki minimal 2 soal');

  const config = {
    categoryId: category.id,
    teams: [
      { id: 'team-1', name: 'Tim Mawar', color: '#3b82f6' },
      { id: 'team-2', name: 'Tim Melati', color: '#ef4444' },
      { id: 'team-3', name: 'Tim Anggrek', color: '#10b981' },
    ],
    roundCount: 2,
    timerSeconds: 20,
    maxStrikes: 3,
    multiplierEnabled: true,
  };

  // 1. Inisialisasi Game
  let state = createGame(config, questions);
  assert.equal(state.phase, 'FACE_OFF');
  assert.equal(state.config.teams.length, 3);
  saveGame(state);

  // 2. Ronde 1: Face-off
  const r1Pair = getFaceOffTeams(state.config, state.roundIndex);
  assert.equal(r1Pair.teamA.id, 'team-1');
  assert.equal(r1Pair.teamB.id, 'team-2');

  // Tim 1 Buzz
  let res = reduce(state, { type: 'BUZZ', teamId: 'team-1' });
  state = res.state;
  assert.equal(state.roundData.faceOff.buzzTeamId, 'team-1');
  assert.equal(state.roundData.faceOff.turnTeamId, 'team-1');

  // Tim 1 jawab ranking #1 (top answer)
  const currentQ1 = getCurrentQuestion(state);
  const topAns1 = currentQ1.answers[0]; // Highest point answer
  res = reduce(state, { type: 'FACEOFF_ANSWER', teamId: 'team-1', answerId: topAns1.id });
  state = res.state;
  assert.equal(state.roundData.faceOff.winnerTeamId, 'team-1');
  assert.equal(state.roundData.faceOff.waitingForChoice, true);

  // Tim 1 pilih Main
  res = reduce(state, { type: 'CHOOSE_CONTROL', choice: 'PLAY' });
  state = res.state;
  assert.equal(state.phase, 'PLAYING');
  assert.equal(state.roundData.controlTeamId, 'team-1');
  assert.equal(state.roundData.stealTeamId, 'team-2');

  // 3. Fase Playing: Tim 1 jawab benar 1 kali, lalu strike 3 kali
  const ans2 = currentQ1.answers[1];
  res = reduce(state, { type: 'REVEAL', answerId: ans2.id });
  state = res.state;
  assert.ok(state.roundData.pot > 0);

  // 3 Strikes
  res = reduce(state, { type: 'STRIKE' });
  state = res.state;
  assert.equal(state.roundData.strikes, 1);

  res = reduce(state, { type: 'STRIKE' });
  state = res.state;
  assert.equal(state.roundData.strikes, 2);

  res = reduce(state, { type: 'STRIKE' });
  state = res.state;
  assert.equal(state.roundData.strikes, 3);
  assert.equal(state.phase, 'STEAL');

  // 4. Fase Steal: Tim 2 menebak benar dan mencuri seluruh pot!
  const potBeforeSteal = state.roundData.pot;
  const ans3 = currentQ1.answers[2];
  res = reduce(state, { type: 'STEAL_ANSWER', answerId: ans3.id });
  state = res.state;

  // Steal berhasil -> ronde berakhir dan masuk REFLECTION
  assert.equal(state.phase, 'REFLECTION');
  assert.equal(state.scores['team-2'], (potBeforeSteal + ans3.points) * (currentQ1.multiplier || 1));

  // 5. SIMULASI REFRESH / RELOAD DI TENGAH PERMAINAN
  saveGame(state);
  const reloadedState = loadGame();
  assert.deepEqual(reloadedState.scores, state.scores);
  assert.equal(reloadedState.phase, 'REFLECTION');
  assert.equal(reloadedState.roundIndex, 0);
  state = reloadedState; // Lanjutkan dari hasil reload

  // 6. Lanjut ke Ronde 2 via NEXT
  res = reduce(state, { type: 'NEXT' });
  state = res.state;
  assert.equal(state.phase, 'FACE_OFF');
  assert.equal(state.roundIndex, 1);

  // Rotasi face-off untuk 3 tim:
  // r=1 -> teamA = (2*1)%3 = index 2 (Tim Anggrek), teamB = (2*1+1)%3 = index 0 (Tim Mawar)
  const r2Pair = getFaceOffTeams(state.config, state.roundIndex);
  assert.equal(r2Pair.teamA.id, 'team-3');
  assert.equal(r2Pair.teamB.id, 'team-1');

  // Tim 3 buzz & jawab
  res = reduce(state, { type: 'BUZZ', teamId: 'team-3' });
  state = res.state;
  const currentQ2 = getCurrentQuestion(state);
  res = reduce(state, { type: 'FACEOFF_ANSWER', teamId: 'team-3', answerId: currentQ2.answers[0].id });
  state = res.state;
  res = reduce(state, { type: 'CHOOSE_CONTROL', choice: 'PLAY' });
  state = res.state;
  assert.equal(state.phase, 'PLAYING');

  // Buka seluruh sisa jawaban di ronde 2 untuk menyelesaikan ronde
  for (let i = 1; i < currentQ2.answers.length; i++) {
    res = reduce(state, { type: 'REVEAL', answerId: currentQ2.answers[i].id });
    state = res.state;
  }
  assert.equal(state.phase, 'REFLECTION');
  assert.ok(state.scores['team-3'] > 0);

  // 7. Ronde 2 selesai -> Klik NEXT -> Menuju FINAL_RESULT
  res = reduce(state, { type: 'NEXT' });
  state = res.state;
  assert.equal(state.phase, 'FINAL_RESULT');

  // 8. Verifikasi Hasil Akhir
  const winners = getWinners(state);
  assert.ok(winners.length >= 1);
  const rankings = getRanking(state);
  assert.equal(rankings.length, 3);
  assert.ok(rankings[0].score >= rankings[1].score);
  assert.ok(rankings[1].score >= rankings[2].score);

  const summaries = getRoundSummaries(state);
  assert.equal(summaries.length, 2);
  assert.ok(summaries[0].awardedPoints > 0);
  assert.ok(summaries[1].awardedPoints > 0);

  // 9. Verifikasi Sesi Report Payload
  const payload = buildSessionPayload(state);
  assert.equal(payload.categoryId, category.id);
  assert.equal(payload.teams.length, 3);
  assert.equal(payload.rounds, 2);

  // 10. Finish Game Session (offline-safe queue test)
  const sessionResult = await finishGameSession(state);
  assert.ok(sessionResult !== undefined);

  saveGame(state);
  const finalLoaded = loadGame();
  assert.equal(finalLoaded.phase, 'FINAL_RESULT');
});
