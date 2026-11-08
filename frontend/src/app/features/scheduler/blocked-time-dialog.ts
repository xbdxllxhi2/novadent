import { Component, computed, effect, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { toIsoDate } from '../../core/i18n/formats';
import { SchedulingStore } from '../../domain/scheduling/scheduling.store';
import { hmFromMinutes, toIso } from '../../domain/scheduling/slots';
import { StaffStore } from '../../domain/staff/staff.store';

@Component({
  selector: 'app-blocked-time-dialog',
  imports: [FormsModule, TranslocoModule, Button, DatePicker, Dialog, InputText, Select],
  templateUrl: './blocked-time-dialog.html',
})
export class BlockedTimeDialog {
  protected readonly store = inject(SchedulingStore);
  protected readonly staff = inject(StaffStore);

  readonly visible = model(false);

  protected readonly date = signal<Date>(new Date());
  protected readonly startHm = signal('13:00');
  protected readonly endHm = signal('14:00');
  protected readonly doctorId = signal<string | null>(null);
  protected readonly chairId = signal<string | null>(null);
  protected readonly reason = signal('');
  protected readonly submitted = signal(false);

  protected readonly timeOptions = Array.from({ length: (22 - 7) * 4 + 1 }, (_, i) =>
    hmFromMinutes(7 * 60 + i * 15),
  );
  protected readonly valid = computed(
    () => this.reason().trim().length > 0 && this.endHm() > this.startHm(),
  );

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.submitted.set(false);
        this.date.set(this.store.anchorDate());
        this.reason.set('');
        this.doctorId.set(null);
        this.chairId.set(null);
      }
    });
  }

  protected submit(): void {
    this.submitted.set(true);
    if (!this.valid()) return;
    const day = toIsoDate(this.date());
    this.store.createBlockedTime(
      {
        doctorId: this.doctorId(),
        chairId: this.chairId(),
        start: toIso(day, this.startHm()),
        end: toIso(day, this.endHm()),
        reason: this.reason().trim(),
      },
      () => this.visible.set(false),
    );
  }
}
