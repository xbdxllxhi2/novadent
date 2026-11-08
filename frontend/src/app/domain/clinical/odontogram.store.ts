import { Injectable, computed, inject, signal } from '@angular/core';
import { NotifyService } from '../../core/notify/notify.service';
import { deriveChart } from './chart-derivation';
import { ClinicalBackend } from './clinical-backend';
import type { ChartEntry, ChartEntryInput } from './tooth.model';

/** Chart entries of the patient currently open, and the derived tooth states. */
@Injectable({ providedIn: 'root' })
export class OdontogramStore {
  private readonly backend = inject(ClinicalBackend);
  private readonly notify = inject(NotifyService);

  readonly patientId = signal<string | null>(null);
  readonly entries = signal<ChartEntry[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly chart = computed(() => deriveChart(this.entries()));
  readonly history = computed(() => this.entries().filter((e) => !e.voided));

  load(patientId: string): void {
    if (this.patientId() !== patientId) this.entries.set([]);
    this.patientId.set(patientId);
    this.loading.set(true);
    this.backend.listChartEntries(patientId).subscribe({
      next: (list) => {
        if (this.patientId() !== patientId) return;
        this.entries.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.failure(e);
      },
    });
  }

  reload(): void {
    const id = this.patientId();
    if (id) this.load(id);
  }

  add(input: ChartEntryInput, done?: () => void): void {
    this.saving.set(true);
    this.backend.addChartEntry(input).subscribe({
      next: (entry) => {
        this.saving.set(false);
        this.entries.update((list) => [entry, ...list]);
        this.notify.success('notify.chartEntrySaved');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  update(
    id: string,
    patch: Partial<Pick<ChartEntry, 'status' | 'note' | 'surfaces'>>,
    done?: () => void,
  ): void {
    this.saving.set(true);
    this.backend.updateChartEntry(id, patch).subscribe({
      next: (entry) => {
        this.saving.set(false);
        this.entries.update((list) => list.map((e) => (e.id === id ? entry : e)));
        this.notify.success('notify.chartEntrySaved');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  void(id: string): void {
    this.backend.voidChartEntry(id).subscribe({
      next: (entry) => {
        this.entries.update((list) => list.map((e) => (e.id === id ? entry : e)));
        this.notify.success('notify.chartEntryVoided');
      },
      error: (e) => this.notify.failure(e),
    });
  }
}
