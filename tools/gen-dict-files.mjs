// Fallback siyahılarından hər uzunluq üçün ayrı public/dict/ faylları yarat
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

// words-fallback.js-i oxu
const src = readFileSync(join(root, 'src/data/words-fallback.js'), 'utf8');

// export const X = [...] -> const X = [...]
const mod = src.replace(/^export const /gm, 'const ');

// eval ilə massivləri əldə et (build-time only, güvənli)
const ctx = {};
new Function('ctx', `
  ${mod}
  ctx.FALLBACK_ANSWERS   = FALLBACK_ANSWERS;
  ctx.FALLBACK_ANSWERS_4 = FALLBACK_ANSWERS_4;
  ctx.FALLBACK_ANSWERS_6 = FALLBACK_ANSWERS_6;
`)(ctx);

const { FALLBACK_ANSWERS, FALLBACK_ANSWERS_4, FALLBACK_ANSWERS_6 } = ctx;

const dictDir = join(root, 'public/dict');

const write = (name, arr) => {
  writeFileSync(join(dictDir, name), arr.join('\n'), 'utf8');
  console.log(`  ${name}: ${arr.length} söz`);
};

console.log('Dict faylları yazılır...');
write('answers4.txt',    FALLBACK_ANSWERS_4);
write('answers5.txt',    FALLBACK_ANSWERS);
write('answers6.txt',    FALLBACK_ANSWERS_6);
write('words4.valid.txt', FALLBACK_ANSWERS_4);
write('words5.valid.txt', FALLBACK_ANSWERS);
write('words6.valid.txt', FALLBACK_ANSWERS_6);
console.log('Tamamlandı.');
