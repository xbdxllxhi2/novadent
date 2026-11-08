import { Injectable, computed, inject, signal } from '@angular/core';
import { NotifyService } from '../../core/notify/notify.service';
import { StaffBackend } from './staff-backend';
import type { ClinicHours, ClinicSettings } from './staff.model';

@Injectable({ providedIn: 'root' })
export class ClinicSettingsStore {
  private readonly backend = inject(StaffBackend);
  private readonly notify = inject(NotifyService);

  readonly settings = signal<ClinicSettings | null>(null);
  readonly saving = signal(false);

  readonly hours = computed<ClinicHours | null>(() => this.settings()?.hours ?? null);
  readonly clinicName = computed(() => this.settings()?.name ?? 'Novodent');

  load(): void {
    this.backend
      .getSettings()
      .subscribe({ next: (s) => this.settings.set(s), error: (e) => this.notify.failure(e) });
  }

  save(settings: ClinicSettings, done?: () => void): void {
    this.saving.set(true);
    this.backend.saveSettings(settings).subscribe({
      next: (saved) => {
        this.settings.set(saved);
        this.saving.set(false);
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
