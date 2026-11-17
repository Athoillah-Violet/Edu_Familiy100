import {
  createGame,
  reduce,
  getCurrentQuestion,
  getRanking,
  getWinners,
  canUndo,
} from './lib/gameEngine.js';
import { saveGame, loadGame, clearGame, hasSavedGame } from './lib/gameStore.js';
import { finishGameSession } from './lib/sessionReport.js';
import { getCategories, getQuestions } from './lib/dataService.js';
import { suggestMatches } from './lib/matcher.js';
import { escapeHtml } from './lib/ui.js';

let gameState = null;
let currentLoadedQuestions = [];

const setupSection = document.getElementById('setup-section');
const gameSection = document.getElementById('game-section');
const resumeBanner = document.getElementById('resume-banner');
const logEl = document.getElementById('disp-log');
const sessionStatusEl = document.getElementById('session-status');

function logEvents(actionType, events) {
  const time = new Date().toLocaleTimeString();
  const summary = (events || []).map((e) => JSON.stringify(e)).join('\n  ');
  logEl.textContent =
    `[${time}] AKSI: ${actionType}\n  ${summary}\n\n` + logEl.textContent;
}

// 1. Inisialisasi: Cek game tersimpan di localStorage & isi kategori
async function init() {
  if (hasSavedGame()) {
    const saved = loadGame();
    if (saved) {
      resumeBanner.style.display = 'block';
    }
  }

  document.getElementById('btn-resume')?.addEventListener('click', () => {
    const saved = loadGame();
    if (saved) {
      gameState = saved;
      resumeBanner.style.display = 'none';
      setupSection.style.display = 'none';
      gameSection.style.display = 'block';
      logEvents('RESTORE_GAME', [{ type: 'GAME_RESTORED', phase: gameState.phase }]);
      render();
    }
  });

  document.getElementById('btn-discard')?.addEventListener('click', () => {
    clearGame();
    resumeBanner.style.display = 'none';
  });

  // Isi dropdown kategori
  const catSelect = document.getElementById('select-category');
  const catRes = await getCategories();
  const categories = catRes.data || [];

  catSelect.innerHTML = categories
    .map((c) => `<option value="${c.id}">${escapeHtml(c.title)}</option>`)
    .join('');
}

// 2. Setup Permainan Baru
document.getElementById('setup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const categoryId = document.getElementById('select-category').value;
  const teamInputs = document.querySelectorAll('.team-name');
  const teams = [];

  const teamColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
  let colorIdx = 0;

  teamInputs.forEach((inp) => {
    const val = inp.value.trim();
    if (val) {
      teams.push({
        id: `team-${colorIdx + 1}`,
        name: val,
        color: teamColors[colorIdx % teamColors.length],
      });
      colorIdx++;
    }
  });

  const roundCount = Number(document.getElementById('select-rounds').value) || 3;
  const timerSeconds = Number(document.getElementById('select-timer').value) || 0;
  const maxStrikes = Number(document.getElementById('input-strikes').value) || 3;
  const multiplierEnabled = document.getElementById('check-multiplier').checked;

  const btnStart = document.getElementById('btn-start-game');
  btnStart.disabled = true;
  btnStart.textContent = 'Memuat soal...';

  const qRes = await getQuestions(categoryId);
  btnStart.disabled = false;
  btnStart.textContent = 'Mulai Permainan';

  if (qRes.error || !qRes.data || qRes.data.length === 0) {
    alert(`Gagal memuat soal: ${qRes.error || 'Daftar soal kosong'}`);
    return;
  }

  currentLoadedQuestions = qRes.data;

  try {
    const config = {
      categoryId,
      teams,
      roundCount,
      timerSeconds,
      maxStrikes,
      multiplierEnabled,
    };

    gameState = createGame(config, currentLoadedQuestions);
    saveGame(gameState);

    setupSection.style.display = 'none';
    gameSection.style.display = 'block';
    sessionStatusEl.textContent = '';
    logEvents('CREATE_GAME', [{ type: 'GAME_CREATED', roundCount: gameState.questions.length }]);
    render();
  } catch (err) {
    alert(`Gagal membuat game: ${err.message}`);
  }
});

// 3. Dispatcher pusat untuk memproses aksi, menyimpan state, dan render UI
function dispatch(action) {
  if (!gameState) return;
  const res = reduce(gameState, action);
  gameState = res.state;
  saveGame(gameState);
  logEvents(action.type, res.events);
  render();

  // Jika game berakhir di fase FINAL_RESULT, panggil finishGameSession
  if (gameState.phase === 'FINAL_RESULT') {
    handleFinalResultSession();
  }
}

