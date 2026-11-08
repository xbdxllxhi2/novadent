/**
 * Search normalization for a bilingual patient base. Latin text loses case and diacritics; Arabic
 * text loses tashkeel and the usual orthographic variants (alef forms, ta marbuta, alef maqsura),
 * so a fully vocalized name matches its bare spelling and "Moussa" matches "MOUSSA".
 */

/** Harakat, tanwin, shadda, sukun, superscript alef, Quranic marks, and tatweel. */
const ARABIC_TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
/** Latin combining diacritics left after NFD decomposition. */
const COMBINING_MARKS = /[̀-ͯ]/g;
/** Alef with madda, hamza above, hamza below, wasla. */
const ALEF_VARIANTS = /[آأإٱ]/g;

export function normalizeText(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(ARABIC_TASHKEEL, '')
    .replace(ALEF_VARIANTS, 'ا') // -> alef
    .replace(/ة/g, 'ه') // ta marbuta -> ha
    .replace(/ى/g, 'ي') // alef maqsura -> ya
    .replace(/ؤ/g, 'و') // waw with hamza -> waw
    .replace(/ئ/g, 'ي') // ya with hamza -> ya
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Digits only, for phone and file-number matching. */
export function digitsOf(input: string | null | undefined): string {
  return (input ?? '').replace(/\D/g, '');
}

/** True when every whitespace-separated token of the query appears in the haystack. */
export function matchesAllTokens(haystack: string, query: string): boolean {
  const tokens = normalizeText(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const h = normalizeText(haystack);
  return tokens.every((t) => h.includes(t));
}
