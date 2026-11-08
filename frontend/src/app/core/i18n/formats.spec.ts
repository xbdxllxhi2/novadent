import { describe, expect, it } from 'vitest';
import {
  ageFromBirthDate,
  formatDate,
  formatMoney,
  formatPhone,
  normalizePhone,
  parseDateLike,
  toIsoDate,
} from './formats';

describe('formatMoney', () => {
  it('rounds to integers, groups thousands and appends the unit', () => {
    const fr = formatMoney(24750, 'fr-MR', 'MRU');
    expect(fr.replace(/[\s  ]/g, '')).toBe('24750MRU');
    expect(formatMoney(999.6, 'en-MR', 'MRU').replace(/[\s  ]/g, '')).toBe('1,000MRU');
  });

  it('uses Latin digits in Arabic', () => {
    const ar = formatMoney(1500, 'ar-MR-u-nu-latn', 'أ.م');
    expect(/1[ \s.,]?500/.test(ar)).toBe(true);
    expect(/[٠-٩]/.test(ar)).toBe(false);
  });
});

describe('phone helpers', () => {
  it('formats E.164 and local numbers', () => {
    expect(formatPhone('+22245251010')).toBe('+222 45 25 10 10');
    expect(formatPhone('45251010')).toBe('+222 45 25 10 10');
    expect(formatPhone('123')).toBe('123');
  });

  it('normalizes to E.164 or rejects', () => {
    expect(normalizePhone('45 25 10 10')).toBe('+22245251010');
    expect(normalizePhone('+222 45251010')).toBe('+22245251010');
    expect(normalizePhone('4525')).toBeNull();
  });
});

describe('dates', () => {
  it('parses YYYY-MM-DD as a local date', () => {
    const d = parseDateLike('2026-03-05')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(5);
    expect(toIsoDate(d)).toBe('2026-03-05');
  });

  it('formats with the locale and returns empty for bad input', () => {
    expect(formatDate('2026-03-05', 'en-MR', 'short')).toContain('2026');
    expect(formatDate('nope', 'fr-MR')).toBe('');
    expect(formatDate(null, 'fr-MR')).toBe('');
  });

  it('computes age', () => {
    expect(ageFromBirthDate('2000-06-15', new Date(2026, 5, 14))).toBe(25);
    expect(ageFromBirthDate('2000-06-15', new Date(2026, 5, 15))).toBe(26);
    expect(ageFromBirthDate(null)).toBeNull();
  });
});
