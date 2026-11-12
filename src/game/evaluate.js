/**
 * Hərflərin qiymətləndirilməsi — iki ötürməli alqoritm.
 *
 * Nümunə: gizli=BALIQ, təxmin=ALAQA
 *   Pozisiya 0: A vs B → absent (B yoxdur)
 *   Pozisiya 1: L vs A → ?
 *   ...
 * İki ötürmə ilə çox hərfli vəziyyət düzgün hesablanır.
 *
 * @param {string} guess  - 5 hərfli təxmin (artıq UPPERCASEdi)
 * @param {string} secret - 5 hərfli gizli söz (artıq UPPERCASEdi)
 * @returns {Array<'correct'|'present'|'absent'>} - 5 uzunluqlu nəticə
 */
export function evaluate(guess, secret) {
  const g = [...guess];
  const s = [...secret];
  const n = g.length;
  const result    = new Array(n).fill('absent');
  const remaining = [...s]; // hələ "istifadə olunmamış" gizli hərflər

  // 1. Ötürmə — correct (düzgün mövqe)
  for (let i = 0; i < n; i++) {
    if (g[i] === s[i]) {
      result[i]    = 'correct';
      remaining[i] = null; // bu mövqe istifadə olundu
    }
  }

  // 2. Ötürmə — present (yanlış mövqe)
  for (let i = 0; i < n; i++) {
    if (result[i] === 'correct') continue;
    const ri = remaining.indexOf(g[i]);
    if (ri !== -1) {
      result[i]  = 'present';
      remaining[ri] = null;
    }
  }

  return result;
}

/**
 * İpucu: klaviaturada ən yaxşı vəziyyəti saxla.
 * Prioritet: correct > present > absent > undefined
 */
const PRIO = { correct: 3, present: 2, absent: 1 };

export function mergeTileState(current, next) {
  const cp = PRIO[current] ?? 0;
  const np = PRIO[next]    ?? 0;
  return np > cp ? next : current;
}

/**
 * Paylaşma mətni üçün emoji şəbəkəsi.
 * @param {Array<Array<string>>} rows - hər sətir nəticə massivi
 * @param {boolean} highContrast
 */
export function buildShareGrid(rows, highContrast = false) {
  const E = highContrast
    ? { correct: '🟧', present: '🟦', absent: '⬛' }
    : { correct: '🟩', present: '🟨', absent: '⬛' };
  return rows
    .map(row => row.map(r => E[r] ?? '⬜').join(''))
    .join('\n');
}
