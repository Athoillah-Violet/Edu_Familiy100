import {
  reduce,
  getCurrentQuestion,
  getFaceOffTeams,
  getRanking,
  getWinners,
  canUndo,
} from './lib/gameEngine.js';
import { loadGame, saveGame } from './lib/gameStore.js';
import { finishGameSession } from './lib/sessionReport.js';
import { suggestMatches } from './lib/matcher.js';
import { audio } from './lib/audio.js';
import { confirmModal, showToast } from './lib/components.js';
import { escapeHtml } from './lib/ui.js';

let state = null;
let timerInterval = null;
let currentTimerSeconds = 0;
let isTeacherPanelOpen = false;

// Audio context unlock on first user gesture
let audioUnlocked = false;
function ensureAudio() {
  if (!audioUnlocked) {
    audioUnlocked = true;
    audio.play('click');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Add audio unlock to window click
  window.addEventListener('click', ensureAudio, { once: true });
  window.addEventListener('keydown', ensureAudio, { once: true });

  const loaded = loadGame();
  if (!loaded) {
    document.getElementById('no-game-overlay')?.classList.remove('hidden');
    return;
  }

  state = loaded;

  // If already at final result, redirect to result.html
  if (state.phase === 'FINAL_RESULT') {
    window.location.href = '/result.html';
    return;
  }

  setupEventListeners();
  setupKeyboardShortcuts();
  renderAll();
  startTimerForPhase();
});

function dispatch(action) {
  if (!state) return;

  const result = reduce(state, action);
  state = result.state;
  saveGame(state);

  // Handle events from reduce for audio, animations, and transitions
  handleEvents(result.events || []);

  renderAll();

  // If final result reached, trigger session completion
  if (state.phase === 'FINAL_RESULT') {
    stopTimer();
    audio.play('finished');
    finishGameSession(state)
      .catch((err) => console.warn('Session finish warning:', err))
      .finally(() => {
        setTimeout(() => {
          window.location.href = '/result.html';
        }, 1200);
      });
  } else {
    // Reset/start timer according to active phase
    startTimerForPhase();
  }
}

function handleEvents(events) {
  for (const ev of events) {
    switch (ev.type) {
      case 'ANSWER_REVEALED':
      case 'STEAL_SUCCESS':
        audio.play('reveal');
        setTimeout(() => audio.play('correct'), 150);
        break;

      case 'STRIKE':
        audio.play('wrong');
        showStrikeAnimation();
        break;

      case 'STEAL_FAILED':
        audio.play('wrong');
        showStrikeAnimation();
        break;

      case 'HUNTING_TEAM_SELECTED': {
        const team = state.config.teams.find((t) => t.id === ev.teamId);
        showToast(`Giliran ${team?.name || 'Tim'} berburu poin!`, 'info');
        break;
      }

      case 'HUNTING_TURN_ENDED': {
        const team = state.config.teams.find((t) => t.id === ev.teamId);
        if (ev.reason === 'max_strikes') {
          showToast(`Batas strike tercapai! Giliran ${team?.name || 'Tim'} selesai.`, 'warning');
        } else if (ev.reason === 'time_expired') {
          showToast(`Waktu habis! Giliran ${team?.name || 'Tim'} selesai.`, 'warning');
        } else {
          showToast(`Giliran ${team?.name || 'Tim'} selesai.`, 'info');
        }
        break;
      }

      case 'CONTROL_WON': {
        const winner = state.config.teams.find((t) => t.id === ev.teamId);
        audio.play('correct');
        showToast(`${winner?.name || 'Tim'} memenangkan rebutan!`, 'success');
        break;
      }

      case 'TURN_SWITCHED': {
        const nextTeam = state.config.teams.find((t) => t.id === ev.teamId);
        const firstAns = state.roundData?.faceOff?.firstAnswer;
        if (firstAns && firstAns.valid) {
          showToast(
            `Bukan peringkat #1! Giliran ${nextTeam?.name || 'lawan'} menebak lebih tinggi.`,
            'info'
          );
        } else {
          showToast(`Giliran ${nextTeam?.name || 'lawan'} menjawab.`, 'info');
        }
        break;
      }

      case 'FACEOFF_RESET':
        audio.play('wrong');
        showToast('Kedua tim salah menjawab. Rebutan diulang!', 'warning');
        break;

      case 'WRONG_ANSWER':
        audio.play('wrong');
        break;

      case 'ROUND_ENDED':
        audio.play('finished');
        break;

      case 'IGNORED':
        if (ev.reason) {
          showToast(ev.reason, 'warning');
        }
        break;

      default:
        break;
    }
  }
}

function showStrikeAnimation() {
  const overlay = document.getElementById('strike-overlay');
  if (!overlay) return;

  overlay.classList.remove('hidden');
  overlay.classList.remove('opacity-0');
  setTimeout(() => {
    overlay.classList.add('opacity-0');
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 200);
  }, 750);
}

