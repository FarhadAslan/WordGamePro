/**
 * Söz Tap — main.js
 * Tətbiqin giriş nöqtəsi. Bütün modulları birləşdirir.
 */
import { loadDictionary }           from './game/dict.js';
import { gameState, EV, MODE, wordLenForMode } from './game/state.js';
import { getDayNumber, msUntilNextDay, formatCountdown } from './game/daily.js';
import { buildShareGrid }           from './game/evaluate.js';
import { Board }                    from './ui/board.js';
import { Keyboard }                 from './ui/keyboard.js';
import { showToast }                from './ui/toast.js';
import { launchConfetti }           from './ui/confetti.js';
import { openScreen, closeScreen, anyScreenOpen, closeTopScreen } from './ui/screens.js';
import { initHintsUI, updateHintButtons } from './ui/hints-ui.js';
import { initRatingUI, showRatingScreen, getRatingResultHTML } from './ui/rating-ui.js';
import { sounds, setSoundEnabled, resumeAudio } from './audio/sounds.js';
import { haptics, setHapticsEnabled }   from './audio/haptics.js';
import {
  loadPrefs, savePrefs,
  loadStats
} from './storage/store.js';

// ---- Service Worker (PWA) ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ---- UI Elementlər ----
const boardEl    = document.getElementById('board');
const keyboardEl = document.getElementById('keyboard');
const appEl      = document.getElementById('app');
const loadingEl  = document.getElementById('app-loading');
const coinCountEl= document.getElementById('coin-count');
const modeLabelEl= document.getElementById('mode-label');

let board    = null;
let keyboard = null;
let prefs    = null;
let countdownInterval = null;

// =============================================
// YÜKLƏMƏ
// =============================================
async function init() {
  // Paralel: lüğət + ayarlar
  const [, loadedPrefs] = await Promise.all([
    loadDictionary(onDictProgress),
    loadPrefs(),
  ]);

  prefs = loadedPrefs;
  applyPrefs(prefs);

  // Lövhə + Klaviatura qur
  board    = new Board(boardEl);
  keyboard = new Keyboard(keyboardEl, handleKey);
  board.build();
  keyboard.build();

  // Oyun hadisələrini dinlə
  bindGameEvents();

  // İpucu UI
  initHintsUI(board, keyboard, prefs);

  // Reyting UI
  initRatingUI();

  // UI düymələri
  bindUIButtons();

  // Yükləmə ekranını gizlət
  loadingEl.classList.add('fade-out');
  setTimeout(() => {
    loadingEl.style.display = 'none';
    appEl.style.display = '';
    // Hər girişdə mod seçim ekranını göstər
    openScreen('mode-select');
  }, 350);

  // Görünürlük dəyişikliyi (arxa plandan qayıdış)
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Geri sayım başlat
  startCountdown();
}

function onDictProgress(p) {
  const bar = document.querySelector('.loading-bar-fill');
  if (bar) bar.style.width = `${Math.round(p * 100)}%`;
}

// =============================================
// AYARLAR
// =============================================
function applyPrefs(p) {
  document.documentElement.dataset.theme    = p.theme ?? 'dark';
  document.documentElement.dataset.contrast = p.contrast ? 'high' : '';
  setSoundEnabled(p.sound !== false);
  setHapticsEnabled(p.haptics !== false);

  document.getElementById('toggle-theme').checked    = p.theme !== 'light';
  document.getElementById('toggle-contrast').checked = !!p.contrast;
  document.getElementById('toggle-sound').checked    = p.sound !== false;
  document.getElementById('toggle-haptics').checked  = p.haptics !== false;
  document.getElementById('toggle-notif').checked    = !!p.notifications;
}

