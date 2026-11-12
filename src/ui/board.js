/**
 * Oyun Lövhəsi UI
 * DocumentFragment ilə DOM yaradılır, innerHTML yoxdur.
 */
import { WORD_LEN } from '../game/state.js';

const FLIP_DELAY_PER_TILE = 300; // ms
const FLIP_DURATION       = 500; // ms (CSS ilə uyğun)

export class Board {
  constructor(containerEl) {
    this.el    = containerEl;
    this.tiles = []; // tiles[row][col]
    this._maxRows = 6;
  }

  build(maxRows = 6, wordLen) {
    // wordLen verilməyibsə cari modul dəyərini istifadə et
    const cols = wordLen ?? WORD_LEN;
    this._wordLen = cols;
    this._maxRows = maxRows;
    this.el.innerHTML = '';
    this.tiles = [];

    const frag = document.createDocumentFragment();
    for (let r = 0; r < maxRows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const tile = document.createElement('div');
        tile.className  = 'tile';
        tile.setAttribute('role',       'gridcell');
        tile.setAttribute('aria-label', this._tileLabel(r, c, '', ''));
        tile.style.setProperty('--tile-delay', `${c * FLIP_DELAY_PER_TILE}ms`);
        frag.appendChild(tile);
        row.push(tile);
      }
      this.tiles.push(row);
    }
    this.el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.el.style.gridTemplateRows = `repeat(${maxRows}, 1fr)`;
    this.el.appendChild(frag);
  }

  /** Aktiv sətirdə hərfləri göstər */
  updateCurrentRow(rowIndex, word) {
    const row   = this.tiles[rowIndex];
    if (!row) return;
    const chars = [...word];
    row.forEach((tile, c) => {
      const letter = chars[c] ?? '';
      tile.textContent = letter;
      tile.dataset.state = letter ? 'tbd' : '';
      tile.setAttribute('aria-label', this._tileLabel(rowIndex, c, letter, ''));
    });
  }

  /**
   * Sətiri animasiya ilə açıq göstər.
   * @returns {Promise} — bütün tileler açılanda həll olur
   */
  revealRow(rowIndex, word, result) {
    const row   = this.tiles[rowIndex];
    if (!row) return Promise.resolve();
    const chars = [...word];

    return new Promise(resolve => {
      row.forEach((tile, c) => {
        setTimeout(() => {
          tile.dataset.state = result[c];
          tile.textContent   = chars[c] ?? '';
          tile.setAttribute('aria-label',
            this._tileLabel(rowIndex, c, chars[c] ?? '', result[c]));
        }, c * FLIP_DELAY_PER_TILE);
      });

      const totalMs = (WORD_LEN - 1) * FLIP_DELAY_PER_TILE + FLIP_DURATION;
      setTimeout(resolve, totalMs);
    });
  }

  /** Qalibiyyət bounce */
  bounceRow(rowIndex) {
    const row = this.tiles[rowIndex];
    if (!row) return;
    row.forEach((tile, c) => {
      setTimeout(() => {
        tile.classList.add('bounce');
        tile.addEventListener('animationend', () => tile.classList.remove('bounce'), { once: true });
      }, c * 80);
    });
  }

  /** Sətiri sarsdır (yanlış söz) */
  shakeRow(rowIndex) {
    const row = this.tiles[rowIndex];
    if (!row) return;
    row.forEach(tile => {
      tile.classList.remove('shake');
      void tile.offsetWidth; // reflow
      tile.classList.add('shake');
      tile.addEventListener('animationend', () => tile.classList.remove('shake'), { once: true });
    });
  }

  /** İpucu: mövqeni açıq göstər */
  revealHintTile(rowIndex, colIndex, letter) {
    const tile = this.tiles[rowIndex]?.[colIndex];
    if (!tile) return;
    tile.textContent   = letter;
    tile.dataset.state = 'hint-revealed';
    tile.setAttribute('aria-label', this._tileLabel(rowIndex, colIndex, letter, 'ipucu ilə açılmış'));
  }

  /** Daha bir sətir əlavə et (Əlavə cəhd ipucu) */
  addExtraRow() {
    const r     = this._maxRows;
    this._maxRows++;
    const cols  = this._wordLen ?? WORD_LEN;
    const row   = [];
    const frag  = document.createDocumentFragment();
    for (let c = 0; c < cols; c++) {
      const tile = document.createElement('div');
      tile.className  = 'tile';
      tile.setAttribute('role',       'gridcell');
      tile.setAttribute('aria-label', this._tileLabel(r, c, '', ''));
      tile.style.setProperty('--tile-delay', `${c * FLIP_DELAY_PER_TILE}ms`);
      frag.appendChild(tile);
      row.push(tile);
    }
    this.tiles.push(row);
    this.el.style.gridTemplateRows = `repeat(${this._maxRows}, 1fr)`;
    this.el.appendChild(frag);
  }

  /** Saxlanılmış vəziyyəti animasiyasız bərpa et */
  restore(guesses, results) {
    guesses.forEach((word, r) => {
      const row   = this.tiles[r];
      const chars = [...word];
      row?.forEach((tile, c) => {
        tile.textContent   = chars[c] ?? '';
        tile.dataset.state = results[r]?.[c] ?? '';
        tile.setAttribute('aria-label',
          this._tileLabel(r, c, chars[c] ?? '', results[r]?.[c] ?? ''));
      });
    });
  }

  _tileLabel(r, c, letter, state) {
    const stateAz = { correct: 'düzgün', present: 'var', absent: 'yox', '': '' }[state] ?? state;
    return `${r + 1}-ci sətir, ${c + 1}-ci xana${letter ? `, ${letter}` : ''}${stateAz ? `, ${stateAz}` : ''}`;
  }
}