// Timer Logic
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimerForPhase() {
  stopTimer();

  const cfgTimer = Number(state?.config?.timerSeconds) || 0;
  if (cfgTimer <= 0) {
    updateTimerDisplay(0, 0);
    return;
  }

  // Timer is active during FACE_OFF (after buzz) or PLAYING or STEAL or HUNTING_PLAY
  const isTurnActive =
    !state.paused &&
    (state.phase === 'PLAYING' ||
      state.phase === 'STEAL' ||
      state.phase === 'HUNTING_PLAY' ||
      (state.phase === 'FACE_OFF' && state.roundData?.faceOff?.turnTeamId));

  if (!isTurnActive) {
    updateTimerDisplay(0, cfgTimer);
    return;
  }

  currentTimerSeconds = cfgTimer;
  updateTimerDisplay(currentTimerSeconds, cfgTimer);

  timerInterval = setInterval(() => {
    if (state.paused) return;

    currentTimerSeconds--;
    updateTimerDisplay(currentTimerSeconds, cfgTimer);

    if (currentTimerSeconds <= 5 && currentTimerSeconds > 0) {
      audio.play('tick');
    }

    if (currentTimerSeconds <= 0) {
      stopTimer();
      audio.play('wrong');
      dispatch({ type: 'TIMER_EXPIRED' });
    }
  }, 1000);
}

function updateTimerDisplay(remaining, max) {
  const container = document.getElementById('timer-container');
  const bar = document.getElementById('timer-bar');
  const text = document.getElementById('timer-text');
  if (!container || !bar || !text) return;

  if (max <= 0) {
    container.classList.add('opacity-30');
    text.textContent = 'Mati';
    bar.style.width = '100%';
    bar.className = 'h-full bg-slate-300 transition-all';
    return;
  }

  container.classList.remove('opacity-30');
  text.textContent = `${Math.max(0, remaining)}s`;
  const pct = Math.max(0, Math.min(100, (remaining / max) * 100));
  bar.style.width = `${pct}%`;

  if (remaining <= 5 && remaining > 0) {
    bar.className = 'h-full bg-red-500 transition-all duration-300';
    text.className = 'text-xs font-bold text-red-600 animate-pulse';
  } else {
    bar.className = 'h-full bg-indigo-600 transition-all duration-300';
    text.className = 'text-xs font-bold text-slate-700';
  }
}

// Rendering
function renderAll() {
  if (!state) return;

  renderHeader();
  renderNowWhatBanner();
  renderQuestionAndBoard();
  renderTeamsScoreboard();
  renderTeacherPanel();
  renderReflectionModal();
  renderPauseState();
}

function renderHeader() {
  const roundEl = document.getElementById('header-round');
  const modeBadge = document.getElementById('header-mode-badge');
  const multBadge = document.getElementById('header-multiplier');
  const potEl = document.getElementById('header-pot');

  if (roundEl) {
    roundEl.textContent = `Ronde ${state.roundIndex + 1} dari ${state.questions.length}`;
  }
  if (modeBadge) {
    const isHunting = state.config?.gameMode === 'hunting';
    modeBadge.textContent = isHunting ? 'Mode Hunting Poin' : 'Mode Family 100';
    modeBadge.className = isHunting
      ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200';
  }
  if (multBadge) {
    const q = getCurrentQuestion(state);
    const m = state.config.multiplierEnabled && q ? q.multiplier || 1 : 1;
    multBadge.textContent = `x${m}`;
    multBadge.className =
      m > 1
        ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300'
        : 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200';
  }
  if (potEl) {
    if (state.config?.gameMode === 'hunting') {
      potEl.textContent = 'Langsung Masuk';
    } else {
      potEl.textContent = `${state.roundData?.pot || 0} Poin`;
    }
  }

  // Update Mute Button icon
  const muteBtn = document.getElementById('btn-mute');
  if (muteBtn) {
    muteBtn.textContent = audio.isMuted() ? '🔇 Suara Mati' : '🔊 Suara';
  }

  // Update Pause Button text
  const pauseBtn = document.getElementById('btn-pause');
  if (pauseBtn) {
    pauseBtn.textContent = state.paused ? '▶ Lanjutkan' : '⏸ Jeda';
  }
}

