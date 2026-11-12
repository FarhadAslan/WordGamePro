/**
 * tools/build-dict.mjs
 * Azərbaycan Hunspell lüğətindən 4/5/6 hərfli söz siyahıları hazırlayır.
 *
 * Mənbə: github.com/mozillaz/spellchecker  (MPL-2.0)
 *   az.dic  — kök sözlər, format:  söz/BAYRAQLAR  və ya  söz
 *
 * İstifadə:
 *   node tools/build-dict.mjs
 *
 * Çıxış:
 *   public/dict/answers4.txt   public/dict/words4.valid.txt
 *   public/dict/answers5.txt   public/dict/words5.valid.txt
 *   public/dict/answers6.txt   public/dict/words6.valid.txt
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { get as httpsGet } from 'https';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';

const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, '..');
const DICT   = join(ROOT, 'public', 'dict');
const CACHE  = join(ROOT, 'tools', '.cache');

[DICT, CACHE].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

// ── Azərbaycan əlifbası (32 hərf, kiçik) ─────────────────────────────────────
const AZ_LOWER = new Set([...'abcçdeəfgğhxıijkqlmnoöprsştuüvyz']);

/** Azərbaycan-uyğun kiçiltmə:  İ→i,  I→ı */
function azLower(str) {
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('az-AZ');
}

/** Unicode NFC normallaşdırma + kiçiltmə */
function norm(w) {
  return azLower(w.normalize('NFC'));
}

/** Sözün yalnız AZ əlifbasından ibarət olub-olmadığını yoxla */
function isAzOnly(w) {
  return [...w].every(c => AZ_LOWER.has(c));
}

// ── HTTPS yükləmə ─────────────────────────────────────────────────────────────
function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (existsSync(dest)) { resolve(dest); return; }
    console.log(`  Yüklənir: ${url}`);
    const file = createWriteStream(dest);
    httpsGet(url, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      pipeline(res, file).then(() => resolve(dest)).catch(reject);
    }).on('error', reject);
  });
}

// ── .dic faylını oxu, kök sözləri çıxar ──────────────────────────────────────
function parseDic(filePath) {
  const lines = readFileSync(filePath, 'utf8').split('\n');
  const words = [];
  for (let i = 1; i < lines.length; i++) {   // ilk sətir say, atılır
    let raw = lines[i].trim();
    if (!raw) continue;
    // "söz/BAYRAQLAR" → yalnız "söz"
    const slash = raw.indexOf('/');
    if (slash !== -1) raw = raw.slice(0, slash);
    // rəqəm, defis, apostrof varsa atılır
    if (/[\d\-'"]/.test(raw)) continue;
    // xüsusi ad: orijinalda böyük hərflə başlayan
    if (raw[0] >= 'A' && raw[0] <= 'Z' || raw[0] >= 'À') {
      const low = azLower(raw[0]);
      if (low !== raw[0].toLocaleLowerCase('az-AZ')) continue; // böyük başlanğıc
      // daha sərt yoxlama: əgər ilk hərf böyük AZ hərfidirsə atılır
    }
    const w = norm(raw);
    if ([...w].length >= 4 && [...w].length <= 6 && isAzOnly(w)) {
      words.push(w);
    }
  }
  return words;
}

// Böyük hərflə başlayan sözü xüsusi ad kimi yoxla
function isProperNoun(raw) {
  const first = raw[0];
  if (!first) return false;
  // Orijinal faylda böyük hərf varsa
  return first !== azLower(first) && first === first.toLocaleUpperCase('az-AZ');
}

// ── Əsas iş ──────────────────────────────────────────────────────────────────
// hsk81/hs-dict  — 19131 söz, Hunspell format
const DIC_URL   = 'https://raw.githubusercontent.com/hsk81/hs-dict/master/az_AZ.dic';
const DIC_CACHE = join(CACHE, 'az_AZ.dic');

console.log('=== Azərbaycan Hunspell lüğəti ===');

try {
  await download(DIC_URL, DIC_CACHE);
} catch (e) {
  console.error('Yükləmə uğursuz oldu:', e.message);
  console.error('Əl ilə yükləyin: https://github.com/mozillaz/spellchecker');
  process.exit(1);
}

console.log('  Fayldan oxunur...');
const lines = readFileSync(DIC_CACHE, 'utf8').split('\n');
const total = parseInt(lines[0]) || 0;
console.log(`  Cəmi giriş: ${total}`);

// Bütün sözlər (xüsusi adları da daxil ederek yoxlayaq)
const allWords = [];
const properNouns = [];

for (let i = 1; i < lines.length; i++) {
  let raw = lines[i].trim();
  if (!raw) continue;
  const slash = raw.indexOf('/');
  const flags = slash !== -1 ? raw.slice(slash + 1) : '';
  if (slash !== -1) raw = raw.slice(0, slash);
  if (/[\d\-'"]/.test(raw)) continue;

  // Xüsusi ad yoxlaması (orijinalda böyük başlanğıc)
  const firstChar = raw[0] || '';
  const isUpper = firstChar && firstChar !== firstChar.toLocaleLowerCase('az-AZ');

  const w = norm(raw);
  const len = [...w].length;
  if (len < 4 || len > 6) continue;
  if (!isAzOnly(w)) continue;

  if (isUpper) {
    properNouns.push(w);
  } else {
    allWords.push(w);
  }
}

// Dublikatları sil
const uniqueWords  = [...new Set(allWords)];
const uniqueProper = [...new Set(properNouns)];

console.log(`\n  Ümumi (xüsusi adlarsız): ${uniqueWords.length}`);
console.log(`  Xüsusi adlar (atıldı):   ${uniqueProper.length}`);

// Uzunluğa görə ayır
const byLen = { 4: [], 5: [], 6: [] };
for (const w of uniqueWords) {
  const l = [...w].length;
  byLen[l].push(w);
}

// Əlifba sırası ilə sırala
const collator = new Intl.Collator('az');
for (const l of [4, 5, 6]) {
  byLen[l].sort(collator.compare);
}

// ── Çıxış faylları ───────────────────────────────────────────────────────────
console.log('\n  Fayllar yazılır:');
for (const l of [4, 5, 6]) {
  const words = byLen[l];
  writeFileSync(join(DICT, `answers${l}.txt`),     words.join('\n'), 'utf8');
  writeFileSync(join(DICT, `words${l}.valid.txt`), words.join('\n'), 'utf8');
  console.log(`    answers${l}.txt + words${l}.valid.txt : ${words.length} söz`);
}

// ── Statistika ───────────────────────────────────────────────────────────────
console.log('\n=== Statistika ===');
for (const l of [4, 5, 6]) {
  const words = byLen[l];
  const freq  = {};
  for (const w of words) {
    for (const c of [...w]) freq[c] = (freq[c] || 0) + 1;
  }
  const top5 = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([c,n])=>`${c}:${n}`).join(' ');
  console.log(`  ${l} hərf: ${words.length} söz | Ən tez hərflər: ${top5}`);
}

console.log('\n✓ Tamamlandı. Vercel deploy üçün public/dict/ hazırdır.');
