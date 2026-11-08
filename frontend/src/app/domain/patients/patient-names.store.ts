import { Injectable, inject, signal } from '@angular/core';
import type { Patient } from './patient.model';
import { PatientsBackend } from './patients-backend';

/**
 * Cache of patients by id for screens that show many names at once (scheduler, agenda).
 * `ensure()` fetches only the ids not seen yet, in one batch.
 */
@Injectable({ providedIn: 'root' })
export class PatientNamesStore {
  private readonly backend = inject(PatientsBackend);
  private readonly pending = new Set<string>();

  readonly byId = signal<ReadonlyMap<string, Patient>>(new Map());

  get(id: string | null | undefined): Patient | undefined {
    return id ? this.byId().get(id) : undefined;
  }

  put(patient: Patient): void {
    this.byId.update((map) => new Map(map).set(patient.id, patient));
  }

  ensure(ids: Iterable<string>): void {
    const known = this.byId();
    const missing = [...new Set(ids)].filter((id) => !known.has(id) && !this.pending.has(id));
    if (missing.length === 0) return;
    for (const id of missing) this.pending.add(id);
    this.backend.getMany(missing).subscribe({
      next: (list) => {
        this.byId.update((map) => {
          const next = new Map(map);
          for (const p of list) next.set(p.id, p);
          return next;
        });
        for (const id of missing) this.pending.delete(id);
      },
      error: () => {
        for (const id of missing) this.pending.delete(id);
      },
    });
  }
}