function renderNowWhatBanner() {
  const banner = document.getElementById('now-what-banner');
  const bannerText = document.getElementById('now-what-text');
  const bannerAction = document.getElementById('now-what-action');
  if (!banner || !bannerText || !bannerAction) return;

  bannerAction.innerHTML = '';

  const roundData = state.roundData || {};
  const currentQ = getCurrentQuestion(state);

  switch (state.phase) {
    case 'FACE_OFF': {
      const faceOff = roundData.faceOff || {};
      const pair = getFaceOffTeams(state.config, state.roundIndex);
      const teamAName = pair.teamA?.name || 'Tim 1';
      const teamBName = pair.teamB?.name || 'Tim 2';

      if (faceOff.waitingForChoice) {
        const winner = state.config.teams.find((t) => t.id === faceOff.winnerTeamId);
        bannerText.innerHTML = `🏆 <strong class="text-indigo-900">${escapeHtml(
          winner?.name || 'Pemenang'
        )}</strong> memenangkan rebutan! Silakan pilih: Mainkan atau Oper kontrol.`;

        bannerAction.innerHTML = `
          <div class="flex items-center space-x-2">
            <button id="btn-choice-play" class="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm">
              Mainkan Ronde Ini
            </button>
            <button id="btn-choice-pass" class="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 shadow-sm">
              Oper ke Lawan
            </button>
          </div>
        `;
        bannerAction.querySelector('#btn-choice-play')?.addEventListener('click', () => {
          dispatch({ type: 'CHOOSE_CONTROL', choice: 'play' });
        });
        bannerAction.querySelector('#btn-choice-pass')?.addEventListener('click', () => {
          dispatch({ type: 'CHOOSE_CONTROL', choice: 'pass' });
        });
      } else if (!faceOff.buzzTeamId) {
        bannerText.innerHTML = `⚔️ <strong>Rebutan!</strong> Siapa paling cepat antara <strong>${escapeHtml(
          teamAName
        )}</strong> vs <strong>${escapeHtml(
          teamBName
        )}</strong>? Tekan tombol tim (atau tombol A / L / S / K), lalu klik jawaban yang ditebak.`;
      } else if (faceOff.turnTeamId) {
        const turnTeam = state.config.teams.find((t) => t.id === faceOff.turnTeamId);
        const firstAns = faceOff.firstAnswer;

        if (firstAns) {
          const firstTeam = state.config.teams.find((t) => t.id === firstAns.teamId);
          if (firstAns.valid) {
            bannerText.innerHTML = `🔄 Jawaban <strong>${escapeHtml(
              firstTeam?.name || 'Tim'
            )}</strong> peringkat #${firstAns.rank} (${firstAns.points} Poin, bukan #1 teratas). <strong>${escapeHtml(
              turnTeam?.name || 'Lawan'
            )}</strong> mendapat 1 kesempatan menebak jawaban lebih tinggi! Klik kartu atau tekan "Jawaban Salah".`;
          } else {
            bannerText.innerHTML = `❌ Jawaban <strong>${escapeHtml(
              firstTeam?.name || 'Tim'
            )}</strong> salah! Giliran <strong>${escapeHtml(
              turnTeam?.name || 'Lawan'
            )}</strong> menjawab untuk merebut kontrol. Klik kartu atau tekan "Jawaban Salah".`;
          }
        } else {
          bannerText.innerHTML = `🎤 Giliran <strong>${escapeHtml(
            turnTeam?.name || 'Tim'
          )}</strong> menjawab (bel tercepat)! Klik kartu atau saran jawaban. Jika salah, tekan "Jawaban Salah".`;
        }
      }
      break;
    }

    case 'PLAYING': {
      const controlTeam = state.config.teams.find((t) => t.id === roundData.controlTeamId);
      const strikes = roundData.strikes || 0;
      const maxStrikes = state.config.maxStrikes || 3;
      bannerText.innerHTML = `🎯 Giliran <strong>${escapeHtml(
        controlTeam?.name || 'Tim'
      )}</strong>. Klik kartu bila jawaban siswa benar, atau tekan Strike bila salah. <span class="ml-2 font-bold text-red-600">Strike: ${strikes}/${maxStrikes}</span>`;
      break;
    }

    case 'HUNTING_SELECT': {
      const huntingTurnsPlayed = roundData.huntingTurnsPlayed || [];
      const remainingTeams = (state.config?.teams || []).filter(
        (t) => !huntingTurnsPlayed.includes(t.id)
      );

      bannerText.innerHTML = `🎯 <strong>Mode Hunting Poin:</strong> Silakan pilih tim yang akan berburu poin di ronde ini:`;

      bannerAction.innerHTML = `
        <div class="flex items-center space-x-2 flex-wrap gap-1.5">
          ${remainingTeams
            .map(
              (t) => `
            <button type="button" class="btn-select-hunting px-3 py-1 text-white rounded-lg text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all" style="background-color: ${escapeHtml(
              t.color || '#4f46e5'
            )};" data-team-id="${escapeHtml(t.id)}">
              Giliran ${escapeHtml(t.name)} &rarr;
            </button>
          `
            )
            .join('')}
        </div>
      `;

      bannerAction.querySelectorAll('.btn-select-hunting').forEach((btn) => {
        btn.addEventListener('click', () => {
          const teamId = btn.dataset.teamId;
          dispatch({ type: 'SELECT_HUNTING_TEAM', teamId });
        });
      });
      break;
    }

    case 'HUNTING_PLAY': {
      const activeTeam = state.config?.teams?.find(
        (t) => t.id === roundData.currentHuntingTeamId
      );
      const strikes = roundData.strikes || 0;
      const maxStrikes = state.config.maxStrikes || 3;

      bannerText.innerHTML = `🏹 <strong>Mode Hunting:</strong> Giliran <strong>${escapeHtml(
        activeTeam?.name || 'Tim'
      )}</strong>! Sebutkan jawaban, klik kartu atau ketik di depan. Poin langsung masuk. <span class="ml-2 font-bold text-red-600">Strike: ${strikes}/${maxStrikes}</span>`;

      bannerAction.innerHTML = `
        <button id="btn-hunting-pass" type="button" class="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 shadow-sm transition-colors">
          Oper ke Tim Lain &rarr;
        </button>
      `;

      bannerAction.querySelector('#btn-hunting-pass')?.addEventListener('click', () => {
        dispatch({ type: 'PASS_HUNTING_TURN' });
      });
      break;
    }

    case 'STEAL': {
      const stealTeam = state.config.teams.find((t) => t.id === roundData.stealTeamId);
      bannerText.innerHTML = `⚡ <strong>Kesempatan Merebut untuk ${escapeHtml(
        stealTeam?.name || 'Tim Lawan'
      )}!</strong> Satu jawaban saja. Benar = seluruh ${roundData.pot || 0} poin berpindah!`;
      break;
    }

    case 'ROUND_END': {
      const winTeam = state.config.teams.find((t) => t.id === roundData.winnerTeamId);
      bannerText.innerHTML = `🏁 <strong>Ronde Selesai!</strong> ${
        winTeam ? escapeHtml(winTeam.name) : 'Tidak ada tim'
      } memperoleh <strong>${roundData.awardedPoints || 0} poin</strong>.`;
      break;
    }

    case 'REFLECTION': {
      bannerText.innerHTML = `🌱 <strong>Saatnya Refleksi &amp; Diskusi Bersama.</strong> Bahas pesan karakter dan pertanyaan panduan bersama siswa.`;
      bannerAction.innerHTML = `
        <button id="btn-open-reflection" class="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm">
          Buka Lembar Refleksi BK &rarr;
        </button>
      `;
      bannerAction.querySelector('#btn-open-reflection')?.addEventListener('click', () => {
        const overlay = document.getElementById('reflection-overlay');
        overlay?.classList.remove('hidden');
      });
      break;
    }

    case 'FINAL_RESULT': {
      bannerText.innerHTML = `🎉 <strong>Permainan Selesai!</strong> Mengalihkan ke ringkasan hasil akhir...`;
      break;
    }

    default:
      bannerText.textContent = '';
      break;
  }
}

