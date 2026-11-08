import { ClinicHours, TimeRange, weekdayOf } from '../staff/staff.model';
import type { DateRange } from './appointment.model';

export const SLOT_MINUTES = 15;

export function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function hmFromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Monday-based week start. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  return addDays(d, -day);
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Minutes since local midnight for an ISO timestamp (or Date). */
export function minutesOfDay(value: string | Date): number {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.getHours() * 60 + d.getMinutes();
}

export function snapMinutes(minutes: number, step = SLOT_MINUTES): number {
  return Math.round(minutes / step) * step;
}

export function rangeForView(view: 'day' | 'week', anchor: Date): DateRange {
  const from = view === 'day' ? startOfDay(anchor) : startOfWeek(anchor);
  const to = addDays(from, view === 'day' ? 1 : 7);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Open ranges for the weekday of `date`. Empty = closed. */
export function hoursFor(hours: ClinicHours, date: Date): TimeRange[] {
  return hours[weekdayOf(date)] ?? [];
}

/**
 * Vertical extent of the grid in minutes: earliest open to latest close across the given days,
 * with a sane fallback when every day is closed.
 */
export function gridBounds(hours: ClinicHours, days: Date[]): { startMin: number; endMin: number } {
  let startMin = Number.POSITIVE_INFINITY;
  let endMin = Number.NEGATIVE_INFINITY;
  for (const day of days) {
    for (const r of hoursFor(hours, day)) {
      startMin = Math.min(startMin, parseHm(r.start));
      endMin = Math.max(endMin, parseHm(r.end));
    }
  }
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin))
    return { startMin: 8 * 60, endMin: 20 * 60 };
  // Breathing room of one slot on each side, clamped to the day.
  return {
    startMin: Math.max(0, startMin - SLOT_MINUTES),
    endMin: Math.min(24 * 60, endMin + SLOT_MINUTES),
  };
}

/** True when [start, end) lies entirely inside one open range of that day. */
export function isWithinHours(hours: ClinicHours, start: Date, end: Date): boolean {
  if (!sameDay(start, addMinutes(end, -1))) return false;
  const s = minutesOfDay(start);
  const e = minutesOfDay(end) === 0 ? 24 * 60 : minutesOfDay(end);
  return hoursFor(hours, start).some((r) => s >= parseHm(r.start) && e <= parseHm(r.end));
}

export interface LaneItem {
  id: string;
  start: string;
  end: string;
}

export interface LanePlacement {
  lane: number;
  lanes: number;
}

/**
 * Lane packing for overlapping intervals inside one column: items in a connected group of
 * overlaps share the column width. Greedy interval colouring, stable by start time.
 */
export function packLanes(items: LaneItem[]): Map<string, LanePlacement> {
  const sorted = [...items].sort(
    (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
  );
  const placements = new Map<string, LanePlacement>();
  let group: { id: string; lane: number }[] = [];
  let laneEnds: string[] = [];
  let groupEnd = '';

  const flush = () => {
    const lanes = laneEnds.length;
    for (const g of group) placements.set(g.id, { lane: g.lane, lanes });
    group = [];
    laneEnds = [];
    groupEnd = '';
  };

  for (const item of sorted) {
    if (group.length > 0 && item.start >= groupEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    group.push({ id: item.id, lane });
    if (item.end > groupEnd) groupEnd = item.end;
  }
  if (group.length > 0) flush();
  return placements;
}

/** The seven days of the week containing `anchor`, Monday first. */
export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Combines a local `YYYY-MM-DD` and `HH:mm` into an ISO timestamp. */
export function toIso(date: string, hm: string): string {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
}
