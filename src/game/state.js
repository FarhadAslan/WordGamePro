/**
 * Oyun Vəziyyəti Modulu
 * Bütün oyun məntiqi buradadır. UI bura daxil olmur.
 */
import { azUpper, normalize, strLen, AZ_ALPHABET } from '../data/alphabet.js';
import { evaluate, buildShareGrid } from './evaluate.js';
import { isValidGuess }               from './dict.js';
import { getBakuDateStr, getDailyWord, getDayNumber } from './daily.js';
import {
  saveGameState, loadGameState, clearGameState,
  loadStats, saveStats, loadCoins, saveCoins,
  loadHintState, saveHintState, clearHintState,
  loadRating, saveRating,
} from '../storage/store.js';
import { ECONOMY, calcWinCoins } from '../data/economy.js';
import { calcRatingPoints, getTierForRP, applyRPDelta, RP_LOSS_ABANDON } from '../data/rating.js';
import { getAnswers }             from './dict.js';

export let WORD_LEN   = 5;
export const MAX_GUESSES_DEFAULT = 6;

/** Rejim sabiti */
export const MODE = { DAILY: 'daily', LEN4: 'len4', LEN5: 'len5', LEN6: 'len6' };

/** Rejim üçün söz uzunluğu */
export function wordLenForMode(mode) {
  if (mode === MODE.LEN4) return 4;
  if (mode === MODE.LEN6) return 6;
  return 5; // daily, len5
}

/** Oyun hadisəsi növləri */
export const EV = {
  LETTER_ADD: 'letterAdd',
  LETTER_DEL: 'letterDel',
  GUESS_INVALID_SHORT:  'guessInvalidShort',
  GUESS_INVALID_DICT:   'guessInvalidDict',
  GUESS_SUBMITTED:      'guessSubmitted',
  GAME_WIN:    'gameWin',
  GAME_LOSE:   'gameLose',
  HINT_USED:   'hintUsed',
  COINS_CHANGE:'coinsChange',
  STATE_LOADED:'stateLoaded',
  RATING_CHANGE: 'ratingChange', // { rp, delta, tierId, prevTierId, tierUp, tierDown }
};