function renderQuestionAndBoard() {
  const currentQ = getCurrentQuestion(state);
  const qTextEl = document.getElementById('question-text');
  if (qTextEl) {
    qTextEl.textContent = currentQ ? currentQ.question_text : 'Memuat pertanyaan...';
  }

  const boardEl = document.getElementById('answer-board');
  if (!boardEl || !currentQ) return;

  const answers = Array.isArray(currentQ.answers) ? currentQ.answers : [];
  const revealedSet = new Set(state.roundData?.revealedIds || []);
  const autoRevealedSet = new Set(state.roundData?.autoRevealedIds || []);

  // Update or render cards in grid
  let existingCards = boardEl.querySelectorAll('.answer-card');
  const needsRebuild =
    boardEl.dataset.questionId !== String(currentQ.id) ||
    boardEl.dataset.roundIndex !== String(state.roundIndex) ||
    existingCards.length !== answers.length;

  if (needsRebuild) {
    boardEl.dataset.questionId = String(currentQ.id);
    boardEl.dataset.roundIndex = String(state.roundIndex);

    // Generate board structure for this question
    boardEl.innerHTML = answers
      .map((ans, idx) => {
        return `
        <div class="answer-card group relative bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm flex items-center justify-between cursor-pointer select-none transition-all duration-150 min-h-[58px]" data-answer-id="${escapeHtml(
          ans.id
        )}">
          <!-- Closed State -->
          <div class="closed-view w-full flex items-center justify-center">
            <span class="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              ${idx + 1}
            </span>
          </div>

          <!-- Revealed State -->
          <div class="revealed-view hidden w-full items-center justify-between">
            <div class="flex items-center space-x-2 mr-2">
              <span class="ans-number text-xs font-bold text-slate-400">#${idx + 1}</span>
              <span class="ans-text font-bold text-sm sm:text-base text-slate-900 leading-tight"></span>
            </div>
            <span class="ans-points px-2.5 py-1 rounded-md text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200"></span>
          </div>
        </div>
      `;
      })
      .join('');

    // Attach card click handlers
    boardEl.querySelectorAll('.answer-card').forEach((card) => {
      card.addEventListener('click', () => {
        const answerId = card.dataset.answerId;
        handleCardClick(answerId);
      });
    });

    existingCards = boardEl.querySelectorAll('.answer-card');
  }

  // Update card classes and visibility without rebuilding the DOM
  answers.forEach((ans, idx) => {
    const card = existingCards[idx];
    if (!card) return;

    // Always ensure current answer ID is bound to the element
    card.dataset.answerId = ans.id;

    const isRevealed = revealedSet.has(ans.id);
    const isAutoRevealed = autoRevealedSet.has(ans.id);

    const closedView = card.querySelector('.closed-view');
    const revealedView = card.querySelector('.revealed-view');
    const textEl = card.querySelector('.ans-text');
    const pointsEl = card.querySelector('.ans-points');

    if (isRevealed || isAutoRevealed) {
      closedView?.classList.add('hidden');
      revealedView?.classList.remove('hidden');
      revealedView?.classList.add('flex');

      if (textEl) textEl.textContent = ans.answer_text;
      if (pointsEl) {
        if (isAutoRevealed) {
          pointsEl.textContent = '0 Pts';
          pointsEl.className =
            'ans-points px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200 line-through';
        } else {
          pointsEl.textContent = `${ans.points} Pts`;
          pointsEl.className =
            'ans-points px-2.5 py-1 rounded-md text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200';
        }
      }

      if (isAutoRevealed) {
        card.className =
          'answer-card bg-slate-50/80 border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm flex items-center justify-between opacity-60';
      } else {
        card.className =
          'answer-card bg-indigo-50/40 border border-indigo-200 rounded-xl p-3 sm:p-4 shadow-sm flex items-center justify-between';
      }
    } else {
      closedView?.classList.remove('hidden');
      revealedView?.classList.add('hidden');
      revealedView?.classList.remove('flex');
      card.className =
        'answer-card group relative bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-all min-h-[58px]';
    }
  });
}

