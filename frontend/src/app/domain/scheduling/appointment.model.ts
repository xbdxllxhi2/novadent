export type AppointmentStatus =
  'scheduled' | 'confirmed' | 'arrived' | 'in-chair' | 'done' | 'no-show' | 'cancelled';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'arrived',
  'in-chair',
  'done',
  'no-show',
  'cancelled',
];

/** Statuses that no longer occupy the doctor or the chair. */
export const INACTIVE_STATUSES: ReadonlySet<AppointmentStatus> = new Set(['cancelled', 'no-show']);

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  chairId: string;
  /** ISO timestamps. */
  start: string;
  end: string;
  status: AppointmentStatus;
  reason: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentInput = Pick<
  Appointment,
  'patientId' | 'doctorId' | 'chairId' | 'start' | 'end' | 'reason' | 'note'
> & {
  status?: AppointmentStatus;
};

export interface BlockedTime {
  id: string;
  /** null = every doctor. */
  doctorId: string | null;
  /** null = every chair. */
  chairId: string | null;
  start: string;
  end: string;
  reason: string;
}

export type BlockedTimeInput = Omit<BlockedTime, 'id'>;

export interface DateRange {
  /** Inclusive ISO start. */
  from: string;
  /** Exclusive ISO end. */
  to: string;
}

export type Conflict =
  | { kind: 'doctor'; withId: string }
  | { kind: 'chair'; withId: string }
  | { kind: 'blocked'; withId: string }
  | { kind: 'outside-hours' };