export class GameState {
  constructor() {
    this.mode        = MODE.DAILY;
    this.wordLen     = 5;
    this.secret      = '';
    this.guesses     = [];    // ['NƏFƏS', ...]
    this.results     = [];    // [['correct',...], ...]
    this.currentWord = '';    // klaviaturada daxil edilən
    this.maxGuesses  = MAX_GUESSES_DEFAULT;
    this.isOver      = false;
    this.isWon       = false;
    this.isRevealing = false; // animasiya zamanı giriş kilidlənir
    this.dateStr     = getBakuDateStr();
    this.coins       = ECONOMY.startingCoins;
    this.stats       = null;
    this.hints       = {      // ipucu sayğacları
      reveal:     0,
      present:    0,
      eliminate:  0,
      meaning:    0,
      extraguess: 0,
      usedInGame: false,
      revealedPositions: [], // 'reveal' ipucusu ilə açılmış mövqelər
      presentLetters:    [], // 'present' ipucusu ilə göstərilmiş hərflər
    };
    this.recentEndless = []; // Sonsuz rejimdə son 200 söz
    this.rating = { rp: 0, tierId: 'newcomer', history: [] }; // Reyting vəziyyəti
    this._listeners = {};
  }
  // ---- Hadisə sistemi ----
  on(event, fn)  { (this._listeners[event] ??= []).push(fn); }
  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  }
  emit(event, data) {
    (this._listeners[event] ?? []).forEach(fn => fn(data));
  }

  // ---- Yükləmə ----
  async init(mode = MODE.DAILY, forceNew = false) {
    this.mode  = mode;
    this.wordLen = wordLenForMode(mode);
    WORD_LEN   = this.wordLen;
    this.stats = await loadStats();
    this.coins = await loadCoins();
    this.rating = await loadRating();

    if (!forceNew && mode === MODE.DAILY) {
      const saved = await loadGameState();
      if (saved && saved.mode === MODE.DAILY && saved.dateStr === getBakuDateStr()) {
        await this._restore(saved);
        this.emit(EV.STATE_LOADED, this._snapshot());
        return;
      }
    }

    await this._startNew();
    this.emit(EV.STATE_LOADED, this._snapshot());
  }

  /**
   * Saxlanmış yarımçıq oyunu bərpa et (bütün rejimlərdə).
   * App başlayanda çağırılır. Bərpa olunsa true, yoxsa false.
   */
  async resume() {
    this.stats  = await loadStats();
    this.coins   = await loadCoins();
    this.rating  = await loadRating();

    const saved = await loadGameState();
    if (!saved || saved.isOver) return false;

    // DAILY rejimində tarix yoxla — köhnə günün sözü etibarsızdır
    if (saved.mode === MODE.DAILY && saved.dateStr !== getBakuDateStr()) {
      return false;
    }

    this.mode    = saved.mode;
    this.wordLen = wordLenForMode(this.mode);
    WORD_LEN     = this.wordLen;
    await this._restore(saved);
    this.emit(EV.STATE_LOADED, this._snapshot());
    return true;
  }

  /**
   * Cari oyunu yarımçıq saxlayıb yeni oyuna keçəndə RP cəzası tətbiq et.
   * Oyun bitibsə və ya heç cəhd edilməyibsə cəza yoxdur.
   * @returns {{penalty: number} | null}
   */
  async abandonGame() {
    if (this.isOver || this.guesses.length === 0) return null;

    const prevRP   = this.rating.rp;
    const prevTier = getTierForRP(prevRP);
    const penalty  = RP_LOSS_ABANDON;
    const newRP    = applyRPDelta(prevRP, penalty);
    const newTier  = getTierForRP(newRP);

    this.rating.rp     = newRP;
    this.rating.tierId = newTier.id;
    this.rating.history = [
      { delta: penalty, tierId: newTier.id, date: getBakuDateStr(), won: false, abandoned: true },
      ...(this.rating.history ?? []),
    ].slice(0, 20);

    await saveRating(this.rating);
    this.emit(EV.RATING_CHANGE, {
      rp:         newRP,
      delta:      penalty,
      tierId:     newTier.id,
      prevTierId: prevTier.id,
      tierUp:     false,
      tierDown:   newTier.minRP < prevTier.minRP,
      tier:       newTier,
    });

    return { penalty };
  }

  async _startNew() {
    this.dateStr    = getBakuDateStr();
    const len = wordLenForMode(this.mode);
    WORD_LEN        = len;
    this.wordLen    = len;

    // Gizli söz seçimi
    if (this.mode === MODE.DAILY) {
      this.secret = getDailyWord(this.dateStr) ?? this._pickEndlessWord();
    } else {
      // LEN4, LEN5, LEN6 — random seçim
      this.secret = this._pickEndlessWord();
    }

    this.guesses    = [];
    this.results    = [];
    this.currentWord = '';
    this.maxGuesses  = MAX_GUESSES_DEFAULT;
    this.isOver      = false;
    this.isWon       = false;
    this.isRevealing = false;
    this.hints       = { reveal: 0, present: 0, eliminate: 0, meaning: 0, extraguess: 0, usedInGame: false, revealedPositions: [], presentLetters: [] };
    await clearHintState();
    await this._save();
  }

  _pickEndlessWord() {
    const all = getAnswers(this.wordLen);
    if (!all.length) {
      // Fallback: 5 hərfli söz siyahısından götür
      const fb = getAnswers(5);
      return fb.length ? fb[Math.floor(Math.random() * fb.length)] : 'NƏFƏS';
    }
    const pool = all.filter(w => !this.recentEndless.includes(w));
    const src  = pool.length ? pool : all;
    const word = src[Math.floor(Math.random() * src.length)];
    this.recentEndless.push(word);
    if (this.recentEndless.length > 200) this.recentEndless.shift();
    return word;
  }

  async _restore(saved) {
    this.secret      = saved.secret      ?? '';
    this.guesses     = saved.guesses     ?? [];
    this.results     = saved.results     ?? [];
    this.currentWord = saved.currentWord ?? '';
    this.maxGuesses  = saved.maxGuesses  ?? MAX_GUESSES_DEFAULT;
    this.isOver      = saved.isOver      ?? false;
    this.isWon       = saved.isWon       ?? false;
    this.isRevealing = false; // Yenidən başlayanda sıfırla
    this.dateStr     = saved.dateStr     ?? getBakuDateStr();
    this.wordLen     = wordLenForMode(this.mode);
    WORD_LEN         = this.wordLen;
    const hs         = await loadHintState();
    this.hints       = { reveal:0, present:0, eliminate:0, meaning:0, extraguess:0, usedInGame:false, revealedPositions:[], presentLetters:[], ...hs };
  }

  _snapshot() {
    return {
      mode:        this.mode,
      wordLen:     this.wordLen,
      secret:      this.secret,
      guesses:     this.guesses,
      results:     this.results,
      currentWord: this.currentWord,
      maxGuesses:  this.maxGuesses,
      isOver:      this.isOver,
      isWon:       this.isWon,
      dateStr:     this.dateStr,
      coins:       this.coins,
      hints:       { ...this.hints },
      rating:      { ...this.rating },
    };
  }

  async _save() {
    const payload = {
      mode:        this.mode,
      secret:      this.secret,
      guesses:     this.guesses,
      results:     this.results,
      currentWord: this.currentWord,
      maxGuesses:  this.maxGuesses,
      isOver:      this.isOver,
      isWon:       this.isWon,
      dateStr:     this.dateStr,
    };
    await saveGameState(payload);
    await saveHintState({ ...this.hints });
  }

  // ---- Hərflərlə iş ----
  addLetter(letter) {
    if (this.isOver || this.isRevealing) return false;
    const up = azUpper(normalize(letter));
    if (strLen(this.currentWord) >= this.wordLen) return false;
    this.currentWord += up;
    this.emit(EV.LETTER_ADD, { letter: up, word: this.currentWord });

    // Xanalar dolduqda avtomatik göndər
    if (strLen(this.currentWord) === this.wordLen) {
      // Qısa gecikmə — son hərfin animasiyası görünsün
      setTimeout(() => this.submitGuess(), 120);
    }

    return true;
  }

  deleteLetter() {
    if (this.isOver || this.isRevealing) return false;
    if (!this.currentWord) return false;
    const chars = [...this.currentWord];
    chars.pop();
    this.currentWord = chars.join('');
    this.emit(EV.LETTER_DEL, { word: this.currentWord });
    return true;
  }

  // ---- Cəhdi göndər ----
  async submitGuess() {
    if (this.isOver || this.isRevealing) return null;
    const word = this.currentWord;

    // Uzunluq yoxlaması
    if (strLen(word) < this.wordLen) {
      this.emit(EV.GUESS_INVALID_SHORT, { word });
      return null;
    }

    // Lüğət yoxlaması
    if (!isValidGuess(word, this.wordLen)) {
      this.emit(EV.GUESS_INVALID_DICT, { word });
      return null;
    }

    // Animasiya zamanı giriş kilidlə
    this.isRevealing = true;

    const result = evaluate(word, this.secret);
    this.guesses.push(word);
    this.results.push(result);
    this.currentWord = '';

    // ÖNƏMLİ: vəziyyəti animasiyadan ƏVVƏL saxla
    // (tətbiq yarıda bağlansa, nəticə itməsin)
    const isWin  = result.every(r => r === 'correct');
    const isLose = !isWin && this.guesses.length >= this.maxGuesses;
    this.isOver  = isWin || isLose;
    this.isWon   = isWin;
    await this._save();

    this.emit(EV.GUESS_SUBMITTED, {
      word,
      result,
      rowIndex: this.guesses.length - 1,
      isOver:   this.isOver,
      isWon:    this.isWon,
    });

    if (this.isOver) {
      await this._handleGameEnd(isWin);
    }

    return { word, result, isOver: this.isOver, isWon: this.isWon };
  }

  // Animasiya bitdikdə isRevealing-i sıfırla
  revealDone() {
    this.isRevealing = false;
  }

  async _handleGameEnd(won) {
    const attempt = this.guesses.length;

    // Statistika yenilə
    this.stats.played++;
    if (won) {
      this.stats.wins++;
      this.stats.dist[attempt - 1]++;

      // Seriya — Günün sözü üçün tarix yoxla
      if (this.mode === MODE.DAILY) {
        const lastDate = this.stats.lastDailyDate;
        const today    = this.dateStr;
        const yesterday = this._prevDay(today);
        if (lastDate === yesterday || lastDate === today) {
          this.stats.streak++;
        } else {
          this.stats.streak = 1;
        }
        this.stats.maxStreak = Math.max(this.stats.maxStreak, this.stats.streak);
        this.stats.lastDailyDate = today;
      }

      // Xal hesabla
      const isDaily = this.mode === MODE.DAILY;
      const earned  = calcWinCoins(attempt, isDaily, this.stats.streak);
      await this._addCoins(earned);
      this.emit(EV.GAME_WIN, { attempt, earned, streak: this.stats.streak });
    } else {
      // Seriya yalnız Günün Sözü rejimində sıfırlanır
      if (this.mode === MODE.DAILY) {
        this.stats.streak = 0;
      }
      await this._addCoins(ECONOMY.defeatConsole);
      this.emit(EV.GAME_LOSE, { secret: this.secret, consolation: ECONOMY.defeatConsole });
    }

    if (this.hints.usedInGame) this.stats.gamesWithHints++;
    await saveStats(this.stats);

    // Reytinqi oyun bitdikdən sonra yenilə
    await this._updateRating({ won, attempt: this.guesses.length });
  }

  async _updateRating({ won, attempt }) {
    const prevRP     = this.rating.rp;
    const prevTier   = getTierForRP(prevRP);

    const { rp: delta } = calcRatingPoints({
      won,
      attempt,
      wordLen:  this.wordLen,
      streak:   this.stats.streak,
      isDaily:  this.mode === MODE.DAILY,
      hints:    this.hints,
    });

    const newRP    = applyRPDelta(prevRP, delta);
    const newTier  = getTierForRP(newRP);
    const tierUp   = newTier.minRP > prevTier.minRP;
    const tierDown = newTier.minRP < prevTier.minRP;

    this.rating.rp     = newRP;
    this.rating.tierId = newTier.id;

    // Son 20 girişi saxla
    this.rating.history = [
      { delta, tierId: newTier.id, date: this.dateStr, won },
      ...(this.rating.history ?? []),
    ].slice(0, 20);

    await saveRating(this.rating);
    this.emit(EV.RATING_CHANGE, {
      rp:         newRP,
      delta,
      tierId:     newTier.id,
      prevTierId: prevTier.id,
      tierUp,
      tierDown,
      tier:       newTier,
    });
  }

  _prevDay(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d - 1));
    return dt.toISOString().slice(0, 10);
  }

  async _addCoins(amount) {
    this.coins = Math.max(0, this.coins + amount);
    this.stats.totalCoins = (this.stats.totalCoins ?? 0) + amount;
    await saveCoins(this.coins);
    this.emit(EV.COINS_CHANGE, { coins: this.coins, delta: amount });
  }

  // ---- İpucular ----
  async useHint(type) {
    const cfg = ECONOMY.hints[type];
    if (!cfg) return { ok: false, reason: 'unknown' };
    if (this.coins < cfg.cost)
      return { ok: false, reason: 'noCoins' };
    if ((this.hints[type] ?? 0) >= cfg.maxPerGame)
      return { ok: false, reason: 'limitReached' };
    if (this.isOver || this.isRevealing)
      return { ok: false, reason: 'gameOver' };

    // Xalı çıx
    this.coins -= cfg.cost;
    this.hints[type]++;
    this.hints.usedInGame = true;
    await saveCoins(this.coins);
    await saveHintState({ ...this.hints });
    this.emit(EV.COINS_CHANGE, { coins: this.coins, delta: -cfg.cost });

    const result = this._applyHint(type);
    this.emit(EV.HINT_USED, { type, result, coins: this.coins });
    return { ok: true, result };
  }

  _applyHint(type) {
    const secretChars = [...this.secret];
    const knownPositions = this._knownPositions();

    switch (type) {
      case 'reveal': {
        // Hələ tapılmamış VƏ əvvəlki ipucularla açılmamış mövqeləri seç
        const revealedBefore = new Set(this.hints.revealedPositions ?? []);
        const unknowns = secretChars
          .map((c, i) => ({ c, i }))
          .filter(({ i }) => !knownPositions.has(i) && !revealedBefore.has(i));
        if (!unknowns.length) return null;
        const pick = unknowns[Math.floor(Math.random() * unknowns.length)];
        // Bu mövqeni yadda saxla
        this.hints.revealedPositions = [...(this.hints.revealedPositions ?? []), pick.i];
        return { position: pick.i, letter: pick.c };
      }
      case 'present': {
        // Sözdə olan, hələ tapılmamış VƏ əvvəlki ipucu ilə göstərilməmiş hərf
        const usedLetters   = new Set(this.guesses.flatMap(g => [...g]));
        const shownBefore   = new Set(this.hints.presentLetters ?? []);
        const hidden = secretChars.filter(c =>
          !usedLetters.has(c) && !shownBefore.has(c)
        );
        if (!hidden.length) return null;
        const letter = hidden[Math.floor(Math.random() * hidden.length)];
        // Bu hərfi yadda saxla
        this.hints.presentLetters = [...(this.hints.presentLetters ?? []), letter];
        return { letter };
      }
      case 'eliminate': {
        const secretSet = new Set(secretChars);
        const eliminated = AZ_ALPHABET
          .filter(c => !secretSet.has(c))
          .sort(() => Math.random() - .5)
          .slice(0, 5);
        return { eliminated };
      }
      case 'meaning': {
        return { hint: `Söz kateqoriyası: isim, ilk hərf: ${secretChars[0]}` };
      }
      case 'extraguess': {
        this.maxGuesses = MAX_GUESSES_DEFAULT + 1;
        return { maxGuesses: this.maxGuesses };
      }
      default: return null;
    }
  }

  _knownPositions() {
    const known = new Set();
    this.results.forEach(result => {
      result.forEach((r, i) => { if (r === 'correct') known.add(i); });
    });
    return known;
  }

  // ---- Rejim dəyişikliyi ----
  async switchMode(mode) {
    await this.init(mode, true);
  }

  // ---- Gecəyarısı yenilənmə ----
  async checkDayRollover() {
    const today = getBakuDateStr();
    if (this.mode === MODE.DAILY && today !== this.dateStr) {
      await this.init(MODE.DAILY, true);
      return true;
    }
    return false;
  }

  // ---- Paylaşma mətni ----
  buildShareText() {
    const day    = this.mode === MODE.DAILY ? `#${getDayNumber(this.dateStr)}` : '';
    const result = this.isWon ? `${this.guesses.length}/${this.maxGuesses}` : 'X/6';
    const grid   = buildShareGrid(this.results);
    return `Söz Tap ${day} ${result}\n\n${grid}\n\nhttps://word-game-pro.vercel.app/`;
  }
}

// Tək nümunə
export const gameState = new GameState();