let isProcessingCardClick = false;

function handleCardClick(answerId) {
  if (state.paused) return;
  if (isProcessingCardClick) return;

  isProcessingCardClick = true;
  setTimeout(() => {
    isProcessingCardClick = false;
  }, 350);

  const currentQ = getCurrentQuestion(state);
  const revealedSet = new Set(state.roundData?.revealedIds || []);
  if (revealedSet.has(answerId)) {
    showToast('Jawaban ini sudah terbuka.', 'info');
    return;
  }

  switch (state.phase) {
    case 'FACE_OFF': {
      const faceOff = state.roundData?.faceOff || {};
      if (!faceOff.turnTeamId) {
        showToast('Tekan tombol bel (buzz) tim terlebih dahulu!', 'warning');
        return;
      }
      dispatch({ type: 'FACEOFF_ANSWER', teamId: faceOff.turnTeamId, answerId });
      break;
    }

    case 'PLAYING':
    case 'HUNTING_PLAY': {
      dispatch({ type: 'REVEAL', answerId });
      break;
    }

    case 'HUNTING_SELECT': {
      showToast('Pilih tim yang akan berburu poin terlebih dahulu di banner atas!', 'warning');
      break;
    }

    case 'STEAL': {
      dispatch({ type: 'STEAL_ANSWER', answerId });
      break;
    }

    default:
      break;
  }
}

function renderTeamsScoreboard() {
  const container = document.getElementById('teams-scoreboard');
  if (!container) return;

  const teams = state.config?.teams || [];
  const scores = state.scores || {};
  const roundData = state.roundData || {};
  const controlTeamId = roundData.controlTeamId;
  const stealTeamId = roundData.stealTeamId;
  const faceOff = roundData.faceOff || {};
  const isHuntingMode = state.config?.gameMode === 'hunting';
  const currentHuntingTeamId = roundData.currentHuntingTeamId;
  const huntingTurnsPlayed = roundData.huntingTurnsPlayed || [];

  container.innerHTML = teams
    .map((team, idx) => {
      const keyShortcuts = ['A', 'L', 'S', 'K'];
      const shortcutKey = keyShortcuts[idx] || '';

      let statusBadge = '';
      let borderHighlight = 'border-slate-200';
      let buttonHtml = '';

      if (isHuntingMode) {
        const isHuntingActive = team.id === currentHuntingTeamId && state.phase === 'HUNTING_PLAY';
        const hasPlayedThisRound = huntingTurnsPlayed.includes(team.id);

        if (isHuntingActive) {
          statusBadge = '<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-600 text-white animate-pulse">Berburu Poin</span>';
          borderHighlight = 'border-emerald-600 ring-2 ring-emerald-500/30';
          buttonHtml = `<div class="mt-2 py-1 text-center text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded border border-emerald-200">Sedang Menebak</div>`;
        } else if (hasPlayedThisRound) {
          statusBadge = '<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">Selesai Giliran</span>';
          buttonHtml = `<div class="mt-2 py-1 text-center text-[10px] font-medium text-slate-400 bg-slate-50 rounded border border-slate-100">Giliran Selesai</div>`;
        } else if (state.phase === 'HUNTING_SELECT') {
          statusBadge = '<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Menunggu</span>';
          buttonHtml = `<button type="button" class="btn-select-hunting-card mt-2 w-full py-1.5 rounded-lg text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-transform" style="background-color: ${escapeHtml(
            team.color || '#4f46e5'
          )};" data-team-id="${escapeHtml(team.id)}">Pilih Tim Ini</button>`;
        }
      } else {
        const isControl = team.id === controlTeamId && state.phase === 'PLAYING';
        const isSteal = team.id === stealTeamId && state.phase === 'STEAL';
        const isTurn = team.id === faceOff.turnTeamId && state.phase === 'FACE_OFF';

        if (isControl) {
          statusBadge = '<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-600 text-white">Giliran</span>';
          borderHighlight = 'border-indigo-600 ring-2 ring-indigo-500/30';
        } else if (isSteal) {
          statusBadge = '<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500 text-white">Kesempatan Merebut</span>';
          borderHighlight = 'border-amber-500 ring-2 ring-amber-400/30';
        } else if (isTurn) {
          if (faceOff.firstAnswer) {
            statusBadge = '<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-600 text-white animate-pulse">Kesempatan Rebut</span>';
            borderHighlight = 'border-amber-600 ring-2 ring-amber-500/30';
          } else {
            statusBadge = '<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-600 text-white animate-pulse">Menjawab Bel</span>';
            borderHighlight = 'border-emerald-600 ring-2 ring-emerald-500/30';
          }
        } else if (state.phase === 'FACE_OFF' && faceOff.firstAnswer && team.id === faceOff.firstAnswer.teamId) {
          const rankText = faceOff.firstAnswer.valid ? `#${faceOff.firstAnswer.rank} (${faceOff.firstAnswer.points} Poin)` : 'Salah';
          statusBadge = `<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">Tebakan: ${rankText}</span>`;
        }

        const isActiveFaceOffTeam =
          !faceOff.activeTeams || faceOff.activeTeams.includes(team.id);
        const showBuzzBtn =
          state.phase === 'FACE_OFF' &&
          isActiveFaceOffTeam &&
          !faceOff.turnTeamId &&
          !faceOff.waitingForChoice;

        if (showBuzzBtn) {
          buttonHtml = `<button type="button" class="btn-buzz mt-2 w-full py-1.5 rounded-lg text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-transform" style="background-color: ${escapeHtml(
            team.color
          )};" data-team-id="${escapeHtml(team.id)}">
            Bel [${shortcutKey}]
          </button>`;
        } else if (state.phase === 'FACE_OFF' && !isActiveFaceOffTeam && !faceOff.turnTeamId) {
          buttonHtml = `<div class="mt-2 py-1 text-center text-[10px] font-medium text-slate-400 bg-slate-50 rounded border border-slate-100">
            Menonton Rebutan
          </div>`;
        }
      }

      return `
      <div class="bg-white rounded-xl border p-3 flex flex-col justify-between shadow-sm transition-all relative ${borderHighlight}">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center space-x-2">
            <span class="w-3.5 h-3.5 rounded-full" style="background-color: ${escapeHtml(team.color)};"></span>
            <span class="text-xs font-bold text-slate-800 truncate max-w-[110px]">${escapeHtml(team.name)}</span>
          </div>
          ${statusBadge}
        </div>

        <div class="flex items-baseline justify-between mt-2">
          <span class="text-2xl font-extrabold text-slate-900">${scores[team.id] || 0}</span>
          <span class="text-[11px] text-slate-400 font-semibold">Poin</span>
        </div>

        ${buttonHtml}
      </div>
    `;
    })
    .join('');

  // Attach Buzz buttons
  container.querySelectorAll('.btn-buzz').forEach((btn) => {
    btn.addEventListener('click', () => {
      const teamId = btn.dataset.teamId;
      dispatch({ type: 'BUZZ', teamId });
    });
  });

  // Attach Hunting card buttons
  container.querySelectorAll('.btn-select-hunting-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const teamId = btn.dataset.teamId;
      dispatch({ type: 'SELECT_HUNTING_TEAM', teamId });
    });
  });
}

