import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Appointment, BlockedTime } from '../../domain/scheduling/appointment.model';
import type { AppointmentMessage } from '../../domain/scheduling/message.model';
import { SchedulingBackend } from '../../domain/scheduling/scheduling-backend';
import { notImplemented } from './not-implemented';

@Injectable({ providedIn: 'root' })
export class RemoteSchedulingBackend extends SchedulingBackend {
  listAppointments(): Observable<Appointment[]> {
    return notImplemented('SchedulingBackend.listAppointments');
  }
  listForPatient(): Observable<Appointment[]> {
    return notImplemented('SchedulingBackend.listForPatient');
  }
  create(): Observable<Appointment> {
    return notImplemented('SchedulingBackend.create');
  }
  update(): Observable<Appointment> {
    return notImplemented('SchedulingBackend.update');
  }
  setStatus(): Observable<Appointment> {
    return notImplemented('SchedulingBackend.setStatus');
  }
  listMessages(): Observable<AppointmentMessage[]> {
    return notImplemented('SchedulingBackend.listMessages');
  }
  addMessage(): Observable<AppointmentMessage> {
    return notImplemented('SchedulingBackend.addMessage');
  }
  listBlockedTimes(): Observable<BlockedTime[]> {
    return notImplemented('SchedulingBackend.listBlockedTimes');
  }
  createBlockedTime(): Observable<BlockedTime> {
    return notImplemented('SchedulingBackend.createBlockedTime');
  }
  deleteBlockedTime(): Observable<void> {
    return notImplemented('SchedulingBackend.deleteBlockedTime');
  }
}
