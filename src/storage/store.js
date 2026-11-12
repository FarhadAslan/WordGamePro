/**
 * Vəziyyət saxlama modulu.
 * Web üçün localStorage istifadə edir.
 * Versiyalı sxem + köhnə "wordleAZ_v2" datanın miqrasiyası.
 */
import { ECONOMY } from '../data/economy.js';

const SCHEMA_VERSION = 3;
const KEY_STATE   = 'st_gamestate';
const KEY_STATS   = 'st_stats';
const KEY_COINS   = 'st_coins';
const KEY_PREFS   = 'st_prefs';
const KEY_HINTS   = 'st_hints';
const KEY_RATING  = 'st_rating';

// localStorage wrapper (try/catch ilə xəta idarəsi)
function getItem(key) {
  try {
    return localStorage.getItem(key);
  } catch { return null; }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function removeItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

// ---- Köhnə data miqrasiyası ----
function migrateOld() {
  const old = getItem('wordleAZ_v2');
  if (old) {
    try {
      const d = JSON.parse(old);
      if (d.rows) setItem(KEY_STATE + '_legacy', old);
    } catch {}
    removeItem('wordleAZ_v2');
    removeItem('wordleAZ_v2_stats');
  }
}

// ---- Oyun Vəziyyəti ----
export async function saveGameState(state) {
  const payload = JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION });
  setItem(KEY_STATE, payload);
}

export async function loadGameState() {
  migrateOld();
  try {
    const raw = getItem(KEY_STATE);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d.schemaVersion || d.schemaVersion < 2) return null;
    return d;
  } catch { return null; }
}

export async function clearGameState() {
  removeItem(KEY_STATE);
}

// ---- Statistika ----
function defaultStats() {
  return {
    played: 0, wins: 0, streak: 0, maxStreak: 0,
    dist: [0, 0, 0, 0, 0, 0],
    totalCoins: ECONOMY.startingCoins,
    gamesWithHints: 0,
    lastDailyDate: null,
    schemaVersion: SCHEMA_VERSION
  };
}

export async function loadStats() {
  try {
    const raw = getItem(KEY_STATS);
    if (!raw) return defaultStats();
    const d = JSON.parse(raw);
    return { ...defaultStats(), ...d };
  } catch { return defaultStats(); }
}

export async function saveStats(stats) {
  setItem(KEY_STATS, JSON.stringify({ ...stats, schemaVersion: SCHEMA_VERSION }));
}

// ---- Xal Balansı ----
export async function loadCoins() {
  try {
    const raw = getItem(KEY_COINS);
    if (raw === null || raw === undefined) return ECONOMY.startingCoins;
    return parseInt(raw, 10) || ECONOMY.startingCoins;
  } catch { return ECONOMY.startingCoins; }
}

export async function saveCoins(amount) {
  setItem(KEY_COINS, String(amount));
}

// ---- İstifadəçi Ayarları ----
function defaultPrefs() {
  return {
    theme: 'dark',
    contrast: false,
    sound: true,
    haptics: true,
    notifications: false,
    hintConfirmSkip: false,
    schemaVersion: SCHEMA_VERSION
  };
}

export async function loadPrefs() {
  try {
    const raw = getItem(KEY_PREFS);
    if (!raw) return defaultPrefs();
    return { ...defaultPrefs(), ...JSON.parse(raw) };
  } catch { return defaultPrefs(); }
}

export async function savePrefs(prefs) {
  setItem(KEY_PREFS, JSON.stringify(prefs));
}

// ---- İpucu vəziyyəti (cari oyun üçün) ----
export async function loadHintState() {
  try {
    const raw = getItem(KEY_HINTS);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export async function saveHintState(state) {
  setItem(KEY_HINTS, JSON.stringify(state));
}

export async function clearHintState() {
  removeItem(KEY_HINTS);
}

// ---- Reyting ----
function defaultRating() {
  return {
    rp: 0,            // Reyting Balı
    tierId: 'newcomer',
    history: [],      // Son 20 oyunun RP dəyişikliyi [{delta, tierId, date}]
    schemaVersion: SCHEMA_VERSION,
  };
}

export async function loadRating() {
  try {
    const raw = getItem(KEY_RATING);
    if (!raw) return defaultRating();
    return { ...defaultRating(), ...JSON.parse(raw) };
  } catch { return defaultRating(); }
}

export async function saveRating(rating) {
  setItem(KEY_RATING, JSON.stringify({ ...rating, schemaVersion: SCHEMA_VERSION }));
}
