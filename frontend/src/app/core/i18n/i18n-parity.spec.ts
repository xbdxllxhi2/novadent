import { describe, expect, it } from 'vitest';
import ar from '../../../../public/i18n/ar.json';
import en from '../../../../public/i18n/en.json';
import fr from '../../../../public/i18n/fr.json';

function keysOf(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? keysOf(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

function values(obj: Record<string, unknown>): string[] {
  return Object.values(obj).flatMap((v) =>
    v && typeof v === 'object' ? values(v as Record<string, unknown>) : [String(v)],
  );
}

describe('translation files', () => {
  const frKeys = keysOf(fr).sort();

  it('share the same key set across fr, ar and en', () => {
    expect(keysOf(en).sort()).toEqual(frKeys);
    expect(keysOf(ar).sort()).toEqual(frKeys);
  });

  it('stay at depth two', () => {
    for (const k of frKeys) expect(k.split('.').length, k).toBe(2);
  });

  it('contain no em dashes or emoji', () => {
    const all = [...values(fr), ...values(en), ...values(ar)];
    for (const v of all) {
      expect(v.includes('—'), v).toBe(false);
      expect(/\p{Extended_Pictographic}/u.test(v), v).toBe(false);
    }
  });

  it('keep interpolation params consistent between languages', () => {
    const params = (s: string) =>
      (s.match(/{{\s*\w+\s*}}/g) ?? []).map((p) => p.replace(/\s/g, '')).sort();
    const flat = (obj: Record<string, unknown>) =>
      Object.fromEntries(
        keysOf(obj).map((k) => [
          k,
          k.split('.').reduce<unknown>((o, part) => (o as Record<string, unknown>)[part], obj),
        ]),
      );
    const f = flat(fr);
    const e = flat(en);
    const a = flat(ar);
    for (const k of frKeys) {
      expect(params(String(e[k])), k).toEqual(params(String(f[k])));
      expect(params(String(a[k])), k).toEqual(params(String(f[k])));
    }
  });
});
