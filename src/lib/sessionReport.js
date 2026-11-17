import { saveSession } from './dataService.js';
import { getRanking } from './gameEngine.js';

const PENDING_SESSIONS_KEY = 'family100bk:sessions:pending:v1';
const MAX_PENDING_SESSIONS = 5;

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

/**
 * Builds clean session payload containing only necessary team and game stats.
 * No private student or personal data.
 *
 * @param {object} state
 * @returns {{ categoryId: string, teams: Array<{ name: string, color: string, score: number, rank: number }>, rounds: number, finishedAt: string }}
 */
export function buildSessionPayload(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('State game tidak valid untuk membuat laporan sesi.');
  }

  const categoryId = state.config?.categoryId || '';
  const ranking = getRanking(state);

  const teams = ranking.map((item) => ({
    name: item.team.name,
    color: item.team.color || '#2563eb',
    score: item.score,
    rank: item.rank,
  }));

  const rounds = Array.isArray(state.roundSummaries)
    ? state.roundSummaries.length
    : Math.max(0, Number(state.roundIndex) || 0);

  return {
    categoryId,
    teams,
    rounds,
    finishedAt: new Date().toISOString(),
  };
}

/**
 * Gets currently pending offline sessions from localStorage.
 *
 * @returns {Array<object>}
 */
export function getPendingSessions() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(PENDING_SESSIONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('Gagal membaca antrean sesi tertunda:', err);
    return [];
  }
}

/**
 * Enqueues a failed session report to localStorage (up to MAX_PENDING_SESSIONS).
 *
 * @param {object} payload
 */
function queuePendingSession(payload) {
  const storage = getStorage();
  if (!storage || !payload) return;

  try {
    const current = getPendingSessions();
    const updated = [payload, ...current].slice(0, MAX_PENDING_SESSIONS);
    storage.setItem(PENDING_SESSIONS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Gagal menyimpan antrean sesi tertunda (kuota/storage error):', err);
  }
}

/**
 * Finalizes game session by reporting it to Supabase via dataService.saveSession.
 * If sending fails, safely enqueues payload to localStorage without throwing.
 *
 * @param {object} state
 * @returns {Promise<{ saved: boolean, data?: object|null, error?: string|null, payload: object }>}
 */
export async function finishGameSession(state) {
  let payload;
  try {
    payload = buildSessionPayload(state);
  } catch (err) {
    return {
      saved: false,
      error: `Gagal menyusun payload sesi: ${err.message}`,
      payload: null,
    };
  }

  try {
    const res = await saveSession(payload.categoryId, payload.teams);

    if (res.error || !res.data) {
      queuePendingSession(payload);
      return {
        saved: false,
        error: res.error || 'Gagal menyimpan sesi ke database.',
        payload,
      };
    }

    return {
      saved: true,
      data: res.data,
      payload,
    };
  } catch (err) {
    queuePendingSession(payload);
    return {
      saved: false,
      error: `Gangguan jaringan saat menyimpan sesi: ${err.message || String(err)}`,
      payload,
    };
  }
}

/**
 * Retries sending pending session payloads stored in localStorage.
 *
 * @returns {Promise<{ sent: number, remaining: number }>}
 */
export async function retryPendingSessions() {
  const pending = getPendingSessions();
  if (pending.length === 0) {
    return { sent: 0, remaining: 0 };
  }

  const remaining = [];
  let sentCount = 0;

  for (const session of pending) {
    try {
      const res = await saveSession(session.categoryId, session.teams);
      if (res.error || !res.data) {
        remaining.push(session);
      } else {
        sentCount++;
      }
    } catch (err) {
      remaining.push(session);
    }
  }

  const storage = getStorage();
  if (storage) {
    try {
      if (remaining.length === 0) {
        storage.removeItem(PENDING_SESSIONS_KEY);
      } else {
        storage.setItem(PENDING_SESSIONS_KEY, JSON.stringify(remaining));
      }
    } catch (err) {
      console.warn('Gagal memperbarui antrean sesi tertunda:', err);
    }
  }

  return {
    sent: sentCount,
    remaining: remaining.length,
  };
}
