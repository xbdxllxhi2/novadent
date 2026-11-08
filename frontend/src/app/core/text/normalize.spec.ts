import { describe, expect, it } from 'vitest';
import { digitsOf, matchesAllTokens, normalizeText } from './normalize';

describe('normalizeText', () => {
  it('lowercases and strips Latin diacritics', () => {
    expect(normalizeText('Fatimetou Mint BRAHÎM')).toBe('fatimetou mint brahim');
    expect(normalizeText('  Élodie   Café ')).toBe('elodie cafe');
  });

  it('strips Arabic tashkeel and unifies alef, ta marbuta and alef maqsura', () => {
    expect(normalizeText('مُحَمَّد')).toBe('محمد');
    expect(normalizeText('أحمد')).toBe('احمد');
    expect(normalizeText('سالكة')).toBe('سالكه');
    expect(normalizeText('موسى')).toBe('موسي');
  });

  it('keeps Arabic letters intact', () => {
    expect(normalizeText('فاطمتو منت ابراهيم')).toBe('فاطمتو منت ابراهيم');
  });
});

describe('matchesAllTokens', () => {
  it('matches every token regardless of order and script', () => {
    const haystack = 'Mohamed Ould Sidi محمد ولد سيدي';
    expect(matchesAllTokens(haystack, 'sidi moh')).toBe(true);
    expect(matchesAllTokens(haystack, 'ولد محمد')).toBe(true);
    expect(matchesAllTokens(haystack, 'ahmed')).toBe(false);
    expect(matchesAllTokens(haystack, '')).toBe(true);
  });
});

describe('digitsOf', () => {
  it('keeps digits only', () => {
    expect(digitsOf('+222 45 25 10 10')).toBe('22245251010');
    expect(digitsOf(null)).toBe('');
  });
});
