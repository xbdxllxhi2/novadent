export type TaskKind = 'schedule-followup' | 'invoice' | 'print' | 'other';
export const TASK_KINDS: TaskKind[] = ['schedule-followup', 'invoice', 'print', 'other'];

/** A request from a doctor to the reception: book a follow-up, invoice, print something. */
export interface Task {
  id: string;
  patientId: string;
  appointmentId: string | null;
  kind: TaskKind;
  details: string;
  /** For follow-ups: how long the next appointment should last. */
  durationMinutes: number | null;
  /** For follow-ups: in how many days. */
  delayDays: number | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  status: 'open' | 'done';
  doneBy: string | null;
  doneAt: string | null;
}

export type TaskInput = Pick<
  Task,
  'patientId' | 'appointmentId' | 'kind' | 'details' | 'durationMinutes' | 'delayDays'
>;
