/**
 * Pure, deterministic Family 100 game engine.
 * No Math.random, no Date.now, no DOM, no localStorage, no network.
 */

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function pushUndoSnapshot(state) {
  const { undoStack, ...snapshotData } = state;
  const snapshot = deepClone(snapshotData);
  const currentStack = Array.isArray(undoStack) ? undoStack : [];
  return [snapshot, ...currentStack].slice(0, 20);
}

/**
 * Gets face-off pair for a round index.
 * Formula:
 * n = teams.length
 * tim A = teams[(2r) mod n]
 * tim B = teams[(2r+1) mod n]
 *
 * @param {object} config
 * @param {number} roundIndex
 * @returns {{ teamA: object|null, teamB: object|null }}
 */
export function getFaceOffTeams(config, roundIndex = 0) {
  const teams = config?.teams || [];
  const n = teams.length;
  if (!Array.isArray(teams) || n < 2) {
    return { teamA: null, teamB: null };
  }
  const r = Math.max(0, Number(roundIndex) || 0);
  const idxA = (2 * r) % n;
  const idxB = (2 * r + 1) % n;
  return {
    teamA: teams[idxA],
    teamB: teams[idxB],
  };
}

/**
 * Gets the current active question for the current round.
 *
 * @param {object} state
 * @returns {object|null}
 */
export function getCurrentQuestion(state) {
  if (!state || !Array.isArray(state.questions)) return null;
  if (state.roundIndex < 0 || state.roundIndex >= state.questions.length) return null;
  return state.questions[state.roundIndex] || null;
}

/**
 * Gets ranked teams ordered by score descending.
 *
 * @param {object} state
 * @returns {Array<{ team: object, score: number, rank: number }>}
 */
export function getRanking(state) {
  if (!state?.config?.teams || !Array.isArray(state.config.teams)) return [];
  const teams = state.config.teams;
  const scores = state.scores || {};

  const list = teams.map((team) => ({
    team,
    score: Number(scores[team.id]) || 0,
  }));

  list.sort((a, b) => b.score - a.score);

  let currentRank = 1;
  return list.map((item, idx) => {
    if (idx > 0 && item.score < list[idx - 1].score) {
      currentRank = idx + 1;
    }
    return {
      ...item,
      rank: currentRank,
    };
  });
}

/**
 * Gets game winners (array of team objects; more than 1 if tied).
 *
 * @param {object} state
 * @returns {Array<object>}
 */
export function getWinners(state) {
  const ranking = getRanking(state);
  if (ranking.length === 0) return [];
  const topScore = ranking[0].score;
  return ranking
    .filter((item) => item.score === topScore)
    .map((item) => item.team);
}

/**
 * Checks if state can be undone.
 *
 * @param {object} state
 * @returns {boolean}
 */
export function canUndo(state) {
  return Boolean(state && Array.isArray(state.undoStack) && state.undoStack.length > 0);
}

/**
 * Gets all round summaries.
 *
 * @param {object} state
 * @returns {Array<object>}
 */
export function getRoundSummaries(state) {
  return state && Array.isArray(state.roundSummaries) ? deepClone(state.roundSummaries) : [];
}

/**
 * Initializes and creates a new game state.
 *
 * @param {object} config - { categoryId, teams: [{id, name, color}], roundCount, timerSeconds, maxStrikes, multiplierEnabled }
 * @param {Array<object>} questions - Raw questions with answers
 * @returns {object} Valid initial state
 */
