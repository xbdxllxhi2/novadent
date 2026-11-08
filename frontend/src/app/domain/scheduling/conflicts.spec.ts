import { describe, expect, it } from 'vitest';
import type { ClinicHours } from '../staff/staff.model';
import type { Appointment, BlockedTime } from './appointment.model';
import { blockingConflicts, findConflicts } from './conflicts';
import { toIso } from './slots';

const HOURS: ClinicHours = {
  mon: [{ start: '08:00', end: '13:00' }],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
};

function appt(
  id: string,
  doctorId: string,
  chairId: string,
  start: string,
  end: string,
  status: Appointment['status'] = 'scheduled',
): Appointment {
  return {
    id,
    patientId: 'p',
    doctorId,
    chairId,
    start: toIso('2026-11-09', start),
    end: toIso('2026-11-09', end),
    status,
    reason: '',
    note: null,
    createdBy: 'u',
    createdAt: '',
    updatedAt: '',
  };
}

const existing = [
  appt('a1', 'd1', 'c1', '09:00', '10:00'),
  appt('a2', 'd2', 'c2', '09:00', '10:00', 'cancelled'),
];
const blocked: BlockedTime[] = [
  {
    id: 'b1',
    doctorId: null,
    chairId: null,
    start: toIso('2026-11-09', '11:00'),
    end: toIso('2026-11-09', '12:00'),
    reason: 'meeting',
  },
];

describe('findConflicts', () => {
  it('flags doctor and chair overlaps separately', () => {
    const c = findConflicts(
      {
        doctorId: 'd1',
        chairId: 'c1',
        start: toIso('2026-11-09', '09:30'),
        end: toIso('2026-11-09', '10:30'),
      },
      existing,
      [],
      HOURS,
    );
    expect(c).toEqual([
      { kind: 'doctor', withId: 'a1' },
      { kind: 'chair', withId: 'a1' },
    ]);
  });

  it('ignores cancelled appointments and the candidate itself', () => {
    expect(
      findConflicts(
        {
          doctorId: 'd2',
          chairId: 'c2',
          start: toIso('2026-11-09', '09:00'),
          end: toIso('2026-11-09', '09:30'),
        },
        existing,
        [],
        HOURS,
      ),
    ).toEqual([]);
    expect(
      findConflicts(
        {
          id: 'a1',
          doctorId: 'd1',
          chairId: 'c1',
          start: toIso('2026-11-09', '09:15'),
          end: toIso('2026-11-09', '10:15'),
        },
        existing,
        [],
        HOURS,
      ),
    ).toEqual([]);
  });

  it('treats back-to-back slots as free', () => {
    expect(
      findConflicts(
        {
          doctorId: 'd1',
          chairId: 'c1',
          start: toIso('2026-11-09', '10:00'),
          end: toIso('2026-11-09', '10:30'),
        },
        existing,
        [],
        HOURS,
      ),
    ).toEqual([]);
  });

  it('reports blocked time and outside hours', () => {
    const c = findConflicts(
      {
        doctorId: 'd1',
        chairId: 'c1',
        start: toIso('2026-11-09', '11:30'),
        end: toIso('2026-11-09', '13:30'),
      },
      existing,
      blocked,
      HOURS,
    );
    expect(c).toEqual([{ kind: 'blocked', withId: 'b1' }, { kind: 'outside-hours' }]);
    expect(blockingConflicts(c)).toEqual([{ kind: 'blocked', withId: 'b1' }]);
  });

  it('applies a block scoped to one doctor only to that doctor', () => {
    const scoped: BlockedTime[] = [{ ...blocked[0], doctorId: 'd9' }];
    expect(
      findConflicts(
        {
          doctorId: 'd1',
          chairId: 'c1',
          start: toIso('2026-11-09', '11:00'),
          end: toIso('2026-11-09', '11:30'),
        },
        [],
        scoped,
        HOURS,
      ),
    ).toEqual([]);
    expect(
      findConflicts(
        {
          doctorId: 'd9',
          chairId: 'c1',
          start: toIso('2026-11-09', '11:00'),
          end: toIso('2026-11-09', '11:30'),
        },
        [],
        scoped,
        HOURS,
      ),
    ).toEqual([{ kind: 'blocked', withId: 'b1' }]);
  });
});
