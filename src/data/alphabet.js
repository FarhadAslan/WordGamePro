/**
 * Azərbaycan əlifbası — 32 hərf
 * Sıra: AZ standartına uyğun
 */
export const AZ_ALPHABET = [
  'A','B','C','Ç','D','E','Ə','F','G','Ğ',
  'H','X','I','İ','J','K','Q','L','M','N',
  'O','Ö','P','R','S','Ş','T','U','Ü','V',
  'Y','Z'
];

export const AZ_ALPHABET_SET = new Set(AZ_ALPHABET);

/**
 * Azərbaycan lokalı üçün böyük hərfə çevirmə.
 * ƏSAS: adi toUpperCase() istifadə etmə! i→İ, ı→I fərqini düzgün aparır.
 */
export function azUpper(str) {
  return str.toLocaleUpperCase('az-AZ');
}

export function azLower(str) {
  return str.toLocaleLowerCase('az-AZ');
}

/**
 * Unicode NFC normallaşdırma.
 * Ə (U+018F), İ (U+0130) kimi hərflər bəzən fərqli kodlaşma ilə gəlir.
 */
export function normalize(str) {
  return str.normalize('NFC');
}

/**
 * Sözün yalnız AZ əlifbasından ibarət olub-olmadığını yoxla.
 * [...str] ilə unicode-aware uzunluq götürülür.
 */
export function isValidAzWord(str, length = 5) {
  const up = azUpper(normalize(str));
  const chars = [...up];
  if (chars.length !== length) return false;
  return chars.every(c => AZ_ALPHABET_SET.has(c));
}

/**
 * Söz uzunluğunu unicode-aware ölç.
 */
export function strLen(str) {
  return [...str].length;
}

// ============================================================
// UNIT TEST HEDƏFLƏRİ (vitest ilə işlədilir)
// ============================================================
// azUpper('ışıq') === 'IŞIQ'   ✓ (ı→I)
// azUpper('iki')  === 'İKİ'    ✓ (i→İ)
// azUpper('əlifba') === 'ƏLİFBA' ✓
// isValidAzWord('nəfəs') === true
// isValidAzWord('hello') === false (H,E,L,L,O — L,O AZ-da var amma E yox)
// strLen('nəfəs') === 5 (ə unicode)
