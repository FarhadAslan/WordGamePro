/**
 * Xal (Sikkə) Sistemi — Balans Konfiqurasiyası
 * Bu faylı dəyişdirərək bütün iqtisadi balansı tənzimləyin.
 */
export const ECONOMY = {
  // Başlanğıc balansı
  startingCoins: 100,

  // Qazanma
  winCoins: [100, 80, 60, 45, 30, 20], // 1-ci...6-cı cəhddə qazanma
  dailyBonus: 25,          // Günün sözünü tapmaq bonusu
  streakBonusPerDay: 5,    // Hər ardıcıl gün üçün əlavə
  streakBonusMax: 50,      // Seriya bonusu maksimumu
  defeatConsole: 5,        // Məğlubiyyət təsəllisi

  // İpucu qiymətləri
  hints: {
    reveal:     { cost: 40, maxPerGame: 2 },   // 💡 Hərf aç
    present:    { cost: 25, maxPerGame: 2 },   // 🔎 Var olan hərf
    eliminate:  { cost: 30, maxPerGame: 1 },   // 🧹 Artıq hərfləri sil (5 hərf söndürür)
    meaning:    { cost: 50, maxPerGame: 1 },   // 📖 Məna/İpucu
    extraguess: { cost: 80, maxPerGame: 1 },   // ➕ Əlavə cəhd
  },
  maxHintsPerGame: 2,     // Bir oyunda istifadə edilə biləcək ümumi joker sayı

  // Reward reklam interfeysi (gələcək inteqrasiya üçün boş)
  // RewardProvider.show() → Promise<{ coins: number }>
  rewardAdCoins: 50,       // Reklam izlədikdə verilən xal
};

/**
 * Cəhd sayına görə qazanılan xalı hesabla.
 * @param {number} attempt - 1-dən başlayan cəhd nömrəsi
 * @param {boolean} isDaily - Günün sözüdürsə əlavə bonus
 * @param {number} streak - Cari ardıcıl gün sayı
 */
export function calcWinCoins(attempt, isDaily, streak) {
  const base   = ECONOMY.winCoins[attempt - 1] ?? ECONOMY.winCoins.at(-1);
  const daily  = isDaily ? ECONOMY.dailyBonus : 0;
  const bonus  = Math.min(streak * ECONOMY.streakBonusPerDay, ECONOMY.streakBonusMax);
  return base + daily + bonus;
}
