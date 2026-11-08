export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** `HH:mm` local times. */
export interface TimeRange {
  start: string;
  end: string;
}

/** Empty array = closed. Friday is typically a single morning range. */
export type ClinicHours = Record<Weekday, TimeRange[]>;

export interface ClinicSettings {
  id: 'clinic';
  name: string;
  address: string;
  phone: string;
  hours: ClinicHours;
  slotMinutes: 15;
  currency: 'MRU';
}

/** Fixed swatches for doctor colours (scheduler columns, avatars). Picked in Settings, never typed. */
export const DOCTOR_COLORS = [
  '#237A78', // teal
  '#4677B8', // sky
  '#7C6FCD', // violet
  '#C65A86', // rose
  '#C97D27', // amber
  '#369E68', // green
  '#6B7F93', // slate
  '#9C6B4A', // brown
] as const;

export interface Doctor {
  id: string;
  nameLatin: string;
  nameArabic: string;
  color: string;
  specialty?: string;
  active: boolean;
}

export interface Chair {
  id: string;
  name: string;
  order: number;
  active: boolean;
}

export interface StaffUser {
  id: string;
  username: string;
  displayName: string;
  roleId: string;
  /** Linked doctor when the staff member treats patients. */
  doctorId: string | null;
  active: boolean;
}

/** Maps JS `Date.getDay()` (0 = Sunday) to our weekday keys. */
export function weekdayOf(date: Date): Weekday {
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as Weekday[])[date.getDay()];
}
