import type { AuthSession } from './permission.model';

/**
 * Ownership rules layered on top of permissions. A dentist edits their own clinical entries and
 * notes; editing someone else's requires `chart.manage`. Pure so both the UI and the mock backend
 * (and later the real one, in Java) apply the same rule.
 */
export function canEditChartEntry(
  session: AuthSession | null,
  entry: { doctorId: string },
): boolean {
  if (!session) return false;
  if (!session.permissions.includes('chart.write')) return false;
  if (session.permissions.includes('chart.manage')) return true;
  return session.doctorId !== null && session.doctorId === entry.doctorId;
}

export function canEditNote(session: AuthSession | null, note: { doctorId: string }): boolean {
  if (!session) return false;
  if (!session.permissions.includes('note.write')) return false;
  if (session.permissions.includes('chart.manage')) return true;
  return session.doctorId !== null && session.doctorId === note.doctorId;
}