function bindSettingsToggles() {
  document.getElementById('toggle-theme').addEventListener('change', async e => {
    prefs.theme = e.target.checked ? 'dark' : 'light';
    document.documentElement.dataset.theme = prefs.theme;
    await savePrefs(prefs);
  });
  document.getElementById('toggle-contrast').addEventListener('change', async e => {
    prefs.contrast = e.target.checked;
    document.documentElement.dataset.contrast = prefs.contrast ? 'high' : '';
    await savePrefs(prefs);
  });
  document.getElementById('toggle-sound').addEventListener('change', async e => {
    prefs.sound = e.target.checked;
    setSoundEnabled(prefs.sound);
    await savePrefs(prefs);
  });
  document.getElementById('toggle-haptics').addEventListener('change', async e => {
    prefs.haptics = e.target.checked;
    setHapticsEnabled(prefs.haptics);
    await savePrefs(prefs);
  });
  document.getElementById('toggle-notif').addEventListener('change', async e => {
    prefs.notifications = e.target.checked;
    await savePrefs(prefs);
    if (prefs.notifications) scheduleNotification();
  });
}

// =============================================
// OYUN HADİSƏLƏRİ
// =============================================
function bindGameEvents() {
  gameState.on(EV.STATE_LOADED, onStateLoaded);
  gameState.on(EV.LETTER_ADD,  onLetterAdd);
  gameState.on(EV.LETTER_DEL,  onLetterDel);
  gameState.on(EV.GUESS_INVALID_SHORT, onInvalidShort);
  gameState.on(EV.GUESS_INVALID_DICT,  onInvalidDict);
  gameState.on(EV.GUESS_SUBMITTED,     onGuessSubmitted);
  gameState.on(EV.GAME_WIN,   onGameWin);
  gameState.on(EV.GAME_LOSE,  onGameLose);
  gameState.on(EV.COINS_CHANGE, onCoinsChange);
  gameState.on(EV.RATING_CHANGE, onRatingChange);
}

function onStateLoaded(snap) {
  // Lövhəni yenidən qur (maxGuesses və wordLen dəyişə bilər)
  board.build(snap.maxGuesses, snap.wordLen ?? 5);
  board.restore(snap.guesses, snap.results);
  keyboard.reset();
  keyboard.restore(snap.guesses, snap.results);
  updateModeLabel(snap.mode);
  updateCoinDisplay(snap.coins, false);
  updateHintButtons();

  // Oyun bitibsə nəticə ekranını göstər
  if (snap.isOver) {
    setTimeout(() => showResultScreen(snap), 600);
  }
}

function onLetterAdd({ letter, word }) {
  sounds.key();
  haptics.key();
  board.updateCurrentRow(gameState.guesses.length, word);
}

function onLetterDel({ word }) {
  sounds.delete?.();
  board.updateCurrentRow(gameState.guesses.length, word);
}

function onInvalidShort() {
  showToast('Söz tam deyil!');
  sounds.invalid();
  haptics.invalid();
  board.shakeRow(gameState.guesses.length);
}

function onInvalidDict() {
  showToast('Bu söz lüğətdə yoxdur');
  sounds.invalid();
  haptics.invalid();
  board.shakeRow(gameState.guesses.length);
}

async function onGuessSubmitted({ word, result, rowIndex }) {
  // Animasiya — reveal
  await board.revealRow(rowIndex, word, result);
  keyboard.applyResults(word, result);

  // Hər hərfin səsi
  result.forEach((r, i) => {
    setTimeout(() => {
      if (r === 'correct') sounds.correct?.();
      else if (r === 'present') sounds.present?.();
      else sounds.absent?.();
    }, i * 300);
  });

  gameState.revealDone();
  updateHintButtons();
}

function onGameWin({ attempt, earned, streak }) {
  board.bounceRow(gameState.guesses.length - 1);
  sounds.win?.();
  haptics.win?.();
  launchConfetti();
  setTimeout(() => showResultScreen({
    isWon:  true,
    secret: gameState.secret,
    attempt,
    earned,
    streak,
    results: gameState.results,
    mode:   gameState.mode,
    dateStr:gameState.dateStr,
    maxGuesses: gameState.maxGuesses,
  }), 1800);
}