function renderTeacherPanel() {
  const panel = document.getElementById('teacher-panel');
  if (!panel) return;

  if (isTeacherPanelOpen) {
    panel.classList.remove('translate-x-full');
  } else {
    panel.classList.add('translate-x-full');
  }

  // Undo button state
  const undoBtn = document.getElementById('tp-btn-undo');
  if (undoBtn) {
    undoBtn.disabled = !canUndo(state);
  }

  // Switch control button (PLAYING only)
  const switchCtrlBtn = document.getElementById('tp-btn-switch-control');
  if (switchCtrlBtn) {
    switchCtrlBtn.disabled = state.phase !== 'PLAYING';
  }

  // Render unrevealed answers for blurred peek area
  const currentQ = getCurrentQuestion(state);
  const peekContainer = document.getElementById('tp-peek-answers');
  if (peekContainer && currentQ) {
    const revealedSet = new Set(state.roundData?.revealedIds || []);
    const unrevealed = (currentQ.answers || []).filter((a) => !revealedSet.has(a.id));

    peekContainer.innerHTML = unrevealed
      .map(
        (a) => `
        <div class="text-[11px] py-1 border-b border-slate-100 flex items-center justify-between">
          <span class="font-medium text-slate-700">${escapeHtml(a.answer_text)}</span>
          <span class="font-bold text-amber-700">${a.points} Pts</span>
        </div>
      `
      )
      .join('');
  }
}

function renderReflectionModal() {
  const overlay = document.getElementById('reflection-overlay');
  if (!overlay) return;

  if (state.phase === 'REFLECTION') {
    overlay.classList.remove('hidden');

    const currentQ = getCurrentQuestion(state);
    const noteEl = document.getElementById('reflection-note-text');
    const promptsEl = document.getElementById('reflection-prompts-list');
    const nextBtn = document.getElementById('btn-reflection-next');

    if (noteEl) {
      noteEl.textContent =
        currentQ?.reflection_note || 'Diskusikan bersama siswa nilai positif dan pemahaman karakter dari topik ini.';
    }

    if (promptsEl) {
      const prompts = Array.isArray(currentQ?.discussion_prompts) ? currentQ.discussion_prompts : [];
      if (prompts.length > 0) {
        promptsEl.innerHTML = prompts
          .map(
            (p) => `
            <li class="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl font-bold text-indigo-950 text-base sm:text-lg leading-relaxed">
              &bull; ${escapeHtml(p)}
            </li>
          `
          )
          .join('');
      } else {
        promptsEl.innerHTML = '<li class="text-sm text-slate-400 italic">Tidak ada pertanyaan panduan.</li>';
      }
    }

    if (nextBtn) {
      const isLastRound = state.roundIndex >= state.questions.length - 1;
      nextBtn.textContent = isLastRound ? 'Lihat Hasil Akhir Permainan &rarr;' : 'Lanjut ke Ronde Berikutnya &rarr;';
    }
  } else {
    overlay.classList.add('hidden');
  }
}

