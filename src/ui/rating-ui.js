/**
 * Reyting UI
 * - Topbar-da tier badge göstərir
 * - Tier yüksəlmə/düşmə toast bildirişi
 * - Reyting ekranı (statistika içindəki reyting paneli)
 * - Oyun nəticəsindəki RP dəyişikliyi göstəricisi
 */
import { gameState, EV }                              from '../game/state.js';
import { TIERS, getTierForRP, getNextTier, getTierProgress } from '../data/rating.js';
import { showToast }                                  from './toast.js';

/** Topbar-dakı tier badge elementi */
let _badgeEl = null;

/**
 * Reyting UI-ni işə sal.
 * Topbar-a tier badge əlavə edir, hadisələri dinləyir.
 */
export function initRatingUI() {
  _createTopbarBadge();
  gameState.on(EV.RATING_CHANGE, onRatingChange);
  gameState.on(EV.STATE_LOADED,  onStateLoaded);
}

function _createTopbarBadge() {
  // Topbar-ın sağ panelindəki coin-display-dən əvvəl yerləşdir
  const coinDisplay = document.querySelector('.coin-display');
  if (!coinDisplay) return;

  const badge = document.createElement('button');
  badge.id        = 'rating-badge';
  badge.className = 'rating-badge';
  badge.setAttribute('aria-label', 'Reyting');
  badge.setAttribute('type', 'button');
  badge.addEventListener('click', showRatingScreen);

  coinDisplay.parentElement.insertBefore(badge, coinDisplay);
  _badgeEl = badge;
}

function _updateBadge(rp) {
  if (!_badgeEl) return;
  const tier = getTierForRP(rp);
  _badgeEl.textContent   = tier.emoji;
  _badgeEl.title         = `${tier.label} — ${rp} RP`;
  _badgeEl.style.setProperty('--tier-color', tier.color);
  _badgeEl.dataset.tier  = tier.id;
}

function onStateLoaded(snap) {
  _updateBadge(snap.rating?.rp ?? 0);
}

function onRatingChange({ rp, delta, tierId, tierUp, tierDown, tier }) {
  _updateBadge(rp);

  // Tier yüksəlmə/düşmə bildirişi
  if (tierUp) {
    showToast(`🎉 Yeni dərəcə: ${tier.emoji} ${tier.label}!`, 3500);
  } else if (tierDown) {
    showToast(`📉 Dərəcə düşdü: ${tier.emoji} ${tier.label}`, 2500);
  }
}

// =============================================
// REYTİNG EKRANI
// =============================================
export function showRatingScreen() {
  const { rp, history } = gameState.rating ?? { rp: 0, history: [] };
  const tier     = getTierForRP(rp);
  const nextTier = getNextTier(tier);
  const progress = getTierProgress(rp);

  const screen = document.getElementById('screen-rating');
  if (!screen) return;

  // Hal-hazırki tier
  document.getElementById('rt-tier-emoji').textContent = tier.emoji;
  document.getElementById('rt-tier-name').textContent  = tier.label;
  document.getElementById('rt-rp-value').textContent   = `${rp} RP`;
  document.getElementById('rt-tier-emoji').style.setProperty('--tier-color', tier.color);

  // Progress bar
  const bar = document.getElementById('rt-progress-bar');
  bar.style.setProperty('--tier-color', tier.color);
  bar.querySelector('.rt-progress-fill').style.width = `${Math.round(progress * 100)}%`;

  if (nextTier) {
    document.getElementById('rt-next-tier').textContent =
      `${nextTier.emoji} ${nextTier.label} üçün ${nextTier.minRP} RP lazımdır`;
  } else {
    document.getElementById('rt-next-tier').textContent = '🏆 Zirvədəsiniz!';
  }

  // Tier sıralaması
  _renderTierList(rp, tier);

  // Tarixçə
  _renderHistory(history);

  // Ekranı göstər
  screen.removeAttribute('hidden');
}

function _renderTierList(rp, currentTier) {
  const listEl = document.getElementById('rt-tier-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const frag = document.createDocumentFragment();
  [...TIERS].reverse().forEach(t => {
    const item = document.createElement('div');
    item.className = 'rt-tier-item' +
      (t.id === currentTier.id ? ' current' : '') +
      (rp >= t.minRP           ? ' reached' : '');
    item.style.setProperty('--tier-color', t.color);
    item.innerHTML =
      `<span class="rt-tier-emoji">${t.emoji}</span>` +
      `<span class="rt-tier-label">${t.label}</span>` +
      `<span class="rt-tier-min">${t.minRP} RP</span>`;
    frag.appendChild(item);
  });
  listEl.appendChild(frag);
}

function _renderHistory(history) {
  const el = document.getElementById('rt-history');
  if (!el) return;
  el.innerHTML = '';
  if (!history?.length) {
    el.textContent = 'Hələ oyun yoxdur.';
    return;
  }
  const frag = document.createDocumentFragment();
  history.forEach(h => {
    const row = document.createElement('div');
    row.className = `rt-hist-row ${h.delta >= 0 ? 'pos' : 'neg'}`;
    const tierObj = TIERS.find(t => t.id === h.tierId) ?? TIERS[0];
    row.innerHTML =
      `<span class="rt-hist-tier">${tierObj.emoji}</span>` +
      `<span class="rt-hist-date">${h.date ?? ''}</span>` +
      `<span class="rt-hist-delta">${h.delta >= 0 ? '+' : ''}${h.delta} RP</span>`;
    frag.appendChild(row);
  });
  el.appendChild(frag);
}

/**
 * Nəticə ekranında göstəriləcək RP dəyişikliyini format et.
 * main.js-dəki showResultScreen funksiyasından çağırılır.
 */
export function getRatingResultHTML(delta, tierId) {
  const tier = TIERS.find(t => t.id === tierId) ?? TIERS[0];
  const sign = delta >= 0 ? '+' : '';
  const cls  = delta >= 0 ? 'rp-gain' : 'rp-loss';
  return `<span class="result-rp ${cls}" style="--tier-color:${tier.color}">` +
         `${tier.emoji} <strong>${sign}${delta} RP</strong></span>`;
}
