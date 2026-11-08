import { Observable } from 'rxjs';
import type {
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  BlockedTime,
  BlockedTimeInput,
  DateRange,
} from './appointment.model';
import type { AppointmentMessage, MessageInput } from './message.model';

export abstract class SchedulingBackend {
  abstract listAppointments(range: DateRange): Observable<Appointment[]>;
  abstract listForPatient(patientId: string): Observable<Appointment[]>;
  abstract create(input: AppointmentInput): Observable<Appointment>;
  /** Moves, resizes, reassigns, or edits details. Conflicts are rejected with a BackendError. */
  abstract update(id: string, patch: Partial<AppointmentInput>): Observable<Appointment>;
  abstract setStatus(id: string, status: AppointmentStatus): Observable<Appointment>;
  /** Messages exchanged between reception and doctors about given appointments. */
  abstract listMessages(appointmentIds: string[]): Observable<AppointmentMessage[]>;
  abstract addMessage(input: MessageInput): Observable<AppointmentMessage>;
  abstract listBlockedTimes(range: DateRange): Observable<BlockedTime[]>;
  abstract createBlockedTime(input: BlockedTimeInput): Observable<BlockedTime>;
  abstract deleteBlockedTime(id: string): Observable<void>;
}
