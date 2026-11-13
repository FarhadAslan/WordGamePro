/**
 * İpucu UI — düymə vəziyyəti, təsdiq modalı, nəticə göstərmə
 */
import { ECONOMY }           from '../data/economy.js';
import { gameState, EV }     from '../game/state.js';
import { showToast }         from './toast.js';
import { openScreen, closeScreen } from './screens.js';
import { haptics }           from '../audio/haptics.js';
import { sounds }            from '../audio/sounds.js';

let _board    = null;
let _keyboard = null;
let _prefs    = null;
let _pendingHint = null;
let _skipConfirm = false;

export function initHintsUI(board, keyboard, prefs) {
  _board    = board;
  _keyboard = keyboard;
  _prefs    = prefs;

  // Joker haqqı düyməsi — açıb/bağla
  const jokerBtn   = document.getElementById('btn-joker');
  const jokerPanel = document.getElementById('joker-panel');
  const jokerClose = document.getElementById('joker-close');

  jokerBtn?.addEventListener('click', () => {
    const isOpen = !jokerPanel.hidden;
    jokerPanel.hidden = isOpen;
    jokerBtn.setAttribute('aria-expanded', String(!isOpen));
  });

  jokerClose?.addEventListener('click', () => {
    jokerPanel.hidden = true;
    jokerBtn?.setAttribute('aria-expanded', 'false');
  });

  // Panelin xaricinə tıklandıqda bağla
  document.addEventListener('click', (e) => {
    if (!jokerPanel.hidden &&
        !jokerPanel.contains(e.target) &&
        !jokerBtn.contains(e.target)) {
      jokerPanel.hidden = true;
      jokerBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  // İpucu düymələri
  document.querySelectorAll('.hint-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.hint;
      // Paneli bağla, sonra hint işlət
      jokerPanel.hidden = true;
      jokerBtn?.setAttribute('aria-expanded', 'false');
      requestHint(type);
    });
  });

  // Təsdiq modalı
  document.getElementById('hint-confirm-yes')?.addEventListener('click', async () => {
    closeScreen('hintConfirm');
    if (_pendingHint) {
      await executeHint(_pendingHint);
      _pendingHint = null;
    }
  });
  document.getElementById('hint-confirm-no')?.addEventListener('click', () => {
    closeScreen('hintConfirm');
    _pendingHint = null;
  });
  document.getElementById('hint-confirm-skip')?.addEventListener('change', e => {
    _skipConfirm = e.target.checked;
    // Prefs-ə yaz
    if (_prefs) {
      _prefs.hintConfirmSkip = _skipConfirm;
    }
  });

  // Oyun hadisələri — düymə vəziyyətlərini yenilə
  gameState.on(EV.COINS_CHANGE, updateHintButtons);
  gameState.on(EV.HINT_USED,    updateHintButtons);
  gameState.on(EV.STATE_LOADED, updateHintButtons);
}

function requestHint(type) {
  if (gameState.isOver || gameState.isRevealing) return;

  const cfg = ECONOMY.hints[type];
  if (!cfg) return;

  if (gameState.coins < cfg.cost) {
    showToast('Xal çatmır! 🪙');
    haptics.invalid();
    return;
  }

  if ((gameState.hints[type] ?? 0) >= cfg.maxPerGame) {
    showToast('Bu ipucunu artıq istifadə etdiniz');
    return;
  }

  if (_skipConfirm || (typeof _prefs?.hintConfirmSkip === 'boolean' && _prefs.hintConfirmSkip)) {
    executeHint(type);
    return;
  }

  // Təsdiq modalı
  _pendingHint = type;
  const names = {
    reveal:     'Hərf Aç',
    present:    'Var Olan Hərf',
    eliminate:  'Artıq Hərfləri Sil',
    meaning:    'Məna/İpucu',
    extraguess: 'Əlavə Cəhd',
  };
  document.getElementById('hint-confirm-text').textContent =
    `"${names[type]}" ipucunu istifadə etmək üçün ${cfg.cost}🪙 xərclənəcək. Davam edin?`;
  openScreen('hintConfirm');
}

async function executeHint(type) {
  const res = await gameState.useHint(type);
  if (!res.ok) {
    if (res.reason === 'noCoins')          showToast('Xal çatmır! 🪙');
    if (res.reason === 'limitReached')     showToast('Bu ipucunun limiti dolub');
    if (res.reason === 'totalLimitReached')showToast(`Bu oyunda maksimum 2 joker istifadə edə bilərsiniz! 🃏`);
    return;
  }

  sounds.hint?.();
  haptics.hint?.();

  const r = res.result;
  if (!r) return;

  switch (type) {
    case 'reveal':
      _board?.revealHintTile(gameState.guesses.length, r.position, r.letter);
      showToast(`${r.position + 1}-ci mövqe: ${r.letter} 💡`);
      break;
    case 'present':
      showToast(`"${r.letter}" hərfi sözdədir 🔎`);
      break;
    case 'eliminate':
      _keyboard?.eliminateKeys(r.eliminated);
      showToast(`${r.eliminated.join(', ')} hərfləri sözdə yoxdur 🧹`);
      break;
    case 'meaning':
      showToast(r.hint + ' 📖', 4000);
      break;
    case 'extraguess':
      _board?.addExtraRow();
      showToast('7-ci cəhd əlavə edildi ➕');
      break;
  }
}

export function updateHintButtons() {
  const { coins, hints, isOver, isRevealing } = gameState;

  // Ümumi istifadə sayı
  const totalUsed = (hints.reveal ?? 0) + (hints.present ?? 0) +
                    (hints.eliminate ?? 0) + (hints.meaning ?? 0) +
                    (hints.extraguess ?? 0);
  const totalMaxed = totalUsed >= ECONOMY.maxHintsPerGame;

  document.querySelectorAll('.hint-btn').forEach(btn => {
    const type = btn.dataset.hint;
    const cfg  = ECONOMY.hints[type];
    if (!cfg) return;

    const noCoins  = coins < cfg.cost;
    const maxed    = (hints[type] ?? 0) >= cfg.maxPerGame;
    const disabled = isOver || isRevealing || noCoins || maxed || totalMaxed;

    btn.disabled = disabled;
    btn.title    = totalMaxed ? `Bu oyun üçün ${ECONOMY.maxHintsPerGame} joker limiti dolub`
                 : maxed      ? 'Bu ipucunun limiti dolub'
                 : noCoins    ? 'Xal çatmır'
                 : '';
  });
}
