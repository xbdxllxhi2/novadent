import type { ClinicHours } from '../staff/staff.model';
import { Appointment, BlockedTime, Conflict, INACTIVE_STATUSES } from './appointment.model';
import { isWithinHours } from './slots';

export interface AppointmentCandidate {
  id?: string;
  doctorId: string;
  chairId: string;
  start: string;
  end: string;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Every reason a candidate cannot be booked as is. Doctor, chair, and blocked-time clashes are
 * blocking; `outside-hours` is a warning the UI may let the user override.
 */
export function findConflicts(
  candidate: AppointmentCandidate,
  appointments: Appointment[],
  blocked: BlockedTime[],
  hours: ClinicHours | null,
): Conflict[] {
  const conflicts: Conflict[] = [];
  if (candidate.end <= candidate.start) return conflicts;

  for (const a of appointments) {
    if (a.id === candidate.id || INACTIVE_STATUSES.has(a.status)) continue;
    if (!overlaps(candidate.start, candidate.end, a.start, a.end)) continue;
    if (a.doctorId === candidate.doctorId) conflicts.push({ kind: 'doctor', withId: a.id });
    if (a.chairId === candidate.chairId) conflicts.push({ kind: 'chair', withId: a.id });
  }

  for (const b of blocked) {
    if (!overlaps(candidate.start, candidate.end, b.start, b.end)) continue;
    // null means "every doctor" / "every chair"; a scoped block applies only to its target.
    const hitsDoctor = b.doctorId === null || b.doctorId === candidate.doctorId;
    const hitsChair = b.chairId === null || b.chairId === candidate.chairId;
    if (hitsDoctor && hitsChair) conflicts.push({ kind: 'blocked', withId: b.id });
  }

  if (hours && !isWithinHours(hours, new Date(candidate.start), new Date(candidate.end))) {
    conflicts.push({ kind: 'outside-hours' });
  }

  return conflicts;
}

export function blockingConflicts(conflicts: Conflict[]): Conflict[] {
  return conflicts.filter((c) => c.kind !== 'outside-hours');
}