function onGameLose({ secret, consolation }) {
  // revealRow animasiyası bitdikdən sonra nəticə ekranını göstər
  // 5 hərfli söz üçün animasiya ~1700ms, 6 hərfli ~2000ms
  // revealDone() onGuessSubmitted-dən sonra çağırılır, ona görə
  // burada biraz gözləyirik
  const revealMs = gameState.wordLen * 300 + 500;
  setTimeout(() => {
    sounds.lose?.();
    haptics.lose?.();
    showResultScreen({
      isWon:  false,
      secret,
      earned: consolation,
      results: gameState.results,
      mode:    gameState.mode,
      dateStr: gameState.dateStr,
      maxGuesses: gameState.maxGuesses,
    });
  }, revealMs + 400);
}

function onCoinsChange({ coins, delta }) {
  updateCoinDisplay(coins, delta > 0);
}

// Son RP dəyişikliyini yadda saxla (nəticə ekranında göstərmək üçün)
let _lastRPChange = null;
function onRatingChange(data) {
  _lastRPChange = data;
}

// =============================================
// NƏTİCƏ EKRANI
// =============================================
function showResultScreen(data) {
  const { isWon, secret, attempt, earned, results, mode, dateStr, maxGuesses } = data;

  document.getElementById('result-emoji').textContent  = isWon ? '🎉' : '😔';
  document.getElementById('result-title').textContent  = isWon ? 'Təbrik edirik!' : 'Növbəti dəfə!';
  document.getElementById('result-word').textContent   = `Cavab: ${secret}`;
  const coinsEl = document.getElementById('result-coins');
  if (earned) {
    coinsEl.innerHTML = `<span class="result-earned">+${earned}<svg class="coin-icon-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#C9A227" stroke="#a07a10" stroke-width="1.2"/><circle cx="10" cy="10" r="6" fill="none" stroke="#f5d060" stroke-width="1.2"/><circle cx="10" cy="10" r="2.5" fill="#f5d060"/></svg></span>`;
  } else {
    coinsEl.textContent = '';
  }

  // RP dəyişikliyi
  const rpChangeEl = document.getElementById('result-rp-change');
  if (rpChangeEl) {
    if (_lastRPChange) {
      rpChangeEl.innerHTML = getRatingResultHTML(_lastRPChange.delta, _lastRPChange.tierId);
      _lastRPChange = null;
    } else {
      rpChangeEl.innerHTML = '';
    }
  }

  // Paylaşma şəbəkəsi
  const shareEl = document.getElementById('share-grid');  shareEl.innerHTML = '';
  const E = { correct:'🟩', present:'🟨', absent:'⬛' };
  results.forEach(row => {
    const line = document.createElement('div');
    line.style.cssText = 'width:100%;text-align:center;';
    line.textContent = row.map(r => E[r] ?? '⬜').join('');
    shareEl.appendChild(line);
  });

  // Geri sayım (Günün sözü üçün)
  const countdownWrap = document.getElementById('result-countdown-wrap');
  if (mode === MODE.DAILY) {
    countdownWrap.removeAttribute('hidden');
    updateResultCountdown();
  } else {
    countdownWrap.setAttribute('hidden', '');
  }

  openScreen('result');
}

function updateResultCountdown() {
  const el = document.getElementById('result-countdown');
  if (!el) return;
  el.textContent = formatCountdown(msUntilNextDay());
}

// =============================================
// SİKKƏ DİSPLEYİ
// =============================================
function updateCoinDisplay(coins, animate = false) {
  if (!coinCountEl) return;
  coinCountEl.textContent = coins;
  if (animate) {
    coinCountEl.classList.remove('bump');
    void coinCountEl.offsetWidth;
    coinCountEl.classList.add('bump');
    sounds.coin?.();
    haptics.coin?.();
  }
}