export function createGame(config, questions) {
  if (!config || typeof config !== 'object') {
    throw new Error('Konfigurasi game tidak valid.');
  }

  const teams = config.teams;
  if (!Array.isArray(teams) || teams.length < 2 || teams.length > 4) {
    throw new Error('Jumlah tim harus antara 2 hingga 4 tim.');
  }

  const seenNames = new Set();
  const seenIds = new Set();

  const validatedTeams = teams.map((team, idx) => {
    if (!team || typeof team !== 'object') {
      throw new Error(`Data tim ke-${idx + 1} tidak valid.`);
    }
    const name = typeof team.name === 'string' ? team.name.trim() : '';
    if (!name) {
      throw new Error(`Nama tim ke-${idx + 1} tidak boleh kosong.`);
    }
    const lowerName = name.toLowerCase();
    if (seenNames.has(lowerName)) {
      throw new Error(`Nama tim tidak boleh kembar: "${name}".`);
    }
    seenNames.add(lowerName);

    const id = team.id !== undefined && team.id !== null ? String(team.id).trim() : '';
    if (!id) {
      throw new Error(`ID tim ke-${idx + 1} tidak boleh kosong.`);
    }
    if (seenIds.has(id)) {
      throw new Error(`ID tim tidak boleh kembar: "${id}".`);
    }
    seenIds.add(id);

    return {
      id,
      name,
      color: team.color || '#2563eb',
    };
  });

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Daftar soal tidak boleh kosong.');
  }

  // Sort questions by sort_order
  const sortedQuestions = [...questions].sort(
    (a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)
  );

  const desiredRounds = Number(config.roundCount);
  const roundCount =
    Number.isInteger(desiredRounds) && desiredRounds > 0
      ? Math.min(desiredRounds, sortedQuestions.length)
      : sortedQuestions.length;

  const selectedQuestions = sortedQuestions.slice(0, roundCount).map((q, qIdx) => {
    const rawAnswers = Array.isArray(q.answers) ? [...q.answers] : [];
    // Sort answers by points descending; rank = order
    const sortedAnswers = rawAnswers
      .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0))
      .map((ans, aIdx) => ({
        id: String(ans.id || `ans-${qIdx + 1}-${aIdx + 1}`),
        question_id: String(q.id || `q-${qIdx + 1}`),
        answer_text: String(ans.answer_text || '').trim(),
        points: Math.max(0, Number(ans.points) || 0),
        keywords: Array.isArray(ans.keywords) ? ans.keywords : [],
        rank: aIdx + 1,
        sort_order: aIdx + 1,
      }));

    return {
      id: String(q.id || `q-${qIdx + 1}`),
      category_id: String(q.category_id || config.categoryId || ''),
      question_text: String(q.question_text || '').trim(),
      reflection_note: String(q.reflection_note || '').trim(),
      discussion_prompts: Array.isArray(q.discussion_prompts) ? q.discussion_prompts : [],
      multiplier: Math.max(1, Math.min(3, Math.floor(Number(q.multiplier)) || 1)),
      sort_order: qIdx + 1,
      answers: sortedAnswers,
    };
  });

  const rawTimer = Number(config.timerSeconds);
  const timerSeconds = Number.isInteger(rawTimer) && rawTimer >= 0
    ? rawTimer
    : 0;

  const rawStrikes = Number(config.maxStrikes);
  const maxStrikes = Number.isInteger(rawStrikes) && rawStrikes > 0
    ? rawStrikes
    : 3;

  const multiplierEnabled =
    config.multiplierEnabled !== undefined ? Boolean(config.multiplierEnabled) : true;

  const gameMode = config.gameMode === 'hunting' ? 'hunting' : 'family100';

  const normalizedConfig = {
    categoryId: String(config.categoryId || ''),
    teams: validatedTeams,
    roundCount: selectedQuestions.length,
    timerSeconds,
    maxStrikes,
    multiplierEnabled,
    gameMode,
  };

  const scores = {};
  validatedTeams.forEach((t) => {
    scores[t.id] = 0;
  });

  const pair0 = getFaceOffTeams(normalizedConfig, 0);
  const isHunting = gameMode === 'hunting';
  const initialPhase = isHunting ? 'HUNTING_SELECT' : 'FACE_OFF';

  const initialRoundData = {
    revealedIds: [],
    autoRevealedIds: [],
    pot: 0,
    strikes: 0,
    controlTeamId: null,
    stealTeamId: null,
    currentHuntingTeamId: null,
    huntingTurnsPlayed: [],
    faceOff: {
      activeTeams: pair0.teamA && pair0.teamB ? [pair0.teamA.id, pair0.teamB.id] : [],
      buzzTeamId: null,
      turnTeamId: null,
      firstAnswer: null,
      secondAnswer: null,
      winnerTeamId: null,
      waitingForChoice: false,
    },
    winnerTeamId: null,
    awardedPoints: 0,
  };

  return {
    version: 1,
    config: normalizedConfig,
    questions: selectedQuestions,
    roundIndex: 0,
    phase: initialPhase,
    paused: false,
    scores,
    roundData: initialRoundData,
    roundSummaries: [],
    undoStack: [],
  };
}

