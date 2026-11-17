/**
 * Manages game state persistence using localStorage with versioned key.
 * All operations are safely wrapped in try/catch to survive private mode / quota errors.
 */

const STORAGE_KEY = 'family100bk:game:v1';

const VALID_PHASES = new Set([
  'FACE_OFF',
  'PLAYING',
  'STEAL',
  'ROUND_END',
  'REFLECTION',
  'FINAL_RESULT',
  'HUNTING_SELECT',
  'HUNTING_PLAY',
]);

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
 * Validates that loaded state matches expected game state shape.
 *
 * @param {any} data
 * @returns {boolean}
 */
export function validateGameState(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (data.version !== 1) return false;
  if (!VALID_PHASES.has(data.phase)) return false;
  if (!data.config || typeof data.config !== 'object' || !Array.isArray(data.config.teams)) return false;
  if (!Array.isArray(data.questions) || data.questions.length === 0) return false;
  if (!data.scores || typeof data.scores !== 'object' || Array.isArray(data.scores)) return false;
  if (typeof data.roundIndex !== 'number' || data.roundIndex < 0) return false;
  if (!data.roundData || typeof data.roundData !== 'object') return false;
  return true;
}

/**
 * Saves current game state to localStorage.
 *
 * @param {object} state
 * @returns {boolean} True if saved, false if failed (e.g. quota exceeded)
 */
export function saveGame(state) {
  const storage = getStorage();
  if (!storage || !state) return false;

  try {
    const serialized = JSON.stringify(state);
    storage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (err) {
    console.warn('Gagal menyimpan game ke localStorage (kuota/private mode):', err);
    return false;
  }
}

/**
 * Clears saved game state from localStorage.
 *
 * @returns {boolean}
 */
export function clearGame() {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.warn('Gagal menghapus game dari localStorage:', err);
    return false;
  }
}

/**
 * Checks if there is a saved game in localStorage.
 *
 * @returns {boolean}
 */
export function hasSavedGame() {
  const storage = getStorage();
  if (!storage) return false;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    return Boolean(raw);
  } catch (err) {
    return false;
  }
}

/**
 * Loads and validates saved game state from localStorage.
 * If data is corrupted or invalid, cleans it up and returns null.
 *
 * @returns {object|null}
 */
export function loadGame() {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!validateGameState(parsed)) {
      console.warn('Data game di localStorage rusak atau tidak valid, membuang data...');
      clearGame();
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn('Gagal memuat/parsing game dari localStorage:', err);
    clearGame();
    return null;
  }
}