// =============================================
// REJİM ETİKETİ
// =============================================
function updateModeLabel(mode) {
  if (!modeLabelEl) return;
  const labels = {
    [MODE.DAILY]: 'Günün Sözü',
    [MODE.LEN4]:  'Asan (4)',
    [MODE.LEN5]:  'Orta (5)',
    [MODE.LEN6]:    'Çətin (6)',
  };
  modeLabelEl.textContent = labels[mode] ?? mode;
}

// =============================================
// DÜYMƏ BAĞLAMALARI
// =============================================
function bindUIButtons() {
  // Mod seçim ekranı düymələri
  document.getElementById('btn-mode-4')?.addEventListener('click', () => startMode(MODE.LEN4));
  document.getElementById('btn-mode-5')?.addEventListener('click', () => startMode(MODE.LEN5));
  document.getElementById('btn-mode-6')?.addEventListener('click', () => startMode(MODE.LEN6));
  document.getElementById('close-mode-select')?.addEventListener('click', () => closeScreen('mode-select'));

  // Üst paneldəki mod etiketi kliklenəndə mod seçim ekranını aç
  document.getElementById('mode-label')?.addEventListener('click', () => {
    // Oyun gedərkən bağla düyməsini göstər
    const closeBtn = document.getElementById('close-mode-select');
    if (closeBtn) closeBtn.removeAttribute('hidden');
    openScreen('mode-select');
  });

  // Üst panel
  document.getElementById('btn-menu')    ?.addEventListener('click', () => openScreen('menu'));

  // Yeni Oyun düyməsi (topbar)
  document.getElementById('btn-new-game-top')?.addEventListener('click', () => {
    const closeBtn = document.getElementById('close-mode-select');
    if (closeBtn) closeBtn.removeAttribute('hidden');
    openScreen('mode-select');
  });

  // Menyu
  document.getElementById('btn-daily')       ?.addEventListener('click', () => startMode(MODE.DAILY));
  document.getElementById('btn-mode-select') ?.addEventListener('click', () => {
    closeScreen('menu');
    // Oyun gedərkən bağla düyməsini göstər
    const closeBtn = document.getElementById('close-mode-select');
    if (closeBtn) closeBtn.removeAttribute('hidden');
    openScreen('mode-select');
  });
  document.getElementById('btn-stats-menu')  ?.addEventListener('click', () => { closeScreen('menu'); showStats(); });
  document.getElementById('btn-rules-menu')  ?.addEventListener('click', () => { closeScreen('menu'); openScreen('rules'); });
  document.getElementById('btn-settings-menu')?.addEventListener('click', () => { closeScreen('menu'); openScreen('settings'); });
  document.getElementById('btn-about-menu')  ?.addEventListener('click', () => { closeScreen('menu'); openScreen('about'); });
  document.getElementById('btn-rating-menu') ?.addEventListener('click', () => { closeScreen('menu'); showRatingScreen(); });

  // Reyting ekranı bağla
  document.getElementById('close-rating')?.addEventListener('click', () => {
    document.getElementById('screen-rating')?.setAttribute('hidden', '');
  });

  // Nəticə ekranı
  document.getElementById('btn-share')          ?.addEventListener('click', shareResult);
  document.getElementById('btn-new-game-result') ?.addEventListener('click', () => {
    closeScreen('result');
    openScreen('mode-select');
  });

  // Statistika
  document.getElementById('statsBtn')?.addEventListener('click', showStats);

  // Ayarlar toggle-ları
  bindSettingsToggles();

  // Birinci toxunuşda audio resume
  document.addEventListener('click', resumeAudio, { once: true });
  document.addEventListener('touchstart', resumeAudio, { once: true });
}

