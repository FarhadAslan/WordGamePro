/**
 * Reyting Sistemi — Söz Tap
 *
 * Tier sırası (aşağıdan yuxarı):
 *   Yeni → Tunc → Gümüş → Qızıl → Platin → Almaz → Əfsanə
 *
 * Hər oyundan sonra Reyting Balı (RP) qazanılır və ya itirilir.
 * RP yalnız aşağı gedir — tier düşmə (demote) var, ancaq müəyyən qoruma ilə.
 */

/** Tier tərifi */
export const TIERS = [
  { id: 'newcomer', label: 'Yeni',    emoji: '🌱', minRP: 0,    color: '#8b949e' },
  { id: 'bronze',   label: 'Tunc',    emoji: '🥉', minRP: 100,  color: '#cd7f32' },
  { id: 'silver',   label: 'Gümüş',   emoji: '🥈', minRP: 300,  color: '#9ea7b0' },
  { id: 'gold',     label: 'Qızıl',   emoji: '🥇', minRP: 600,  color: '#C9A227' },
  { id: 'platinum', label: 'Platin',  emoji: '💠', minRP: 1000, color: '#00B5E2' },
  { id: 'diamond',  label: 'Almaz',   emoji: '💎', minRP: 1500, color: '#7B68EE' },
  { id: 'legend',   label: 'Əfsanə', emoji: '👑', minRP: 2200, color: '#EF3340' },
];

/**
 * RP qazanma sabiti — cəhd sayına görə (1-ci ən yaxşı).
 * Söz uzunluğu çarpanı ilə vurulur.
 */
const BASE_RP_BY_ATTEMPT = [50, 40, 30, 20, 12, 6]; // 1-ci...6-cı cəhd
const RP_LOSS_DEFEAT     = -15;   // Məğlubiyyətdə itirilir
const RP_HINT_PENALTY    = 5;     // Hər ipucu üçün cəza (çıxılır)
const RP_EXTRAGUESS_PENALTY = 8;  // Əlavə cəhd ipucu daha ağır cəza

/**
 * Söz uzunluğu çarpanı:
 *   4 hərf → 0.8×  (Asan)
 *   5 hərf → 1.0×  (Orta, standart)
 *   6 hərf → 1.3×  (Çətin)
 */
const LENGTH_MULTIPLIER = { 4: 0.8, 5: 1.0, 6: 1.3 };

/**
 * Streak bonusu: hər 3 ardıcıl gün üçün +5 RP (maks +20)
 */
function streakBonus(streak) {
  return Math.min(Math.floor(streak / 3) * 5, 20);
}

/**
 * Hər oyundan sonra qazanılan/itirilən RP-ni hesabla.
 *
 * @param {object} p
 * @param {boolean}  p.won          - Oyun qazanıldımı
 * @param {number}   p.attempt      - Neçənci cəhddə tapıldı (1–maxGuesses)
 * @param {number}   p.wordLen      - Söz uzunluğu (4|5|6)
 * @param {number}   p.streak       - Cari ardıcıl gün sayı (daily rejim üçün)
 * @param {boolean}  p.isDaily      - Günün sözüdürmü
 * @param {object}   p.hints        - Oyunda istifadə edilən ipucular (gameState.hints)
 * @returns {{ rp: number, breakdown: object }}
 */
export function calcRatingPoints({ won, attempt, wordLen = 5, streak = 0, isDaily = false, hints = {} }) {
  if (!won) {
    return {
      rp: RP_LOSS_DEFEAT,
      breakdown: { base: RP_LOSS_DEFEAT, lengthMult: 1, streakBonus: 0, hintPenalty: 0, total: RP_LOSS_DEFEAT },
    };
  }

  const base    = BASE_RP_BY_ATTEMPT[attempt - 1] ?? BASE_RP_BY_ATTEMPT.at(-1);
  const mult    = LENGTH_MULTIPLIER[wordLen] ?? 1.0;
  const sBonus  = isDaily ? streakBonus(streak) : 0;

  // İpucu cəzaları (mənfi ədəd — RP-dən çıxılır)
  let hintPenalty = 0;
  hintPenalty -= (hints.reveal     ?? 0) * Math.abs(RP_HINT_PENALTY);
  hintPenalty -= (hints.present    ?? 0) * Math.abs(RP_HINT_PENALTY);
  hintPenalty -= (hints.eliminate  ?? 0) * Math.abs(RP_HINT_PENALTY);
  hintPenalty -= (hints.meaning    ?? 0) * Math.abs(RP_HINT_PENALTY);
  hintPenalty -= (hints.extraguess ?? 0) * Math.abs(RP_EXTRAGUESS_PENALTY);
  // hintPenalty <= 0

  const rawRP   = Math.round(base * mult) + sBonus + hintPenalty;
  const finalRP = Math.max(rawRP, 1); // Qalibliyə heç olmasa +1 RP

  return {
    rp: finalRP,
    breakdown: {
      base: Math.round(base * mult),
      lengthMult: mult,
      streakBonus: sBonus,
      hintPenalty,
      total: finalRP,
    },
  };
}

/**
 * Mövcud RP-yə görə tier tap.
 * @param {number} rp
 * @returns {object} - TIERS elementlərindən biri
 */
export function getTierForRP(rp) {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (rp >= t.minRP) tier = t;
  }
  return tier;
}

/**
 * Növbəti tieri ver (null = artıq zirvədədir).
 * @param {object} currentTier
 */
export function getNextTier(currentTier) {
  const idx = TIERS.findIndex(t => t.id === currentTier.id);
  return TIERS[idx + 1] ?? null;
}

/**
 * Növbəti tier üçün progress (0.0 – 1.0).
 * Əfsanədə həmişə 1.0 qaytarır.
 */
export function getTierProgress(rp) {
  const current = getTierForRP(rp);
  const next    = getNextTier(current);
  if (!next) return 1.0;
  const range = next.minRP - current.minRP;
  const done  = rp - current.minRP;
  return Math.min(done / range, 1.0);
}

/**
 * Tier düşməyə qarşı qoruma:
 * Yeni tier-ə girib 10 RP-dən az sahib olmadıqca tier düşmür.
 * Bu funksiyanı store.js-dəki applyRP() çağırır.
 *
 * @param {number} currentRP - Hal-hazırki RP
 * @param {number} delta     - Əlavə/çıxılacaq RP (mənfi ola bilər)
 * @returns {number} - Yeni RP (0-dan aşağı düşmür)
 */
export function applyRPDelta(currentRP, delta) {
  const newRP   = currentRP + delta;
  const curTier = getTierForRP(currentRP);
  const minFloor = curTier.minRP; // Tierin minimumu

  // Tierin minRP-sinin 10 altına enməyə izin vermə
  // (Yeni tirə düşmə tamponlaşdırılır)
  const protected_ = Math.max(newRP, minFloor - 10);
  return Math.max(protected_, 0);
}
