/**
 * Virtual Klaviatura UI
 * AZ Q-düzülüşü, event delegation, DocumentFragment
 */
import { azUpper, normalize } from '../data/alphabet.js';
import { mergeTileState } from '../game/evaluate.js';

/** Standart Azərbaycan Q-klaviatura düzülüşü (böyük hərflərlə) */
export const KEY_ROWS = [
  ['Q','Ü','E','R','T','Y','U','İ','O','P','Ö','Ğ'],
  ['A','S','D','F','G','H','J','K','L','I','Ə'],
  ['Z','X','C','V','B','N','M','Ç','Ş','⌫'],
];

/**
 * Fiziki klaviatura → virtual düymə xəritəsi.
 * Fiziki klaviaturadan gələn hərflər virtual klaviatura düymələrinə map olunur.
 * Virtual klaviaturada düymələr kiçik hərflərlə göstərilir.
 */
export const PHYS_MAP = {
  'Enter':     'ENTER',
  'Backspace': '⌫',
  // Kiçik hərflər → böyük (Azərbaycan locale)
  'q':'Q','ü':'Ü','e':'E','r':'R','t':'T','y':'Y','u':'U','i':'İ','o':'O','p':'P','ö':'Ö','ğ':'Ğ',
  'a':'A','s':'S','d':'D','f':'F','g':'G','h':'H','j':'J','k':'K','l':'L','ı':'I','ə':'Ə',
  'z':'Z','x':'X','c':'C','v':'V','b':'B','n':'N','m':'M','ç':'Ç','ş':'Ş',
  // Böyük hərflər (özləri)
  'Q':'Q','Ü':'Ü','E':'E','R':'R','T':'T','Y':'Y','U':'U','İ':'İ','O':'O','P':'P','Ö':'Ö','Ğ':'Ğ',
  'A':'A','S':'S','D':'D','F':'F','G':'G','H':'H','J':'J','K':'K','L':'L','I':'I','Ə':'Ə',
  'Z':'Z','X':'X','C':'C','V':'V','B':'B','N':'N','M':'M','Ç':'Ç','Ş':'Ş',
};

export class Keyboard {
  constructor(containerEl, onKey) {
    this.el        = containerEl;
    this.onKey     = onKey;
    this._keyEls   = {}; // hərf → <button>
    this._states   = {}; // hərf → ən yaxşı hal

    this._handleClick  = this._handleClick.bind(this);
    this._handlePhysical = this._handlePhysical.bind(this);
  }

  build() {
    this.el.innerHTML = '';
    this._keyEls  = {};
    this._states  = {};

    const frag = document.createDocumentFragment();
    KEY_ROWS.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'key-row';
      row.forEach(k => {
        const btn = document.createElement('button');
        btn.className   = 'key' + (k === 'ENTER' || k === '⌫' ? ' wide' : '');
        btn.textContent = k === 'ENTER' ? 'GİR' : k;
        btn.dataset.key = k;
        btn.setAttribute('aria-label',
          k === '⌫' ? 'Sil' : k === 'ENTER' ? 'Daxil et' : k);
        btn.setAttribute('type', 'button');
        rowEl.appendChild(btn);
        this._keyEls[k] = btn;
      });
      frag.appendChild(rowEl);
    });

    // Event delegation — bütün klikləri bir handler-da idarə et
    this.el.addEventListener('click', this._handleClick);
    this.el.appendChild(frag);

    document.addEventListener('keydown', this._handlePhysical);
  }

  destroy() {
    this.el.removeEventListener('click', this._handleClick);
    document.removeEventListener('keydown', this._handlePhysical);
  }

  _handleClick(e) {
    const btn = e.target.closest('[data-key]');
    if (!btn) return;
    this.onKey(btn.dataset.key);
  }

  _handlePhysical(e) {
    // Modal açıqdırsa klaviatura girişini blokla
    const hasOpenModal = document.querySelector('.screen:not([hidden])');
    if (hasOpenModal) return;
    const key = PHYS_MAP[e.key];
    if (key) {
      e.preventDefault();
      this.onKey(key);
    }
  }

  /** Sözün nəticəsinə görə klaviatura rənglərini yenilə */
  applyResults(word, result) {
    const chars = [...azUpper(normalize(word))];
    chars.forEach((letter, i) => {
      const newState = result[i];
      const curState = this._states[letter];
      const merged   = mergeTileState(curState, newState);
      if (merged !== curState) {
        this._states[letter] = merged;
        const btn = this._keyEls[letter];
        if (btn) {
          btn.dataset.state = merged;
        }
      }
    });
  }

  /** Söndürülmüş hərfləri (eliminate ipucu) göstər */
  eliminateKeys(letters) {
    letters.forEach(letter => {
      const btn = this._keyEls[azUpper(normalize(letter))];
      if (btn) btn.dataset.state = 'eliminated';
    });
  }

  /** Vəziyyəti sıfırla (yeni oyun) */
  reset() {
    this._states = {};
    Object.values(this._keyEls).forEach(btn => {
      delete btn.dataset.state;
    });
  }

  /** Saxlanılmış nəticələrdən klaviatura vəziyyətini bərpa et */
  restore(guesses, results) {
    guesses.forEach((word, i) => {
      this.applyResults(word, results[i]);
    });
  }
}
