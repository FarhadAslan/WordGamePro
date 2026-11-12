/**
 * Günün Sözü seçimi.
 * Bakı vaxtı (UTC+4) ilə gün nömrəsinə görə deterministik seçim.
 * Dövri — answers siyahısı bitəndə başa qayıdır (təkrarsız idarə edilmir
 * amma sıra sabittir).
 */
import { getAnswers } from './dict.js';

/** Bakı vaxtında (UTC+4) bu günün tarixini 'YYYY-MM-DD' formatında ver */
export function getBakuDateStr(date = new Date()) {
  const bakuMs = date.getTime() + (4 * 60 * 60 * 1000);
  const d = new Date(bakuMs);
  const yyyy = d.getUTCFullYear();
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Tarixin epoch günündən gün nömrəsini hesabla.
 * Epoch: oyunun başladığı tarix — 2024-01-01
 */
const EPOCH = new Date('2024-01-01T00:00:00Z').getTime();

export function getDayNumber(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d);
  return Math.floor((ms - EPOCH) / 86400000);
}

/** Bu günün gizli sözünü ver */
export function getDailyWord(dateStr) {
  const answers = getAnswers();
  if (!answers.length) return null;
  const idx = getDayNumber(dateStr) % answers.length;
  return answers[idx];
}

/** Növbəti günün başlamasına qədər qalan millisaniyə (Bakı vaxtı) */
export function msUntilNextDay() {
  const now    = new Date();
  const bakuMs = now.getTime() + 4 * 3600000;
  const bakuD  = new Date(bakuMs);
  const nextMidnight = Date.UTC(
    bakuD.getUTCFullYear(),
    bakuD.getUTCMonth(),
    bakuD.getUTCDate() + 1
  ) - 4 * 3600000;
  return nextMidnight - now.getTime();
}

/** Geri sayım HH:MM:SS formatı */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}
