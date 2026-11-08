/**
 * Pure formatting helpers. They take the Intl locale tag from LocaleStore so pipes and components
 * re-render on language change without any of this knowing about Angular.
 */

const moneyFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function moneyFormatter(locale: string): Intl.NumberFormat {
  let f = moneyFormatters.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale, { maximumFractionDigits: 0, useGrouping: true });
    moneyFormatters.set(locale, f);
  }
  return f;
}

/** Integer MRU with grouping and the unit label the caller translated (`MRU`, `أ.م`). */
export function formatMoney(amount: number, locale: string, unit: string): string {
  return `${moneyFormatter(locale).format(Math.round(amount))} ${unit}`;
}

export function formatInteger(value: number, locale: string): string {
  return moneyFormatter(locale).format(Math.round(value));
}

export type DateStyle =
  'short' | 'medium' | 'long' | 'time' | 'dateTime' | 'weekdayShort' | 'weekdayLong' | 'monthYear';

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: '2-digit', month: '2-digit', year: 'numeric' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit', hour12: false },
  dateTime: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
  weekdayShort: { weekday: 'short', day: 'numeric', month: 'short' },
  weekdayLong: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  monthYear: { month: 'long', year: 'numeric' },
};

function dateFormatter(locale: string, style: DateStyle): Intl.DateTimeFormat {
  const key = `${locale}|${style}`;
  let f = dateFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, DATE_OPTIONS[style]);
    dateFormatters.set(key, f);
  }
  return f;
}

/** Accepts ISO timestamps, `YYYY-MM-DD` dates, or Date objects. */
export function formatDate(
  value: string | Date | null | undefined,
  locale: string,
  style: DateStyle = 'short',
): string {
  if (!value) return '';
  const date = typeof value === 'string' ? parseDateLike(value) : value;
  if (!date || Number.isNaN(date.getTime())) return '';
  return dateFormatter(locale, style).format(date);
}

/** `YYYY-MM-DD` is parsed as a local date (not UTC), everything else goes through Date. */
export function parseDateLike(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `+22212345678` -> `+222 12 34 56 78`; anything unexpected is returned unchanged. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('222')) {
    const local = digits.slice(3);
    return `+222 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)}`;
  }
  if (digits.length === 8) {
    return `+222 ${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`;
  }
  return phone;
}

/** Normalizes user input to E.164 for Mauritania; returns null when it is not an 8-digit number. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 8) return `+222${digits}`;
  if (digits.length === 11 && digits.startsWith('222')) return `+${digits}`;
  return null;
}

/** Local `YYYY-MM-DD` for a Date. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local `HH:mm` for a Date. */
export function toHm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function ageFromBirthDate(
  birthDate: string | null | undefined,
  today = new Date(),
): number | null {
  if (!birthDate) return null;
  const b = parseDateLike(birthDate);
  if (!b) return null;
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}
