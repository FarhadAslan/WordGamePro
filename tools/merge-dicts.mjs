/**
 * tools/merge-dicts.mjs
 * Hunspell çıxışını (public/dict/) + words-fallback.js-i birləşdirir.
 * Nəticə: hər uzunluq üçün daha böyük, dublikatsız siyahı.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const DICT  = join(ROOT, 'public', 'dict');

// words-fallback.js-dən massivləri əldə et
const fbSrc = readFileSync(join(ROOT, 'src/data/words-fallback.js'), 'utf8')
  .replace(/^export const /gm, 'const ');
const ctx = {};
new Function('ctx', `${fbSrc}
  ctx.FB4 = FALLBACK_ANSWERS_4;
  ctx.FB5 = FALLBACK_ANSWERS;
  ctx.FB6 = FALLBACK_ANSWERS_6;
`)(ctx);

// Azərbaycan əlifbası (kiçik)
const AZ_LOWER = new Set([...'abcçdeəfgğhxıijkqlmnoöprsştuüvyz']);
function azLower(s) { return s.replace(/İ/g,'i').replace(/I/g,'ı').toLocaleLowerCase('az-AZ'); }
function valid(w) { return [...w].every(c => AZ_LOWER.has(c)); }

for (const len of [4, 5, 6]) {
  // Hunspell faylından oku (kiçik)
  let hunspell = [];
  try {
    hunspell = readFileSync(join(DICT, `answers${len}.txt`), 'utf8')
      .split('\n').map(w => w.trim()).filter(Boolean);
  } catch {}

  // Fallback massivinden (büyük) → kiçiyə çevir
  const fbArr = len === 4 ? ctx.FB4 : len === 5 ? ctx.FB5 : ctx.FB6;
  const fbLower = fbArr.map(w => azLower(w));

  // Birləşdir, filter, dublikat sil, sırala
  const merged = [...new Set([...hunspell, ...fbLower])]
    .filter(w => [...w].length === len && valid(w))
    .sort(new Intl.Collator('az').compare);

  writeFileSync(join(DICT, `answers${len}.txt`),     merged.join('\n'), 'utf8');
  writeFileSync(join(DICT, `words${len}.valid.txt`), merged.join('\n'), 'utf8');
  console.log(`  ${len} hərf: ${merged.length} söz (Hunspell: ${hunspell.length}, Fallback: ${fbLower.length})`);
}

console.log('✓ Birləşmə tamamlandı.');
