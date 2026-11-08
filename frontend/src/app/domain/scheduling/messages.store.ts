import { Injectable, computed, inject, signal } from '@angular/core';
import { NotifyService } from '../../core/notify/notify.service';
import type { AppointmentMessage, MessageInput } from './message.model';
import { SchedulingBackend } from './scheduling-backend';

/** Messages for a set of appointments (the ones on screen), grouped by appointment. */
@Injectable({ providedIn: 'root' })
export class MessagesStore {
  private readonly backend = inject(SchedulingBackend);
  private readonly notify = inject(NotifyService);
  private loadedFor = '';

  readonly messages = signal<AppointmentMessage[]>([]);
  readonly saving = signal(false);

  readonly byAppointment = computed(() => {
    const map = new Map<string, AppointmentMessage[]>();
    for (const m of this.messages())
      map.set(m.appointmentId, [...(map.get(m.appointmentId) ?? []), m]);
    return map;
  });

  for(appointmentId: string): AppointmentMessage[] {
    return this.byAppointment().get(appointmentId) ?? [];
  }

  /** Loads messages for the given appointments; skips when the set is unchanged. */
  load(appointmentIds: string[], force = false): void {
    const key = [...appointmentIds].sort().join(',');
    if (!force && key === this.loadedFor) return;
    this.loadedFor = key;
    if (appointmentIds.length === 0) {
      this.messages.set([]);
      return;
    }
    this.backend
      .listMessages(appointmentIds)
      .subscribe({ next: (list) => this.messages.set(list), error: (e) => this.notify.failure(e) });
  }

  send(input: MessageInput, done?: () => void): void {
    this.saving.set(true);
    this.backend.addMessage(input).subscribe({
      next: (m) => {
        this.saving.set(false);
        this.messages.update((list) => [...list, m]);
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }
}
