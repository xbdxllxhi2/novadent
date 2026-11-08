import { Injectable, computed, inject, signal } from '@angular/core';
import { NotifyService } from '../../core/notify/notify.service';
import { ClinicSettingsStore } from '../staff/clinic-settings.store';
import type {
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  BlockedTime,
  BlockedTimeInput,
  Conflict,
} from './appointment.model';
import { blockingConflicts, findConflicts } from './conflicts';
import { SchedulingBackend } from './scheduling-backend';
import { addDays, rangeForView, startOfDay } from './slots';

export type SchedulerView = 'day' | 'week';
export type SchedulerMode = 'doctor' | 'chair';

@Injectable({ providedIn: 'root' })
export class SchedulingStore {
  private readonly backend = inject(SchedulingBackend);
  private readonly notify = inject(NotifyService);
  private readonly settings = inject(ClinicSettingsStore);
  private loadSeq = 0;

  readonly view = signal<SchedulerView>('day');
  readonly mode = signal<SchedulerMode>('doctor');
  readonly anchorDate = signal<Date>(startOfDay(new Date()));
  /** Doctor selected in week view (one doctor across the week). */
  readonly weekDoctorId = signal<string | null>(null);
  /** Doctors hidden in day view. */
  readonly hiddenDoctorIds = signal<ReadonlySet<string>>(new Set());

  readonly appointments = signal<Appointment[]>([]);
  readonly blockedTimes = signal<BlockedTime[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly range = computed(() => rangeForView(this.view(), this.anchorDate()));

  setView(view: SchedulerView): void {
    this.view.set(view);
    this.load();
  }

  setMode(mode: SchedulerMode): void {
    this.mode.set(mode);
  }

  goTo(date: Date): void {
    this.anchorDate.set(startOfDay(date));
    this.load();
  }

  today(): void {
    this.goTo(new Date());
  }

  step(direction: 1 | -1): void {
    this.goTo(addDays(this.anchorDate(), direction * (this.view() === 'day' ? 1 : 7)));
  }

  toggleDoctor(doctorId: string): void {
    this.hiddenDoctorIds.update((set) => {
      const next = new Set(set);
      if (next.has(doctorId)) next.delete(doctorId);
      else next.add(doctorId);
      return next;
    });
  }

  load(): void {
    const seq = ++this.loadSeq;
    const range = this.range();
    this.loading.set(true);
    this.backend.listAppointments(range).subscribe({
      next: (list) => {
        if (seq !== this.loadSeq) return;
        this.appointments.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        if (seq !== this.loadSeq) return;
        this.loading.set(false);
        this.notify.failure(e);
      },
    });
    this.backend.listBlockedTimes(range).subscribe({
      next: (list) => {
        if (seq === this.loadSeq) this.blockedTimes.set(list);
      },
      error: (e) => this.notify.failure(e),
    });
  }

  /** Client-side preview of conflicts for a candidate; the backend re-checks on save. */
  conflictsFor(candidate: {
    id?: string;
    doctorId: string;
    chairId: string;
    start: string;
    end: string;
  }): Conflict[] {
    return findConflicts(
      candidate,
      this.appointments(),
      this.blockedTimes(),
      this.settings.hours(),
    );
  }

  create(input: AppointmentInput, done?: (a: Appointment) => void): void {
    this.saving.set(true);
    this.backend.create(input).subscribe({
      next: (a) => {
        this.saving.set(false);
        this.appointments.update((list) => [...list, a]);
        this.notify.success('notify.appointmentCreated');
        done?.(a);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  update(id: string, patch: Partial<AppointmentInput>, done?: (a: Appointment) => void): void {
    const previous = this.appointments();
    const current = previous.find((a) => a.id === id);
    if (!current) return;

    // Instant local check: revert immediately with a toast rather than waiting for the server.
    const candidate = {
      id,
      doctorId: patch.doctorId ?? current.doctorId,
      chairId: patch.chairId ?? current.chairId,
      start: patch.start ?? current.start,
      end: patch.end ?? current.end,
    };
    const blocking = blockingConflicts(this.conflictsFor(candidate));
    if (blocking.length > 0) {
      const kind = blocking[0].kind;
      this.notify.warn(
        kind === 'doctor'
          ? 'errors.appointmentConflictDoctor'
          : kind === 'chair'
            ? 'errors.appointmentConflictChair'
            : 'errors.appointmentBlocked',
      );
      return;
    }

    // Optimistic update.
    this.appointments.update((list) =>
      list.map((a) =>
        a.id === id ? { ...a, ...patch, note: patch.note === undefined ? a.note : patch.note } : a,
      ),
    );
    this.saving.set(true);
    this.backend.update(id, patch).subscribe({
      next: (a) => {
        this.saving.set(false);
        this.appointments.update((list) => list.map((x) => (x.id === id ? a : x)));
        this.notify.success('notify.appointmentUpdated');
        done?.(a);
      },
      error: (e) => {
        this.saving.set(false);
        this.appointments.set(previous);
        this.notify.failure(e);
      },
    });
  }

  setStatus(id: string, status: AppointmentStatus): void {
    const previous = this.appointments();
    this.appointments.update((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
    this.backend.setStatus(id, status).subscribe({
      next: (a) => this.appointments.update((list) => list.map((x) => (x.id === id ? a : x))),
      error: (e) => {
        this.appointments.set(previous);
        this.notify.failure(e);
      },
    });
  }

  createBlockedTime(input: BlockedTimeInput, done?: () => void): void {
    this.saving.set(true);
    this.backend.createBlockedTime(input).subscribe({
      next: (b) => {
        this.saving.set(false);
        this.blockedTimes.update((list) => [...list, b]);
        this.notify.success('notify.blockedTimeCreated');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  deleteBlockedTime(id: string): void {
    this.backend.deleteBlockedTime(id).subscribe({
      next: () => {
        this.blockedTimes.update((list) => list.filter((b) => b.id !== id));
        this.notify.success('notify.blockedTimeDeleted');
      },
      error: (e) => this.notify.failure(e),
    });
  }
}
