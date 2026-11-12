/**
 * Vitest unit testlər — evaluateGuess + AZ əlifba
 * İşlətmə: npm test
 */
import { describe, it, expect } from 'vitest';
import { evaluate } from './evaluate.js';
import { azUpper, isValidAzWord, strLen } from '../data/alphabet.js';

// ---- AZ əlifba testləri ----
describe('azUpper', () => {
  it('ışıq → IŞIQ (ı→I)', () => {
    expect(azUpper('ışıq')).toBe('IŞIQ');
  });
  it('iki → İKİ (i→İ)', () => {
    expect(azUpper('iki')).toBe('İKİ');
  });
  it('əlifba → ƏLİFBA', () => {
    expect(azUpper('əlifba')).toBe('ƏLİFBA');
  });
  it('şəhər → ŞƏHƏR', () => {
    expect(azUpper('şəhər')).toBe('ŞƏHƏR');
  });
});

describe('isValidAzWord', () => {
  it('nəfəs 5 hərflidir', () => {
    expect(isValidAzWord('nəfəs', 5)).toBe(true);
  });
  it('şəhər 5 hərflidir', () => {
    expect(isValidAzWord('şəhər', 5)).toBe(true);
  });
  it('alma 4 hərflidir', () => {
    expect(isValidAzWord('alma', 5)).toBe(false);
  });
});

describe('strLen — unicode-aware', () => {
  it('nəfəs uzunluğu 5', () => {
    expect(strLen('NƏFƏS')).toBe(5);
  });
  it('şəkər uzunluğu 5', () => {
    expect(strLen('ŞƏKƏR')).toBe(5);
  });
});

// ---- evaluate() testləri ----
describe('evaluate — əsas hallar', () => {
  it('tam uyğun', () => {
    expect(evaluate('NƏFƏS', 'NƏFƏS'))
      .toEqual(['correct','correct','correct','correct','correct']);
  });

  it('heç biri yox', () => {
    expect(evaluate('TAXTA', 'KÜLƏK'))
      .toEqual(['absent','absent','absent','absent','absent']);
  });

  it('hamısı yanlış mövqe', () => {
    // BALIQ → LAQIB (köçürülmüş) — praktiki test
    const r = evaluate('ABCDE', 'BCDEA');
    // A: gizlidə var (5-ci mövqe) → present
    // B: gizlidə var (1-ci mövqe) → present
    // C: gizlidə var (2-ci mövqe) → present
    // D: gizlidə var (3-cü mövqe) → present
    // E: gizlidə var (4-cü mövqe) → present
    expect(r).toEqual(['present','present','present','present','present']);
  });
});

describe('evaluate — çoxlu hərf halları', () => {
  /**
   * Klassik Wordle problemi:
   * Gizli: BALIQ
   * Təxmin: ALAQA
   *   A(0): B-A uyğun deyil, A gizlidə 2-ci mövqedədir → present
   *   L(1): L 2-ci mövqedədir amma BALIQ-da L 2-ci → correct
   *   A(2): A, gizlidə 2-ci mövqedədir amma L correct götürdü... yenidən A-nı yoxla
   *   Q(3): Q 5-ci mövqedədir → present
   *   A(4): artıq A-nın bir instansı işlənib → absent
   */
  it('ALAQA vs BALIQ', () => {
    const r = evaluate('ALAQA', 'BALIQ');
    expect(r[0]).toBe('present'); // A — sözdə var, yeri yanlış
    expect(r[1]).toBe('correct'); // L — düzgün mövqe
    expect(r[2]).toBe('absent');  // A — artıq bir A işlənib
    expect(r[3]).toBe('present'); // Q — sözdə var, yeri yanlış
    expect(r[4]).toBe('absent');  // A — sözdə artıq A yoxdur
  });

  it('Eyni hərf iki dəfə — gizlid bir dəfə', () => {
    // Gizli: KƏNAR, Təxmin: KANAL (A iki dəfə, gizlid bir dəfə)
    const r = evaluate('KANAL', 'KƏNAR');
    expect(r[0]).toBe('correct'); // K düzgün
    expect(r[1]).toBe('absent');  // A — K.ƏNAR-da A var amma 1-ci mövqedə deyil... present?
    // Not: KƏNAR-da A 3-cü mövqedədir
    // K(0)correct, A(1)→present(KƏNAR-da A var, mövqe yanlış), N(2)→present, A(3)→correct, L(4)→absent
  });

  it('Azərbaycan xüsusi hərfləri — Ə İ Ş', () => {
    const r = evaluate('ŞƏKƏR', 'ŞƏKƏR');
    expect(r).toEqual(['correct','correct','correct','correct','correct']);
  });

  it('I vs İ fərqi (Azərbaycan)', () => {
    // Gizli İŞIQL, təxmin İŞIQL — eyni olmalı
    const r = evaluate('İŞIQL', 'İŞIQL');
    expect(r).toEqual(['correct','correct','correct','correct','correct']);
  });

  it('Çoxlu hərf — düzgün sayım', () => {
    // Gizli: AABBB, Təxmin: BBAAA
    // B(0): B gizlid 3,4,5-də → present
    // B(1): B gizlid → present
    // A(2): A gizlid 1,2-də → present
    // A(3): A gizlid → present
    // A(4): artıq 2 A işləndi → absent
    const r = evaluate('BBAAA', 'AABBB');
    expect(r[0]).toBe('present');
    expect(r[1]).toBe('present');
    expect(r[2]).toBe('present');
    expect(r[3]).toBe('present');
    expect(r[4]).toBe('absent');
  });
});
