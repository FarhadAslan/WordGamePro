/**
 * Lüğət modulu — 4, 5, 6 hərfli sözlər ayrı fayllardan yüklənir.
 * Şəbəkə/fayl xətasında ehtiyat siyahıya düşür.
 */
import { azUpper, normalize, isValidAzWord } from '../data/alphabet.js';
import {
  FALLBACK_ANSWERS, FALLBACK_ANSWERS_4, FALLBACK_ANSWERS_6,
} from '../data/words-fallback.js';

// Hər uzunluq üçün ayrı massiv
const answersByLen = { 4: [], 5: [], 6: [] };
const validByLen   = { 4: new Set(), 5: new Set(), 6: new Set() };
let loaded = false;

/** Bütün lüğətləri yüklə */
export async function loadDictionary(onProgress) {
  if (loaded) return;
  onProgress?.(0.1);

  const lens = [4, 5, 6];

  await Promise.all(lens.map(async (len, i) => {
    try {
      const [ansRes, valRes] = await Promise.all([
        fetch(`/dict/answers${len}.txt`),
        fetch(`/dict/words${len}.valid.txt`),
      ]);

      if (ansRes.ok) {
        const text = await ansRes.text();
        answersByLen[len] = parseDictFile(text, len);
      }
      if (valRes.ok) {
        const text = await valRes.text();
        const valid = parseDictFile(text, len);
        validByLen[len] = new Set([...answersByLen[len], ...valid]);
      } else {
        validByLen[len] = new Set(answersByLen[len]);
      }
    } catch {
      // Fayl yüklənmədisə fallback aşağıda
    }
    onProgress?.(0.1 + 0.3 * (i + 1));
  }));

  // Hər uzunluq üçün fallback istifadə et (fayl gəlmədisə)
  const FB_ANS = { 4: FALLBACK_ANSWERS_4, 5: FALLBACK_ANSWERS, 6: FALLBACK_ANSWERS_6 };

  for (const len of lens) {
    if (answersByLen[len].length === 0) {
      answersByLen[len] = FB_ANS[len] ?? [];
    }
    if (validByLen[len].size === 0) {
      validByLen[len] = new Set(answersByLen[len]);
    }
  }

  loaded = true;
  onProgress?.(1.0);
}

/** Söz faylını oxu, yalnız `len` uzunluğundakı AZ sözlərini saxla */
function parseDictFile(text, len) {
  return text
    .split('\n')
    .map(w => azUpper(normalize(w.trim())))
    .filter(w => [...w].length === len && isValidAzWord(w, len));
}

/**
 * Sözün qəbul edilib-edilməyəcəyini yoxla.
 * @param {string} word
 * @param {number} [len=5]
 */
export function isValidGuess(word, len = 5) {
  const up = azUpper(normalize(word));
  if ([...up].length !== len) return false;
  const vs = validByLen[len];
  if (!vs || vs.size === 0) return true;   // lüğət boşdursa hər söz qəbul et
  return vs.has(up);
}

/** Gizli söz massivini uzunluğa görə ver */
export function getAnswers(wordLen = 5) {
  return answersByLen[wordLen] ?? [];
}

export function isDictLoaded() {
  return loaded;
}
