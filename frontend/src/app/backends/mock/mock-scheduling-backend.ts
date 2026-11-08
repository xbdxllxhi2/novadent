import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendError } from '../../core/backend-error';
import type { Patient } from '../../domain/patients/patient.model';
import {
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  BlockedTime,
  BlockedTimeInput,
  DateRange,
} from '../../domain/scheduling/appointment.model';
import { blockingConflicts, findConflicts } from '../../domain/scheduling/conflicts';
import type { AppointmentMessage, MessageInput } from '../../domain/scheduling/message.model';
import { SchedulingBackend } from '../../domain/scheduling/scheduling-backend';
import type { Chair, Doctor } from '../../domain/staff/staff.model';
import { newId } from './ids';
import { respond } from './latency';
import { MockAuthBackend } from './mock-auth-backend';
import { MockDb } from './mock-db';
import { MockStaffBackend } from './mock-staff-backend';

@Injectable({ providedIn: 'root' })
export class MockSchedulingBackend extends SchedulingBackend {
  private readonly db = inject(MockDb);
  private readonly auth = inject(MockAuthBackend);
  private readonly staff = inject(MockStaffBackend);

  listAppointments(range: DateRange): Observable<Appointment[]> {
    return respond(() => {
      this.auth.require('appointment.read');
      return this.db
        .collection<Appointment>('appointments')
        .where((a) => a.start < range.to && a.end > range.from);
    });
  }

  listForPatient(patientId: string): Observable<Appointment[]> {
    return respond(() => {
      this.auth.require('appointment.read');
      return this.db
        .collection<Appointment>('appointments')
        .where((a) => a.patientId === patientId)
        .sort((a, b) => b.start.localeCompare(a.start));
    });
  }

  create(input: AppointmentInput): Observable<Appointment> {
    return respond(() => {
      const session = this.auth.require('appointment.write');
      this.validate(input);
      this.assertFree({ ...input });
      const now = new Date().toISOString();
      return this.db.collection<Appointment>('appointments').insert({
        ...input,
        note: input.note ?? null,
        id: newId(),
        status: input.status ?? 'scheduled',
        createdBy: session.user.id,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  update(id: string, patch: Partial<AppointmentInput>): Observable<Appointment> {
    return respond(() => {
      this.auth.require('appointment.write');
      const appointments = this.db.collection<Appointment>('appointments');
      const current = appointments.require(id);
      const next: Appointment = {
        ...current,
        ...patch,
        note: patch.note === undefined ? current.note : patch.note,
        updatedAt: new Date().toISOString(),
      };
      this.validate(next);
      this.assertFree(next);
      return appointments.update(id, next);
    });
  }

  setStatus(id: string, status: AppointmentStatus): Observable<Appointment> {
    return respond(() => {
      this.auth.require(status === 'cancelled' ? 'appointment.cancel' : 'appointment.write');
      return this.db
        .collection<Appointment>('appointments')
        .update(id, { status, updatedAt: new Date().toISOString() });
    });
  }

  listMessages(appointmentIds: string[]): Observable<AppointmentMessage[]> {
    return respond(() => {
      this.auth.require('appointment.read');
      const wanted = new Set(appointmentIds);
      return this.db
        .collection<AppointmentMessage>('messages')
        .where((m) => wanted.has(m.appointmentId))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }

  addMessage(input: MessageInput): Observable<AppointmentMessage> {
    return respond(() => {
      const session = this.auth.require('appointment.write');
      this.db.collection<Appointment>('appointments').require(input.appointmentId);
      if (!input.body.trim()) throw new BackendError('validation', { field: 'body' });
      return this.db.collection<AppointmentMessage>('messages').insert({
        id: newId(),
        appointmentId: input.appointmentId,
        patientId: input.patientId,
        authorId: session.user.id,
        authorName: session.user.displayName,
        body: input.body.trim(),
        createdAt: new Date().toISOString(),
      });
    });
  }

  listBlockedTimes(range: DateRange): Observable<BlockedTime[]> {
    return respond(() => {
      this.auth.require('appointment.read');
      return this.db
        .collection<BlockedTime>('blockedTimes')
        .where((b) => b.start < range.to && b.end > range.from);
    });
  }

  createBlockedTime(input: BlockedTimeInput): Observable<BlockedTime> {
    return respond(() => {
      this.auth.require('appointment.block');
      if (input.end <= input.start) throw new BackendError('validation', { field: 'end' });
      return this.db.collection<BlockedTime>('blockedTimes').insert({ ...input, id: newId() });
    });
  }

  deleteBlockedTime(id: string): Observable<void> {
    return respond(() => {
      this.auth.require('appointment.block');
      this.db.collection<BlockedTime>('blockedTimes').remove(id);
    });
  }

  private validate(input: AppointmentInput): void {
    if (input.end <= input.start) throw new BackendError('validation', { field: 'end' });
    this.db.collection<Patient>('patients').require(input.patientId);
    this.db.collection<Doctor>('doctors').require(input.doctorId);
    this.db.collection<Chair>('chairs').require(input.chairId);
  }

  /** Server-side re-check so a stale client cannot double-book. Outside-hours is allowed here. */
  private assertFree(candidate: {
    id?: string;
    doctorId: string;
    chairId: string;
    start: string;
    end: string;
  }): void {
    const appointments = this.db
      .collection<Appointment>('appointments')
      .where((a) => a.start < candidate.end && a.end > candidate.start);
    const blocked = this.db
      .collection<BlockedTime>('blockedTimes')
      .where((b) => b.start < candidate.end && b.end > candidate.start);
    const conflicts = blockingConflicts(
      findConflicts(candidate, appointments, blocked, this.staff.settings().hours),
    );
    const first = conflicts[0];
    if (!first) return;
    if (first.kind === 'doctor') throw new BackendError('appointmentConflictDoctor');
    if (first.kind === 'chair') throw new BackendError('appointmentConflictChair');
    throw new BackendError('appointmentBlocked');
  }
}
