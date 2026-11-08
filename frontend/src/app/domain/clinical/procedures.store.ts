import { Injectable, computed, inject, signal } from '@angular/core';
import { NotifyService } from '../../core/notify/notify.service';
import { ClinicalBackend } from './clinical-backend';
import type { Procedure } from './procedure.model';

@Injectable({ providedIn: 'root' })
export class ProceduresStore {
  private readonly backend = inject(ClinicalBackend);
  private readonly notify = inject(NotifyService);

  readonly procedures = signal<Procedure[]>([]);
  readonly loaded = signal(false);
  readonly saving = signal(false);

  readonly active = computed(() => this.procedures().filter((p) => p.active));
  readonly byCode = computed(() => new Map(this.procedures().map((p) => [p.code, p])));

  get(code: string | null | undefined): Procedure | undefined {
    return code ? this.byCode().get(code) : undefined;
  }

  load(): void {
    this.backend.listProcedures().subscribe({
      next: (list) => {
        this.procedures.set(list);
        this.loaded.set(true);
      },
      error: (e) => this.notify.failure(e),
    });
  }

  save(procedure: Procedure, done?: () => void): void {
    this.saving.set(true);
    this.backend.saveProcedure(procedure).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.procedures.update((list) =>
          list.some((p) => p.code === saved.code)
            ? list.map((p) => (p.code === saved.code ? saved : p))
            : [...list, saved],
        );
        this.notify.success('notify.saved');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }
}
