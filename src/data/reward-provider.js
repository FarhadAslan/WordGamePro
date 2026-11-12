/**
 * RewardProvider — Gələcək rewarded reklam inteqrasiyası üçün boş interfeys.
 *
 * İstifadə:
 *   const reward = await RewardProvider.show();
 *   if (reward.granted) addCoins(reward.coins);
 *
 * Reklam SDK (AdMob, AppLovin və s.) əlavə edildikdə bu sinifi genişləndirin.
 * Hazırda mock implementation qaytarır (istifadəçiyə heç nə göstərilmir).
 */

export class RewardProvider {
  /**
   * Rewarded reklam göstər.
   * @returns {Promise<{ granted: boolean, coins: number }>}
   */
  static async show() {
    // TODO: AdMob / AppLovin inteqrasiyası
    // Hazırda: həmişə uğursuz (reklam yoxdur)
    return { granted: false, coins: 0 };
  }

  /**
   * Reklam mövcuddurmu yoxla.
   * @returns {Promise<boolean>}
   */
  static async isAvailable() {
    return false; // TODO: SDK yükləndikdə güncəllə
  }
}
