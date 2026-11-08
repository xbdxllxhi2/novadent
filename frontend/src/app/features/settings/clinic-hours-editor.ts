import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { AuthStore } from '../../core/auth/auth.store';
import { hmFromMinutes } from '../../domain/scheduling/slots';
import { ClinicSettingsStore } from '../../domain/staff/clinic-settings.store';
import { ClinicHours, TimeRange, WEEKDAYS, Weekday } from '../../domain/staff/staff.model';

@Component({
  selector: 'app-clinic-hours-editor',
  imports: [FormsModule, TranslocoModule, Button, Select],
  templateUrl: './clinic-hours-editor.html',
  host: { class: 'block rounded-xl border border-surface-700 bg-surface-900 p-4' },
})
export class ClinicHoursEditor {
  protected readonly settings = inject(ClinicSettingsStore);
  protected readonly auth = inject(AuthStore);

  protected readonly hours = signal<ClinicHours>(emptyHours());
  protected readonly weekdays = WEEKDAYS;
  protected readonly timeOptions = Array.from({ length: 24 * 4 + 1 }, (_, i) =>
    hmFromMinutes(Math.min(i * 15, 24 * 60 - 1)),
  );
  protected readonly canManage = computed(() => this.auth.can('settings.manage'));

  constructor() {
    effect(() => {
      const s = this.settings.settings();
      if (s) this.hours.set(structuredClone(s.hours));
    });
  }

  protected ranges(day: Weekday): TimeRange[] {
    return this.hours()[day];
  }

  protected setRange(day: Weekday, index: number, field: keyof TimeRange, value: string): void {
    this.hours.update((h) => {
      const next = structuredClone(h);
      next[day][index] = { ...next[day][index], [field]: value };
      return next;
    });
  }

  protected addRange(day: Weekday): void {
    this.hours.update((h) => {
      const next = structuredClone(h);
      const last = next[day][next[day].length - 1];
      next[day].push(
        last
          ? { start: last.end, end: hmFromMinutes(Math.min(23 * 60 + 45, toMin(last.end) + 240)) }
          : { start: '08:00', end: '13:00' },
      );
      return next;
    });
  }

  protected removeRange(day: Weekday, index: number): void {
    this.hours.update((h) => {
      const next = structuredClone(h);
      next[day].splice(index, 1);
      return next;
    });
  }

  protected copyMondayToWeekdays(): void {
    this.hours.update((h) => {
      const next = structuredClone(h);
      for (const d of ['tue', 'wed', 'thu'] as Weekday[]) next[d] = structuredClone(h.mon);
      return next;
    });
  }

  protected invalid(day: Weekday): boolean {
    const r = this.ranges(day);
    return r.some((x, i) => x.end <= x.start || (i > 0 && x.start < r[i - 1].end));
  }

  protected save(): void {
    const s = this.settings.settings();
    if (!s || WEEKDAYS.some((d) => this.invalid(d))) return;
    this.settings.save({ ...s, hours: this.hours() });
  }
}

function toMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function emptyHours(): ClinicHours {
  return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
}
