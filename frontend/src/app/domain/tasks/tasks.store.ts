import { Injectable, computed, inject, signal } from '@angular/core';
import { NotifyService } from '../../core/notify/notify.service';
import type { Task, TaskInput } from './task.model';
import { TasksBackend } from './tasks-backend';

/** Reception's to-do list (open requests from doctors) and per-patient requests. */
@Injectable({ providedIn: 'root' })
export class TasksStore {
  private readonly backend = inject(TasksBackend);
  private readonly notify = inject(NotifyService);

  readonly open = signal<Task[]>([]);
  readonly forPatient = signal<Task[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly openCount = computed(() => this.open().length);

  loadOpen(): void {
    this.loading.set(true);
    this.backend.listOpen().subscribe({
      next: (list) => {
        this.open.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.failure(e);
      },
    });
  }

  loadForPatient(patientId: string): void {
    this.backend.listForPatient(patientId).subscribe({
      next: (list) => this.forPatient.set(list),
      error: () => this.forPatient.set([]),
    });
  }

  create(input: TaskInput, done?: () => void): void {
    this.saving.set(true);
    this.backend.create(input).subscribe({
      next: (task) => {
        this.saving.set(false);
        this.open.update((list) => [...list, task]);
        this.forPatient.update((list) => [task, ...list]);
        this.notify.success('notify.taskCreated');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  complete(id: string): void {
    this.backend.complete(id).subscribe({
      next: (task) => {
        this.open.update((list) => list.filter((t) => t.id !== id));
        this.forPatient.update((list) => list.map((t) => (t.id === id ? task : t)));
        this.notify.success('notify.taskDone');
      },
      error: (e) => this.notify.failure(e),
    });
  }
}