async function startMode(mode) {
  closeScreen('mode-select');
  closeScreen('menu');
  closeScreen('result');
  await gameState.init(mode, true);
}
// =============================================
// STATİSTİKA
// =============================================
async function showStats() {
  const stats = await loadStats();
  const pct   = stats.played > 0 ? Math.round(stats.wins / stats.played * 100) : 0;

  document.getElementById('st-played').textContent   = stats.played;
  document.getElementById('st-wins').textContent     = stats.wins;
  document.getElementById('st-pct').textContent      = pct + '%';
  document.getElementById('st-streak').textContent   = stats.streak;
  document.getElementById('st-maxstreak').textContent= stats.maxStreak;
  document.getElementById('st-coins').textContent    = stats.totalCoins ?? 0;

  // Paylanma
  const chartEl = document.getElementById('dist-chart');
  chartEl.innerHTML = '';
  const max = Math.max(...stats.dist, 1);
  const frag = document.createDocumentFragment();
  stats.dist.forEach((count, i) => {
    const pct2 = Math.round(count / max * 100);
    const row  = document.createElement('div');
    row.className = 'dist-row';
    const isCurrent = gameState.isOver && gameState.isWon
      && gameState.guesses.length === i + 1;
    row.innerHTML =
      `<span class="dist-num">${i + 1}</span>` +
      `<div class="dist-bar${isCurrent ? ' current' : ''}" style="width:${Math.max(pct2, 5)}%">${count}</div>`;
    frag.appendChild(row);
  });
  chartEl.appendChild(frag);

  // İpucu notu
  document.getElementById('st-hint-note').textContent =
    stats.gamesWithHints ? `${stats.gamesWithHints} oyunda ipucu istifadə edilib` : '';

  openScreen('stats');
}

// =============================================
// PAYLAŞMA
// =============================================
async function shareResult() {
  const day     = gameState.mode === MODE.DAILY ? ` #${getDayNumber(gameState.dateStr)}` : '';
  const result  = gameState.isWon ? `${gameState.guesses.length}/${gameState.maxGuesses}` : 'X/6';
  const grid    = buildShareGrid(gameState.results, prefs?.contrast);
  const text    = `Söz Tap${day} ${result}\n\n${grid}\n\nhttps://word-game-nine-alpha.vercel.app/`;

  // Web Share API və ya clipboard
  if (navigator.share) {
    try {
      await navigator.share({ text });
    } catch {}
  } else if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Panoya kopyalandı! 📋');
    } catch {
      showToast('Paylaşma mümkün olmadı');
    }
  }
}

// =============================================
// GERİ SAYIM
// =============================================
function startCountdown() {
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const ms = msUntilNextDay();
    const str = formatCountdown(ms);

    const bannerEl = document.getElementById('next-countdown');
    if (bannerEl) bannerEl.textContent = str;
    updateResultCountdown();

    // Gecəyarısı keçidi
    if (ms < 1000) {
      gameState.checkDayRollover();
    }
  }, 1000);
}

// =============================================
// GÖRÜNÜRLÜK DƏYİŞİKLİYİ
// =============================================
async function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    const rolled = await gameState.checkDayRollover();
    if (rolled) showToast('Yeni gün — yeni söz! 🌅');
  }
}

// Android back düyməsi dəstəyi web versiyasında yoxdur

// =============================================
// KLAVİATURA
// =============================================
function handleKey(key) {
  if (anyScreenOpen()) return; // Modal açıqdırsa klaviatura girişi yox
  resumeAudio();
  if (key === 'ENTER') {
    gameState.submitGuess();
  } else if (key === '⌫') {
    gameState.deleteLetter();
  } else {
    gameState.addLetter(key);
  }
}

// Bildiriş funksiyası web versiyasında deaktiv
async function scheduleNotification() {
  // Web brauzerlərdə push bildirişlər üçün Service Worker lazımdır
  // Sadə versiyada yoxdur
}

// =============================================
// BAŞLANĞIC
// =============================================
init().catch(console.error);