async function handleFinalResultSession() {
  sessionStatusEl.textContent = 'Menyimpan laporan sesi ke Supabase...';
  sessionStatusEl.style.color = '#0284c7';

  const reportRes = await finishGameSession(gameState);
  if (reportRes.saved) {
    sessionStatusEl.textContent = 'Laporan sesi permainan berhasil disimpan ke database Supabase (tabel game_sessions).';
    sessionStatusEl.style.color = '#16a34a';
  } else {
    sessionStatusEl.textContent = `Penyimpanan langsung gagal (${reportRes.error}). Sesi disimpan di antrean lokal (pending) untuk dikirim ulang.`;
    sessionStatusEl.style.color = '#dc2626';
  }
}

// 4. Render Fungsi Utama
function render() {
  if (!gameState) return;

  const currentQ = getCurrentQuestion(gameState);
  const roundData = gameState.roundData;
  const teams = gameState.config.teams;

  // Header display
  document.getElementById('disp-phase').textContent = gameState.phase;
  document.getElementById('disp-paused').textContent = gameState.paused ? 'Ya (Jeda Aktif)' : 'Tidak';
  document.getElementById('disp-round').textContent = `${gameState.roundIndex + 1} dari ${gameState.questions.length}`;
  document.getElementById('disp-multiplier').textContent = `x${currentQ?.multiplier || 1}`;
  document.getElementById('disp-question').textContent = currentQ?.question_text || '(Tidak ada soal)';
  document.getElementById('disp-pot').textContent = `${roundData.pot} Poin`;
  document.getElementById('disp-strikes').textContent = `${roundData.strikes} / ${gameState.config.maxStrikes}`;

  const controlTeam = teams.find((t) => t.id === roundData.controlTeamId);
  const stealTeam = teams.find((t) => t.id === roundData.stealTeamId);

  document.getElementById('disp-control').textContent = controlTeam ? controlTeam.name : '-';
  document.getElementById('disp-steal').textContent = stealTeam ? stealTeam.name : '-';

  // Render Scores
  const scoresContainer = document.getElementById('disp-scores');
  scoresContainer.innerHTML = teams
    .map((t) => {
      const isControl = t.id === roundData.controlTeamId;
      const isSteal = t.id === roundData.stealTeamId;
      const tag = isControl ? ' [KONTROL]' : isSteal ? ' [STEAL]' : '';
      return `<span style="display: inline-block; margin-right: 14px; padding: 2px 6px; background: #e5e7eb; border-left: 4px solid ${t.color};">
        <strong>${escapeHtml(t.name)}:</strong> ${gameState.scores[t.id] || 0} Poin${tag}
      </span>`;
    })
    .join('');

  // Update Select Team untuk Koreksi Skor
  const adjustSelect = document.getElementById('adjust-team-select');
  if (adjustSelect) {
    adjustSelect.innerHTML = teams
      .map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`)
      .join('');
  }

  // Papan Jawaban (Terbuka / Tertutup)
  const boardEl = document.getElementById('disp-answers-board');
  if (currentQ?.answers) {
    boardEl.innerHTML = currentQ.answers
      .map((ans) => {
        const isRevealed = roundData.revealedIds.includes(ans.id);
        const isAuto = roundData.autoRevealedIds.includes(ans.id);

        if (isRevealed) {
          return `<div style="padding: 6px 10px; background: #dcfce7; border: 1px solid #86efac; border-radius: 4px;">
            <strong>[TERBUKA]</strong> Peringkat #${ans.rank}: <strong>${escapeHtml(ans.answer_text)}</strong> &bull; ${ans.points} Poin
          </div>`;
        } else if (isAuto) {
          return `<div style="padding: 6px 10px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 4px;">
            <strong>[DIBUKA OTOMATIS]</strong> Peringkat #${ans.rank}: <em>${escapeHtml(ans.answer_text)}</em> &bull; ${ans.points} Poin
          </div>`;
        } else {
          return `<div style="padding: 6px 10px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; color: #6b7280;">
            [TERTUTUP] Peringkat #${ans.rank}: ??????????????? ( ${ans.points} Poin )
          </div>`;
        }
      })
      .join('');
  } else {
    boardEl.innerHTML = '<em>Tidak ada data jawaban.</em>';
  }

  // Render Matcher Suggestions
  renderMatcherSuggestions(currentQ);

  // Render Panel Aksi Dinamis
  renderDynamicActions(currentQ);

  // Utilitas Guru State
  const btnUndo = document.getElementById('btn-undo');
  if (btnUndo) {
    btnUndo.disabled = !canUndo(gameState);
  }
}

// 5. Matcher Suggestions
function renderMatcherSuggestions(currentQ) {
  const matcherInput = document.getElementById('matcher-input');
  const container = document.getElementById('matcher-suggestions');
  if (!currentQ?.answers || !container) return;

  const val = matcherInput ? matcherInput.value.trim() : '';
  if (!val) {
    container.innerHTML = '<small style="color: #6b7280;">Ketikkan jawaban untuk melihat saran pencocokan.</small>';
    return;
  }

  const suggestions = suggestMatches(val, currentQ.answers, gameState.roundData.revealedIds);

  if (suggestions.length === 0) {
    container.innerHTML = '<small style="color: #dc2626;">Tidak ada saran yang cocok.</small>';
    return;
  }

  container.innerHTML = suggestions
    .map((s, idx) => {
      return `<button type="button" class="btn-suggestion" data-answer-id="${s.answer.id}" style="margin: 2px 4px; padding: 4px 8px; font-size: 13px;">
        #${idx + 1} ${escapeHtml(s.answer.answer_text)} (${s.answer.points} pt) [Skor: ${s.score}]
      </button>`;
    })
    .join('');

  container.querySelectorAll('.btn-suggestion').forEach((btn) => {
    btn.addEventListener('click', () => {
      const answerId = btn.getAttribute('data-answer-id');
      handleSuggestedAnswerClick(answerId);
    });
  });
}

function handleSuggestedAnswerClick(answerId) {
  if (!gameState) return;
  const phase = gameState.phase;

  if (phase === 'FACE_OFF') {
    const turnTeam = gameState.roundData.faceOff.turnTeamId;
    if (turnTeam) {
      dispatch({ type: 'FACEOFF_ANSWER', teamId: turnTeam, answerId });
    } else {
      alert('Buzzer belum ditekan!');
    }
  } else if (phase === 'PLAYING') {
    dispatch({ type: 'REVEAL', answerId });
  } else if (phase === 'STEAL') {
    dispatch({ type: 'STEAL_ANSWER', answerId });
  } else {
    alert(`Aksi membuka jawaban tidak berlaku pada fase ${phase}.`);
  }
}

document.getElementById('matcher-input')?.addEventListener('input', () => {
  const currentQ = getCurrentQuestion(gameState);
  renderMatcherSuggestions(currentQ);
});

// 6. Dynamic Actions Panel
function renderDynamicActions(currentQ) {
  const container = document.getElementById('dynamic-actions');
  if (!container || !gameState) return;

  container.innerHTML = '';
  const phase = gameState.phase;
  const roundData = gameState.roundData;
  const teams = gameState.config.teams;

  if (phase === 'FACE_OFF') {
    const faceOff = roundData.faceOff;
    const teamA = teams.find((t) => t.id === faceOff.activeTeams[0]);
    const teamB = teams.find((t) => t.id === faceOff.activeTeams[1]);

    if (faceOff.waitingForChoice) {
      const winner = teams.find((t) => t.id === faceOff.winnerTeamId);
      container.innerHTML = `
        <div style="background: #e0f2fe; padding: 10px; border: 1px solid #7dd3fc;">
          <strong>${escapeHtml(winner?.name || 'Pemenang')}</strong> memenangkan Face-off!
          Pilih kontrol ronde:
          <button type="button" id="btn-choice-play" style="font-weight: bold; margin-left: 8px;">Main (PLAY)</button>
          <button type="button" id="btn-choice-pass" style="font-weight: bold; margin-left: 8px;">Oper (PASS)</button>
        </div>
      `;
      container.querySelector('#btn-choice-play')?.addEventListener('click', () => {
        dispatch({ type: 'CHOOSE_CONTROL', choice: 'play' });
      });
      container.querySelector('#btn-choice-pass')?.addEventListener('click', () => {
        dispatch({ type: 'CHOOSE_CONTROL', choice: 'pass' });
      });
      return;
    }

    if (faceOff.buzzTeamId) {
      const answeringTeam = teams.find((t) => t.id === faceOff.turnTeamId);
      const unrevealed = (currentQ?.answers || []).filter(
        (a) => !roundData.revealedIds.includes(a.id)
      );

      let answersBtns = unrevealed
        .map(
          (a) =>
            `<button type="button" class="btn-fo-ans" data-id="${a.id}" style="margin: 3px;">
              Jawab: ${escapeHtml(a.answer_text)}
            </button>`
        )
        .join('');

      container.innerHTML = `
        <div style="background: #fef08a; padding: 10px;">
          Giliran Menjawab: <strong>${escapeHtml(answeringTeam?.name || '')}</strong><br>
          <div style="margin-top: 6px;">${answersBtns}</div>
          <div style="margin-top: 8px;">
            <button type="button" id="btn-fo-wrong" style="color: #b91c1c;">Jawaban Salah / Waktu Habis</button>
          </div>
        </div>
      `;

      container.querySelectorAll('.btn-fo-ans').forEach((btn) => {
        btn.addEventListener('click', () => {
          const answerId = btn.getAttribute('data-id');
          dispatch({ type: 'FACEOFF_ANSWER', teamId: faceOff.turnTeamId, answerId });
        });
      });

      container.querySelector('#btn-fo-wrong')?.addEventListener('click', () => {
        dispatch({ type: 'FACEOFF_ANSWER', teamId: faceOff.turnTeamId, answerId: null });
      });
      return;
    }

    // Belum ada buzz
    container.innerHTML = `
      <div>
        <strong>Tekan Buzzer Face-off:</strong>
        <button type="button" id="btn-buzz-a" style="padding: 8px 16px; margin: 0 8px; font-weight: bold;">
          BUZZ: ${escapeHtml(teamA?.name || 'Tim A')}
        </button>
        <button type="button" id="btn-buzz-b" style="padding: 8px 16px; margin: 0 8px; font-weight: bold;">
          BUZZ: ${escapeHtml(teamB?.name || 'Tim B')}
        </button>
      </div>
    `;

    container.querySelector('#btn-buzz-a')?.addEventListener('click', () => {
      dispatch({ type: 'BUZZ', teamId: teamA?.id });
    });
    container.querySelector('#btn-buzz-b')?.addEventListener('click', () => {
      dispatch({ type: 'BUZZ', teamId: teamB?.id });
    });
    return;
  }

  if (phase === 'PLAYING') {
    const unrevealed = (currentQ?.answers || []).filter(
      (a) => !roundData.revealedIds.includes(a.id)
    );

    let revealBtns = unrevealed
      .map(
        (a) =>
          `<button type="button" class="btn-playing-reveal" data-id="${a.id}" style="margin: 3px;">
            Buka: ${escapeHtml(a.answer_text)}
          </button>`
      )
      .join('');

    container.innerHTML = `
      <div style="background: #f0fdf4; padding: 10px; border: 1px solid #bbf7d0;">
        <strong>Fase Bermain Tim Berkontrol.</strong> Buka jawaban yang benar:<br>
        <div style="margin: 6px 0;">${revealBtns}</div>
        <div style="margin-top: 8px;">
          <button type="button" id="btn-playing-strike" style="color: #dc2626; font-weight: bold;">+ Beri STRIKE (Jawaban Salah)</button>
          <button type="button" id="btn-playing-switch" style="margin-left: 10px;">Tukar Kontrol (SWITCH_CONTROL)</button>
        </div>
      </div>
    `;

    container.querySelectorAll('.btn-playing-reveal').forEach((btn) => {
      btn.addEventListener('click', () => {
        const answerId = btn.getAttribute('data-id');
        dispatch({ type: 'REVEAL', answerId });
      });
    });

    container.querySelector('#btn-playing-strike')?.addEventListener('click', () => {
      dispatch({ type: 'STRIKE' });
    });

    container.querySelector('#btn-playing-switch')?.addEventListener('click', () => {
      dispatch({ type: 'SWITCH_CONTROL' });
    });
    return;
  }

  if (phase === 'STEAL') {
    const stealTeam = teams.find((t) => t.id === roundData.stealTeamId);
    const unrevealed = (currentQ?.answers || []).filter(
      (a) => !roundData.revealedIds.includes(a.id)
    );

    let stealBtns = unrevealed
      .map(
        (a) =>
          `<button type="button" class="btn-steal-ans" data-id="${a.id}" style="margin: 3px;">
            Tebakan Steal: ${escapeHtml(a.answer_text)}
          </button>`
      )
      .join('');

    container.innerHTML = `
      <div style="background: #fef2f2; padding: 10px; border: 1px solid #fecaca;">
        <strong>FASE STEAL:</strong> Giliran <strong>${escapeHtml(stealTeam?.name || 'Tim Steal')}</strong> merebut pot!<br>
        <div style="margin: 6px 0;">${stealBtns}</div>
        <div style="margin-top: 8px;">
          <button type="button" id="btn-steal-fail" style="color: #dc2626; font-weight: bold;">Steal Gagal (Jawaban Salah / Lewat Waktu)</button>
        </div>
      </div>
    `;

    container.querySelectorAll('.btn-steal-ans').forEach((btn) => {
      btn.addEventListener('click', () => {
        const answerId = btn.getAttribute('data-id');
        dispatch({ type: 'STEAL_ANSWER', answerId });
      });
    });

    container.querySelector('#btn-steal-fail')?.addEventListener('click', () => {
      dispatch({ type: 'STEAL_ANSWER', answerId: null });
    });
    return;
  }

  if (phase === 'ROUND_END' || phase === 'REFLECTION') {
    const winner = teams.find((t) => t.id === roundData.winnerTeamId);
    const prompts = currentQ?.discussion_prompts || [];

    container.innerHTML = `
      <div style="background: #fdf4ff; padding: 12px; border: 1px solid #f0abfc;">
        <h3>Ronde Selesai!</h3>
        <p>Pemenang Ronde: <strong>${escapeHtml(winner?.name || 'Tidak ada pemenang')}</strong> &bull; Poin Diperoleh: <strong>${roundData.awardedPoints} Poin</strong></p>
        <div style="background: #fff; padding: 8px; border-left: 4px solid #a855f7; margin-bottom: 10px;">
          <strong>Catatan Refleksi BK:</strong><br>
          ${escapeHtml(currentQ?.reflection_note || '-')}<br><br>
          <strong>Pertanyaan Diskusi:</strong>
          <ul>${prompts.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </div>
        <button type="button" id="btn-next-round" style="padding: 8px 16px; font-weight: bold; background: #a855f7; color: #fff;">
          Lanjut ke Ronde Berikutnya (NEXT) &rarr;
        </button>
      </div>
    `;

    container.querySelector('#btn-next-round')?.addEventListener('click', () => {
      dispatch({ type: 'NEXT' });
    });
    return;
  }

  if (phase === 'FINAL_RESULT') {
    const winners = getWinners(gameState);
    const ranking = getRanking(gameState);

    const winnerNames = winners.map((w) => w.name).join(' & ');

    container.innerHTML = `
      <div style="background: #ecfdf5; padding: 14px; border: 2px solid #10b981;">
        <h2>Permainan Selesai! (FINAL RESULT)</h2>
        <h3>Juara: <span style="color: #059669;">${escapeHtml(winnerNames)}</span></h3>
        <ol>
          ${ranking.map((r) => `<li><strong>${escapeHtml(r.team.name)}</strong>: ${r.score} Poin (Peringkat ${r.rank})</li>`).join('')}
        </ol>
        <button type="button" id="btn-restart-game" style="padding: 8px 16px; font-weight: bold;">
          Mulai Permainan Baru
        </button>
      </div>
    `;

    container.querySelector('#btn-restart-game')?.addEventListener('click', () => {
      clearGame();
      window.location.reload();
    });
  }
}

// 7. Utilitas Guru Event Handlers
document.getElementById('btn-pause')?.addEventListener('click', () => {
  dispatch({ type: 'PAUSE' });
});

document.getElementById('btn-resume-game')?.addEventListener('click', () => {
  dispatch({ type: 'RESUME' });
});

document.getElementById('btn-undo')?.addEventListener('click', () => {
  dispatch({ type: 'UNDO' });
});

document.getElementById('btn-timer-expire')?.addEventListener('click', () => {
  dispatch({ type: 'TIMER_EXPIRED' });
});

document.getElementById('btn-force-finish')?.addEventListener('click', () => {
  if (confirm('Yakin ingin menyelesaikan ronde ini secara paksa?')) {
    dispatch({ type: 'FINISH_ROUND' });
  }
});

document.getElementById('btn-adjust-score')?.addEventListener('click', () => {
  const teamId = document.getElementById('adjust-team-select').value;
  const delta = Number(document.getElementById('adjust-delta').value) || 0;
  dispatch({ type: 'ADJUST_SCORE', teamId, delta });
});

init();