function renderPauseState() {
  const pauseOverlay = document.getElementById('pause-overlay');
  if (pauseOverlay) {
    if (state.paused) {
      pauseOverlay.classList.remove('hidden');
    } else {
      pauseOverlay.classList.add('hidden');
    }
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Pause / Resume
  document.getElementById('btn-pause')?.addEventListener('click', () => {
    dispatch({ type: state.paused ? 'RESUME' : 'PAUSE' });
  });
  document.getElementById('btn-resume-overlay')?.addEventListener('click', () => {
    dispatch({ type: 'RESUME' });
  });

  // Mute / Unmute
  document.getElementById('btn-mute')?.addEventListener('click', () => {
    audio.toggleMute();
    renderHeader();
  });

  // Fullscreen
  document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Help Modal (?)
  document.getElementById('btn-help')?.addEventListener('click', () => {
    document.getElementById('help-modal')?.classList.remove('hidden');
  });
  document.getElementById('btn-close-help')?.addEventListener('click', () => {
    document.getElementById('help-modal')?.classList.add('hidden');
  });

  // Exit Game Confirmation
  document.getElementById('btn-exit')?.addEventListener('click', async () => {
    const confirmed = await confirmModal(
      'Apakah Anda yakin ingin keluar dari arena permainan? Permainan yang belum selesai tersimpan otomatis dan dapat dilanjutkan nanti.',
      {
        title: 'Keluar ke Beranda',
        confirmText: 'Keluar Permainan',
        isDanger: true,
      }
    );
    if (confirmed) {
      window.location.href = '/index.html';
    }
  });

  // Teacher Panel Toggle
  document.getElementById('btn-toggle-teacher')?.addEventListener('click', () => {
    isTeacherPanelOpen = !isTeacherPanelOpen;
    renderTeacherPanel();
  });
  document.getElementById('btn-close-tp')?.addEventListener('click', () => {
    isTeacherPanelOpen = false;
    renderTeacherPanel();
  });

  // Peek Key Button (Hold to unblur)
  const peekBtn = document.getElementById('tp-btn-peek');
  const peekAnswers = document.getElementById('tp-peek-answers');
  if (peekBtn && peekAnswers) {
    const revealPeek = () => {
      peekAnswers.classList.remove('blur-md');
    };
    const hidePeek = () => {
      peekAnswers.classList.add('blur-md');
    };
    peekBtn.addEventListener('mousedown', revealPeek);
    peekBtn.addEventListener('mouseup', hidePeek);
    peekBtn.addEventListener('mouseleave', hidePeek);
    peekBtn.addEventListener('touchstart', revealPeek);
    peekBtn.addEventListener('touchend', hidePeek);
  }

  // Front Guess Form (Input tebakan siswa di depan kelas, tanpa bocoran kunci jawaban)
  const frontGuessForm = document.getElementById('front-guess-form');
  const frontGuessInput = document.getElementById('front-guess-input');

  frontGuessForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.paused) return;

    const val = frontGuessInput?.value.trim();
    if (!val || !state) return;

    const currentQ = getCurrentQuestion(state);
    if (!currentQ) return;

    // Cari kecocokan menggunakan matcher (ambang batas >= 60 untuk toleransi typo/kemiripan)
    const matches = suggestMatches(val, currentQ.answers || [], state.roundData?.revealedIds || []);

    if (matches.length > 0 && matches[0].score >= 60) {
      const matchedAns = matches[0].answer;
      frontGuessInput.value = '';
      showToast(`Jawaban cocok! "${matchedAns.answer_text}" (${matches[0].score}%)`, 'success');
      handleCardClick(matchedAns.id);
    } else {
      audio.play('wrong');
      showToast(`Tebakan "${val}" tidak cocok di papan survei.`, 'warning');
    }
  });

  // Teacher Panel: Search suggestions
  const searchInput = document.getElementById('tp-search-input');
  const suggestionsBox = document.getElementById('tp-suggestions-box');
  searchInput?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (!val || !state) {
      if (suggestionsBox) suggestionsBox.innerHTML = '';
      return;
    }

    const currentQ = getCurrentQuestion(state);
    if (!currentQ) return;

    const matches = suggestMatches(val, currentQ.answers || [], state.roundData?.revealedIds || []);
    if (matches.length === 0) {
      suggestionsBox.innerHTML = '<div class="text-[11px] text-slate-400 p-2">Tidak ada kecocokan jawaban.</div>';
      return;
    }

    suggestionsBox.innerHTML = matches
      .slice(0, 5)
      .map(
        (m) => `
        <button type="button" class="btn-select-suggestion w-full text-left p-2 hover:bg-indigo-50 border-b border-slate-100 flex items-center justify-between text-xs transition-colors" data-answer-id="${escapeHtml(
          m.answer.id
        )}">
          <span class="font-bold text-slate-800">${escapeHtml(m.answer.answer_text)}</span>
          <span class="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] border border-amber-200">${
            m.answer.points
          } Pts (${m.score}%)</span>
        </button>
      `
      )
      .join('');

    suggestionsBox.querySelectorAll('.btn-select-suggestion').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.answerId;
        searchInput.value = '';
        suggestionsBox.innerHTML = '';
        handleCardClick(id);
      });
    });
  });

  // Teacher Panel: Wrong Answer / Strike button
  document.getElementById('tp-btn-wrong')?.addEventListener('click', () => {
    switch (state.phase) {
      case 'FACE_OFF': {
        const faceOff = state.roundData?.faceOff || {};
        if (faceOff.turnTeamId) {
          dispatch({ type: 'FACEOFF_ANSWER', teamId: faceOff.turnTeamId, answerId: null });
        }
        break;
      }
      case 'PLAYING':
      case 'HUNTING_PLAY':
        dispatch({ type: 'STRIKE' });
        break;
      case 'STEAL':
        dispatch({ type: 'STEAL_ANSWER', answerId: null });
        break;
      default:
        break;
    }
  });

  // Teacher Panel: Undo button
  document.getElementById('tp-btn-undo')?.addEventListener('click', () => {
    dispatch({ type: 'UNDO' });
  });

  // Teacher Panel: Switch Control button
  document.getElementById('tp-btn-switch-control')?.addEventListener('click', () => {
    dispatch({ type: 'SWITCH_CONTROL' });
  });

  // Teacher Panel: Finish Round early
  document.getElementById('tp-btn-force-end')?.addEventListener('click', async () => {
    const confirmed = await confirmModal('Selesaikan ronde saat ini lebih awal dan buka seluruh kunci jawaban?', {
      title: 'Selesaikan Ronde Paksa',
      confirmText: 'Selesaikan Ronde',
    });
    if (confirmed) {
      dispatch({ type: 'FINISH_ROUND' });
    }
  });

  // Teacher Panel: Manual Score Adjustment
  document.getElementById('tp-btn-adjust-score')?.addEventListener('click', () => {
    openManualScoreModal();
  });

  // Reflection Overlay "Next" button with debounce
  let isNextProcessing = false;
  document.getElementById('btn-reflection-next')?.addEventListener('click', () => {
    if (isNextProcessing) return;
    isNextProcessing = true;
    setTimeout(() => {
      isNextProcessing = false;
    }, 1000);
    dispatch({ type: 'NEXT' });
  });
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignore shortcuts when teacher typing in search input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toUpperCase();

    // Teacher panel toggle shortcut
    if (key === 'H') {
      isTeacherPanelOpen = !isTeacherPanelOpen;
      renderTeacherPanel();
      return;
    }

    // Buzz shortcuts in FACE_OFF (A, L, S, K)
    if (state && state.phase === 'FACE_OFF' && !state.roundData?.faceOff?.turnTeamId) {
      const teams = state.config?.teams || [];
      const shortcuts = ['A', 'L', 'S', 'K'];
      const matchIdx = shortcuts.indexOf(key);
      if (matchIdx !== -1 && teams[matchIdx]) {
        dispatch({ type: 'BUZZ', teamId: teams[matchIdx].id });
      }
    }
  });
}