/**
 * Pure reducer function for game state transitions.
 *
 * @param {object} state
 * @param {object} action
 * @returns {{ state: object, events: Array<object> }}
 */
export function reduce(state, action) {
  if (!state || typeof state !== 'object') {
    return {
      state,
      events: [{ type: 'IGNORED', reason: 'State game tidak valid.' }],
    };
  }

  if (!action || typeof action !== 'object' || !action.type) {
    return {
      state,
      events: [{ type: 'IGNORED', reason: 'Aksi game tidak valid.' }],
    };
  }

  // 1. UNDO Action
  if (action.type === 'UNDO') {
    if (!canUndo(state)) {
      return {
        state,
        events: [{ type: 'IGNORED', reason: 'Tidak ada langkah yang dapat dibatalkan.' }],
      };
    }
    const [prevSnapshot, ...restStack] = state.undoStack;
    const restored = deepClone(prevSnapshot);
    restored.undoStack = restStack;
    return {
      state: restored,
      events: [{ type: 'UNDONE' }],
    };
  }

  // 2. PAUSE / RESUME Actions
  if (action.type === 'PAUSE') {
    if (state.paused) {
      return { state, events: [{ type: 'IGNORED', reason: 'Game sudah dalam keadaan pause.' }] };
    }
    const nextState = deepClone(state);
    nextState.paused = true;
    return {
      state: nextState,
      events: [{ type: 'PAUSED' }],
    };
  }

  if (action.type === 'RESUME') {
    if (!state.paused) {
      return { state, events: [{ type: 'IGNORED', reason: 'Game tidak sedang di-pause.' }] };
    }
    const nextState = deepClone(state);
    nextState.paused = false;
    return {
      state: nextState,
      events: [{ type: 'RESUMED' }],
    };
  }

  // If paused, all other actions are ignored
  if (state.paused) {
    return {
      state,
      events: [{ type: 'IGNORED', reason: 'Game sedang di-pause. Lanjutkan (RESUME) terlebih dahulu.' }],
    };
  }

  // Helper to commit a state transition with undo snapshot
  function commit(nextState, events) {
    nextState.undoStack = pushUndoSnapshot(state);
    return { state: nextState, events };
  }

  // 3. ADJUST_SCORE { teamId, delta }
  if (action.type === 'ADJUST_SCORE') {
    const { teamId, delta } = action;
    if (!teamId || !state.config.teams.some((t) => t.id === teamId)) {
      return { state, events: [{ type: 'IGNORED', reason: 'Tim tidak ditemukan.' }] };
    }
    const nextState = deepClone(state);
    const currentScore = Number(nextState.scores[teamId]) || 0;
    const change = Number(delta) || 0;
    const newScore = Math.max(0, currentScore + change);
    nextState.scores[teamId] = newScore;
    return commit(nextState, [
      { type: 'SCORE_ADJUSTED', teamId, score: newScore, delta: change },
    ]);
  }

  // 3b. SELECT_HUNTING_TEAM { teamId } (Mode Hunting Poin)
  if (action.type === 'SELECT_HUNTING_TEAM') {
    if (state.phase !== 'HUNTING_SELECT') {
      return { state, events: [{ type: 'IGNORED', reason: 'Bukan fase pemilihan tim Hunting.' }] };
    }
    const teamId = action.teamId;
    const teamExists = state.config.teams.some((t) => t.id === teamId);
    if (!teamExists) {
      return { state, events: [{ type: 'IGNORED', reason: 'Tim tidak ditemukan.' }] };
    }

    const nextState = deepClone(state);
    nextState.phase = 'HUNTING_PLAY';
    nextState.roundData.currentHuntingTeamId = teamId;
    nextState.roundData.strikes = 0;

    return commit(nextState, [{ type: 'HUNTING_TEAM_SELECTED', teamId }]);
  }

  // 3c. PASS_HUNTING_TURN (Mode Hunting Poin - Oper giliran ke tim lain)
  if (action.type === 'PASS_HUNTING_TURN') {
    if (state.phase !== 'HUNTING_PLAY') {
      return { state, events: [{ type: 'IGNORED', reason: 'Aksi oper hanya untuk fase Hunting Play.' }] };
    }
    const nextState = deepClone(state);
    const curId = nextState.roundData.currentHuntingTeamId;
    if (curId && !nextState.roundData.huntingTurnsPlayed.includes(curId)) {
      nextState.roundData.huntingTurnsPlayed.push(curId);
    }
    const remaining = nextState.config.teams.filter(
      (t) => !nextState.roundData.huntingTurnsPlayed.includes(t.id)
    );
    const events = [];

    if (remaining.length > 0) {
      nextState.phase = 'HUNTING_SELECT';
      nextState.roundData.currentHuntingTeamId = null;
      events.push({
        type: 'HUNTING_TURN_ENDED',
        reason: 'passed',
        teamId: curId,
        remainingTeams: remaining.map((t) => t.id),
      });
    } else {
      finalizeRound(nextState, null, events);
    }
    return commit(nextState, events);
  }

  // 4. BUZZ { teamId } (Only in FACE_OFF)
  if (action.type === 'BUZZ') {
    if (state.phase !== 'FACE_OFF') {
      return {
        state,
        events: [{ type: 'IGNORED', reason: 'Buzzer hanya aktif pada fase FACE_OFF.' }],
      };
    }
    const faceOff = state.roundData.faceOff;
    if (faceOff.waitingForChoice || faceOff.winnerTeamId) {
      return {
        state,
        events: [{ type: 'IGNORED', reason: 'Pemenang face-off sudah ditentukan.' }],
      };
    }
    const teamId = action.teamId;
    if (!faceOff.activeTeams.includes(teamId)) {
      return {
        state,
        events: [{ type: 'IGNORED', reason: 'Tim ini tidak berpartisipasi pada face-off ronde ini.' }],
      };
    }
    // Only the first buzz is accepted, others IGNORED
    if (faceOff.buzzTeamId) {
      return {
        state,
        events: [{ type: 'IGNORED', reason: 'Buzzer sudah ditekan oleh tim lain.' }],
      };
    }

    const nextState = deepClone(state);
    nextState.roundData.faceOff.buzzTeamId = teamId;
    nextState.roundData.faceOff.turnTeamId = teamId;
    return commit(nextState, [{ type: 'BUZZED', teamId }]);
  }

  // 5. FACEOFF_ANSWER { teamId, answerId }
  if (action.type === 'FACEOFF_ANSWER') {
    if (state.phase !== 'FACE_OFF') {
      return { state, events: [{ type: 'IGNORED', reason: 'Bukan fase FACE_OFF.' }] };
    }
    const faceOff = state.roundData.faceOff;
    if (!faceOff.buzzTeamId || !faceOff.turnTeamId) {
      return { state, events: [{ type: 'IGNORED', reason: 'Belum ada tim yang menekan buzzer.' }] };
    }
    if (action.teamId !== faceOff.turnTeamId) {
      return { state, events: [{ type: 'IGNORED', reason: 'Bukan giliran tim ini menjawab.' }] };
    }

    const nextState = deepClone(state);
    const nextFaceOff = nextState.roundData.faceOff;
    const currentQ = getCurrentQuestion(nextState);
    const activeTeams = nextFaceOff.activeTeams;
    const opponentTeamId = activeTeams.find((id) => id !== action.teamId);

    const answerId = action.answerId;
    const events = [];

    // Already revealed answer?
    if (answerId && nextState.roundData.revealedIds.includes(answerId)) {
      return {
        state,
        events: [{ type: 'ALREADY_REVEALED', answerId }],
      };
    }

    // Check validity of answer
    let matchedAnswer = null;
    if (answerId && currentQ?.answers) {
      matchedAnswer = currentQ.answers.find((a) => a.id === answerId) || null;
    }

    if (matchedAnswer) {
      nextState.roundData.revealedIds.push(matchedAnswer.id);
      nextState.roundData.pot += matchedAnswer.points;
      events.push({
        type: 'ANSWER_REVEALED',
        answerId: matchedAnswer.id,
        points: matchedAnswer.points,
        teamId: action.teamId,
      });
    } else {
      events.push({ type: 'WRONG_ANSWER', teamId: action.teamId });
    }

    const isFirstAnswering = nextFaceOff.firstAnswer === null;

    if (isFirstAnswering) {
      // Record first answer
      nextFaceOff.firstAnswer = {
        teamId: action.teamId,
        answerId: matchedAnswer ? matchedAnswer.id : null,
        points: matchedAnswer ? matchedAnswer.points : 0,
        rank: matchedAnswer ? matchedAnswer.rank : null,
        valid: Boolean(matchedAnswer),
      };

      // Rule: tim pertama menjawab peringkat 1 -> langsung menang kontrol
      if (matchedAnswer && matchedAnswer.rank === 1) {
        nextFaceOff.winnerTeamId = action.teamId;
        nextFaceOff.waitingForChoice = true;
        nextFaceOff.turnTeamId = null;
        events.push({ type: 'CONTROL_WON', teamId: action.teamId });
        return commit(nextState, events);
      }

      // Jawaban valid bukan peringkat 1 atau jawaban salah -> giliran lawan
      nextFaceOff.turnTeamId = opponentTeamId;
      events.push({ type: 'TURN_SWITCHED', teamId: opponentTeamId });
      return commit(nextState, events);
    } else {
      // Second answer
      nextFaceOff.secondAnswer = {
        teamId: action.teamId,
        answerId: matchedAnswer ? matchedAnswer.id : null,
        points: matchedAnswer ? matchedAnswer.points : 0,
        rank: matchedAnswer ? matchedAnswer.rank : null,
        valid: Boolean(matchedAnswer),
      };

      const first = nextFaceOff.firstAnswer;
      const second = nextFaceOff.secondAnswer;

      if (first.valid) {
        // Tim kedua menang HANYA bila jawabannya valid dan points lebih tinggi dari first
        if (second.valid && second.points > first.points) {
          nextFaceOff.winnerTeamId = second.teamId;
          nextFaceOff.waitingForChoice = true;
          nextFaceOff.turnTeamId = null;
          events.push({ type: 'CONTROL_WON', teamId: second.teamId });
        } else {
          // Selain itu first menang
          nextFaceOff.winnerTeamId = first.teamId;
          nextFaceOff.waitingForChoice = true;
          nextFaceOff.turnTeamId = null;
          events.push({ type: 'CONTROL_WON', teamId: first.teamId });
        }
      } else {
        // First salah
        if (second.valid) {
          // Kedua menang
          nextFaceOff.winnerTeamId = second.teamId;
          nextFaceOff.waitingForChoice = true;
          nextFaceOff.turnTeamId = null;
          events.push({ type: 'CONTROL_WON', teamId: second.teamId });
        } else {
          // Keduanya salah: tidak ada yang menang, buzzer di-reset (jawaban terbuka tetap terbuka)
          nextFaceOff.buzzTeamId = null;
          nextFaceOff.turnTeamId = null;
          nextFaceOff.firstAnswer = null;
          nextFaceOff.secondAnswer = null;
          nextFaceOff.winnerTeamId = null;
          nextFaceOff.waitingForChoice = false;
          events.push({ type: 'FACEOFF_RESET', reason: 'Kedua tim salah menjawab' });
        }
      }

      return commit(nextState, events);
    }
  }

  // 6. CHOOSE_CONTROL { choice: 'play' | 'pass' }
  if (action.type === 'CHOOSE_CONTROL') {
    if (state.phase !== 'FACE_OFF' || !state.roundData.faceOff.waitingForChoice) {
      return {
        state,
        events: [{ type: 'IGNORED', reason: 'Belum saatnya memilih kontrol (CHOOSE_CONTROL).' }],
      };
    }
    const choice = action.choice === 'pass' ? 'pass' : 'play';
    const nextState = deepClone(state);
    const faceOff = nextState.roundData.faceOff;
    const winnerId = faceOff.winnerTeamId;
    const opponentId = faceOff.activeTeams.find((id) => id !== winnerId);

    const controlTeamId = choice === 'play' ? winnerId : opponentId;
    const stealTeamId = choice === 'play' ? opponentId : winnerId;

    nextState.phase = 'PLAYING';
    nextState.roundData.controlTeamId = controlTeamId;
    nextState.roundData.stealTeamId = stealTeamId;
    nextState.roundData.strikes = 0;
    nextState.roundData.faceOff.waitingForChoice = false;

    return commit(nextState, [
      { type: 'CONTROL_CHOSEN', choice, controlTeamId, stealTeamId },
    ]);
  }

  // 7. REVEAL { answerId } (PLAYING & HUNTING_PLAY)
  if (action.type === 'REVEAL') {
    if (state.phase !== 'PLAYING' && state.phase !== 'HUNTING_PLAY') {
      return { state, events: [{ type: 'IGNORED', reason: 'Aksi REVEAL hanya untuk fase bermain.' }] };
    }
    const answerId = action.answerId;
    if (state.roundData.revealedIds.includes(answerId)) {
      return {
        state,
        events: [{ type: 'ALREADY_REVEALED', answerId }],
      };
    }

    const currentQ = getCurrentQuestion(state);
    const answer = currentQ?.answers?.find((a) => a.id === answerId);
    if (!answer) {
      return { state, events: [{ type: 'IGNORED', reason: 'Jawaban tidak ditemukan pada soal ini.' }] };
    }

    const nextState = deepClone(state);
    nextState.roundData.revealedIds.push(answer.id);

    const isHunting = nextState.config.gameMode === 'hunting';
    const mult = nextState.config.multiplierEnabled ? (currentQ?.multiplier || 1) : 1;
    const earnedPoints = answer.points * mult;

    let targetTeamId;
    if (isHunting) {
      targetTeamId = nextState.roundData.currentHuntingTeamId;
      if (targetTeamId && nextState.scores[targetTeamId] !== undefined) {
        nextState.scores[targetTeamId] += earnedPoints;
      }
      nextState.roundData.pot += earnedPoints;
    } else {
      targetTeamId = nextState.roundData.controlTeamId;
      nextState.roundData.pot += answer.points;
    }

    const events = [
      {
        type: 'ANSWER_REVEALED',
        answerId: answer.id,
        points: isHunting ? earnedPoints : answer.points,
        teamId: targetTeamId,
      },
    ];

    // Check if all answers are revealed -> ROUND_END
    const allAnswers = currentQ.answers || [];
    const isAllRevealed = allAnswers.every((a) =>
      nextState.roundData.revealedIds.includes(a.id)
    );

    if (isAllRevealed) {
      finalizeRound(nextState, targetTeamId, events);
    }

    return commit(nextState, events);
  }

  // 8. STRIKE (PLAYING & HUNTING_PLAY)
  if (action.type === 'STRIKE') {
    if (state.phase !== 'PLAYING' && state.phase !== 'HUNTING_PLAY') {
      return { state, events: [{ type: 'IGNORED', reason: 'Strike hanya berlaku pada fase bermain.' }] };
    }
    const nextState = deepClone(state);
    nextState.roundData.strikes += 1;
    const strikes = nextState.roundData.strikes;
    const events = [{ type: 'STRIKE', count: strikes }];

    const isHunting = nextState.config.gameMode === 'hunting';
    const maxStrikes = nextState.config.maxStrikes !== undefined ? Number(nextState.config.maxStrikes) : 3;

    if (isHunting) {
      if (maxStrikes > 0 && strikes >= maxStrikes) {
        const curId = nextState.roundData.currentHuntingTeamId;
        if (curId && !nextState.roundData.huntingTurnsPlayed.includes(curId)) {
          nextState.roundData.huntingTurnsPlayed.push(curId);
        }
        const remaining = nextState.config.teams.filter(
          (t) => !nextState.roundData.huntingTurnsPlayed.includes(t.id)
        );

        if (remaining.length > 0) {
          nextState.phase = 'HUNTING_SELECT';
          nextState.roundData.currentHuntingTeamId = null;
          events.push({
            type: 'HUNTING_TURN_ENDED',
            reason: 'max_strikes',
            teamId: curId,
            remainingTeams: remaining.map((t) => t.id),
          });
        } else {
          finalizeRound(nextState, null, events);
        }
      }
    } else {
      if (maxStrikes > 0 && strikes >= maxStrikes) {
        nextState.phase = 'STEAL';
        events.push({ type: 'STEAL_STARTED', teamId: nextState.roundData.stealTeamId });
      }
    }

    return commit(nextState, events);
  }

  // 9. STEAL_ANSWER { answerId } (Only in STEAL)
  if (action.type === 'STEAL_ANSWER') {
    if (state.phase !== 'STEAL') {
      return { state, events: [{ type: 'IGNORED', reason: 'Aksi STEAL_ANSWER hanya untuk fase STEAL.' }] };
    }
    const nextState = deepClone(state);
    const answerId = action.answerId;
    const currentQ = getCurrentQuestion(nextState);
    const stealTeamId = nextState.roundData.stealTeamId;
    const controlTeamId = nextState.roundData.controlTeamId;

    let matchedAnswer = null;
    if (answerId && !nextState.roundData.revealedIds.includes(answerId)) {
      matchedAnswer = currentQ?.answers?.find((a) => a.id === answerId) || null;
    }

    const events = [];

    if (matchedAnswer) {
      // Steal success: add answer points to pot, steal team wins round
      nextState.roundData.revealedIds.push(matchedAnswer.id);
      nextState.roundData.pot += matchedAnswer.points;
      events.push({
        type: 'STEAL_SUCCESS',
        teamId: stealTeamId,
        answerId: matchedAnswer.id,
        points: matchedAnswer.points,
      });
      finalizeRound(nextState, stealTeamId, events);
    } else {
      // Steal failed: control team wins round
      events.push({ type: 'STEAL_FAILED', teamId: stealTeamId });
      finalizeRound(nextState, controlTeamId, events);
    }

    return commit(nextState, events);
  }

  // 10. TIMER_EXPIRED
  if (action.type === 'TIMER_EXPIRED') {
    if (state.phase === 'FACE_OFF') {
      const faceOff = state.roundData.faceOff;
      if (faceOff.turnTeamId) {
        return reduce(state, {
          type: 'FACEOFF_ANSWER',
          teamId: faceOff.turnTeamId,
          answerId: null,
        });
      }
      return { state, events: [{ type: 'IGNORED', reason: 'Belum ada giliran menjawab di FACE_OFF.' }] };
    } else if (state.phase === 'PLAYING') {
      return reduce(state, { type: 'STRIKE' });
    } else if (state.phase === 'STEAL') {
      return reduce(state, { type: 'STEAL_ANSWER', answerId: null });
    } else if (state.phase === 'HUNTING_PLAY') {
      const nextState = deepClone(state);
      const curId = nextState.roundData.currentHuntingTeamId;
      if (curId && !nextState.roundData.huntingTurnsPlayed.includes(curId)) {
        nextState.roundData.huntingTurnsPlayed.push(curId);
      }
      const remaining = nextState.config.teams.filter(
        (t) => !nextState.roundData.huntingTurnsPlayed.includes(t.id)
      );
      const events = [{ type: 'TIMER_EXPIRED' }];

      if (remaining.length > 0) {
        nextState.phase = 'HUNTING_SELECT';
        nextState.roundData.currentHuntingTeamId = null;
        events.push({
          type: 'HUNTING_TURN_ENDED',
          reason: 'timer_expired',
          teamId: curId,
          remainingTeams: remaining.map((t) => t.id),
        });
      } else {
        finalizeRound(nextState, null, events);
      }
      return commit(nextState, events);
    } else {
      return {
        state,
        events: [{ type: 'IGNORED', reason: `TIMER_EXPIRED diabaikan pada fase ${state.phase}.` }],
      };
    }
  }

  // 11. SWITCH_CONTROL (Only in PLAYING)
  if (action.type === 'SWITCH_CONTROL') {
    if (state.phase !== 'PLAYING') {
      return { state, events: [{ type: 'IGNORED', reason: 'SWITCH_CONTROL hanya berlaku pada fase PLAYING.' }] };
    }
    const nextState = deepClone(state);
    const oldControl = nextState.roundData.controlTeamId;
    const oldSteal = nextState.roundData.stealTeamId;
    nextState.roundData.controlTeamId = oldSteal;
    nextState.roundData.stealTeamId = oldControl;

    return commit(nextState, [
      { type: 'CONTROL_SWITCHED', controlTeamId: oldSteal, stealTeamId: oldControl },
    ]);
  }

  // 12. FINISH_ROUND (Guru mengakhiri ronde paksa)
  if (action.type === 'FINISH_ROUND') {
    if (['ROUND_END', 'REFLECTION', 'FINAL_RESULT'].includes(state.phase)) {
      return { state, events: [{ type: 'IGNORED', reason: 'Ronde saat ini sudah selesai.' }] };
    }
    const nextState = deepClone(state);
    const winnerId = nextState.roundData.controlTeamId || nextState.roundData.currentHuntingTeamId || null;
    const events = [{ type: 'ROUND_FORCE_FINISHED' }];
    finalizeRound(nextState, winnerId, events);
    return commit(nextState, events);
  }

  // 13. NEXT (From REFLECTION to next round or FINAL_RESULT)
  if (action.type === 'NEXT') {
    if (state.phase !== 'REFLECTION') {
      return { state, events: [{ type: 'IGNORED', reason: 'Aksi NEXT hanya berlaku pada fase REFLECTION.' }] };
    }
    const nextState = deepClone(state);
    const nextRoundIndex = nextState.roundIndex + 1;

    if (nextRoundIndex < nextState.questions.length) {
      // Start next round
      nextState.roundIndex = nextRoundIndex;
      const isHunting = nextState.config.gameMode === 'hunting';
      nextState.phase = isHunting ? 'HUNTING_SELECT' : 'FACE_OFF';

      const nextPair = getFaceOffTeams(nextState.config, nextRoundIndex);
      nextState.roundData = {
        revealedIds: [],
        autoRevealedIds: [],
        pot: 0,
        strikes: 0,
        controlTeamId: null,
        stealTeamId: null,
        currentHuntingTeamId: null,
        huntingTurnsPlayed: [],
        faceOff: {
          activeTeams: nextPair.teamA && nextPair.teamB ? [nextPair.teamA.id, nextPair.teamB.id] : [],
          buzzTeamId: null,
          turnTeamId: null,
          firstAnswer: null,
          secondAnswer: null,
          winnerTeamId: null,
          waitingForChoice: false,
        },
        winnerTeamId: null,
        awardedPoints: 0,
      };

      return commit(nextState, [{ type: 'ROUND_STARTED', roundIndex: nextRoundIndex }]);
    } else {
      // Game ended
      nextState.phase = 'FINAL_RESULT';
      const winners = getWinners(nextState);
      return commit(nextState, [{ type: 'GAME_ENDED', winners }]);
    }
  }

  return {
    state,
    events: [{ type: 'IGNORED', reason: `Tipe aksi tidak dikenali: "${action.type}".` }],
  };
}

