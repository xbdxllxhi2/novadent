import { describe, expect, it } from 'vitest';
import type { ClinicHours } from '../staff/staff.model';
import {
  gridBounds,
  isWithinHours,
  packLanes,
  rangeForView,
  snapMinutes,
  startOfWeek,
  toIso,
} from './slots';

const HOURS: ClinicHours = {
  mon: [
    { start: '08:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  tue: [
    { start: '08:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  wed: [
    { start: '08:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  thu: [
    { start: '08:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  fri: [{ start: '08:00', end: '12:30' }],
  sat: [{ start: '09:00', end: '14:00' }],
  sun: [],
};

// 2026-11-09 is a Monday, 2026-11-13 a Friday, 2026-11-15 a Sunday.
const monday = new Date(2026, 10, 9);
const friday = new Date(2026, 10, 13);
const sunday = new Date(2026, 10, 15);

describe('snapMinutes', () => {
  it('snaps to 15 minute slots', () => {
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(8)).toBe(15);
    expect(snapMinutes(52)).toBe(45);
    expect(snapMinutes(-20)).toBe(-15);
  });
});

describe('startOfWeek / rangeForView', () => {
  it('starts the week on Monday', () => {
    expect(startOfWeek(sunday).getDate()).toBe(9);
    expect(startOfWeek(monday).getDate()).toBe(9);
  });
  it('builds day and week ranges', () => {
    const day = rangeForView('day', friday);
    expect(new Date(day.to).getTime() - new Date(day.from).getTime()).toBe(24 * 3600 * 1000);
    const week = rangeForView('week', friday);
    expect(new Date(week.from).getDate()).toBe(9);
    expect(new Date(week.to).getDate()).toBe(16);
  });
});

describe('gridBounds', () => {
  it('spans earliest open to latest close with one slot of padding', () => {
    expect(gridBounds(HOURS, [monday])).toEqual({ startMin: 7 * 60 + 45, endMin: 20 * 60 + 15 });
    expect(gridBounds(HOURS, [friday])).toEqual({ startMin: 7 * 60 + 45, endMin: 12 * 60 + 45 });
  });
  it('falls back when every day is closed', () => {
    expect(gridBounds(HOURS, [sunday])).toEqual({ startMin: 8 * 60, endMin: 20 * 60 });
  });
});

describe('isWithinHours', () => {
  it('accepts a slot inside a range and rejects the Friday afternoon and lunch break', () => {
    expect(
      isWithinHours(
        HOURS,
        new Date(toIso('2026-11-09', '09:00')),
        new Date(toIso('2026-11-09', '09:30')),
      ),
    ).toBe(true);
    expect(
      isWithinHours(
        HOURS,
        new Date(toIso('2026-11-09', '12:45')),
        new Date(toIso('2026-11-09', '13:15')),
      ),
    ).toBe(false);
    expect(
      isWithinHours(
        HOURS,
        new Date(toIso('2026-11-13', '15:00')),
        new Date(toIso('2026-11-13', '15:30')),
      ),
    ).toBe(false);
    expect(
      isWithinHours(
        HOURS,
        new Date(toIso('2026-11-15', '10:00')),
        new Date(toIso('2026-11-15', '10:30')),
      ),
    ).toBe(false);
  });
  it('accepts a slot ending exactly at closing time', () => {
    expect(
      isWithinHours(
        HOURS,
        new Date(toIso('2026-11-13', '12:00')),
        new Date(toIso('2026-11-13', '12:30')),
      ),
    ).toBe(true);
  });
});

describe('packLanes', () => {
  it('gives overlapping items separate lanes and shared width', () => {
    const lanes = packLanes([
      { id: 'a', start: '2026-11-09T09:00:00.000Z', end: '2026-11-09T10:00:00.000Z' },
      { id: 'b', start: '2026-11-09T09:30:00.000Z', end: '2026-11-09T10:30:00.000Z' },
      { id: 'c', start: '2026-11-09T10:00:00.000Z', end: '2026-11-09T11:00:00.000Z' },
      { id: 'd', start: '2026-11-09T12:00:00.000Z', end: '2026-11-09T12:30:00.000Z' },
    ]);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get('b')).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get('c')).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get('d')).toEqual({ lane: 0, lanes: 1 });
  });
});