function openManualScoreModal() {
  const teams = state.config?.teams || [];
  const optionsHtml = teams.map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join('');

  const modal = document.createElement('div');
  modal.className =
    'fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-6">
      <h3 class="text-sm font-bold text-slate-800 mb-3">Penyesuaian Skor Manual</h3>
      <div class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Pilih Tim:</label>
          <select id="modal-adjust-team" class="w-full px-2.5 py-1.5 border rounded-lg">${optionsHtml}</select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Nilai Tambahan / Pengurangan (Poin):</label>
          <input type="number" id="modal-adjust-delta" class="w-full px-2.5 py-1.5 border rounded-lg" value="50" step="10">
          <span class="text-[11px] text-slate-400">Gunakan angka negatif untuk mengurangi, mis. -20</span>
        </div>
      </div>
      <div class="flex items-center justify-end space-x-2 mt-4 pt-3 border-t">
        <button type="button" id="modal-adjust-cancel" class="px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50">Batal</button>
        <button type="button" id="modal-adjust-confirm" class="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">Terapkan Skor</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#modal-adjust-cancel')?.addEventListener('click', () => modal.remove());
  modal.querySelector('#modal-adjust-confirm')?.addEventListener('click', () => {
    const teamId = modal.querySelector('#modal-adjust-team')?.value;
    const delta = Number(modal.querySelector('#modal-adjust-delta')?.value) || 0;
    if (teamId && delta !== 0) {
      dispatch({ type: 'ADJUST_SCORE', teamId, delta });
      showToast(`Skor diperbarui (${delta > 0 ? '+' : ''}${delta} poin).`, 'success');
    }
    modal.remove();
  });
}