/**
 * Helper to finalize a round:
 * - Mark unrevealed answers as auto-revealed (no pot addition)
 * - Apply multiplier
 * - Award points to winner team
 * - Record round summary
 * - Transition phase to REFLECTION
 */
function finalizeRound(nextState, winnerTeamId, events) {
  const currentQ = getCurrentQuestion(nextState);
  const revealedIds = nextState.roundData.revealedIds || [];
  const allAnswers = currentQ?.answers || [];

  // Auto reveal remaining
  const autoRevealed = allAnswers
    .filter((a) => !revealedIds.includes(a.id))
    .map((a) => a.id);
  nextState.roundData.autoRevealedIds = autoRevealed;

  const isHunting = nextState.config.gameMode === 'hunting';
  const pot = nextState.roundData.pot;
  const mult = nextState.config.multiplierEnabled ? (currentQ?.multiplier || 1) : 1;
  const awarded = isHunting ? 0 : (winnerTeamId ? pot * mult : 0);

  if (!isHunting && winnerTeamId && nextState.scores[winnerTeamId] !== undefined) {
    nextState.scores[winnerTeamId] += awarded;
  }

  nextState.roundData.winnerTeamId = winnerTeamId;
  nextState.roundData.awardedPoints = awarded;

  // Add round summary
  const summary = {
    roundIndex: nextState.roundIndex,
    questionId: currentQ ? currentQ.id : null,
    winnerTeamId,
    pot,
    multiplier: mult,
    awardedPoints: awarded,
    strikes: nextState.roundData.strikes,
  };
  nextState.roundSummaries.push(summary);

  nextState.phase = 'REFLECTION';
  events.push({
    type: 'ROUND_ENDED',
    winnerTeamId,
    awarded,
  });
}
