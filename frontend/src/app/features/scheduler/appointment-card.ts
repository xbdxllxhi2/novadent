import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { LocaleStore } from '../../core/i18n/locale.store';
import type { Patient } from '../../domain/patients/patient.model';
import {
  APPOINTMENT_STATUSES,
  Appointment,
  AppointmentStatus,
} from '../../domain/scheduling/appointment.model';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { patientDisplayName } from '../../shared/ui/patient-name';

const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  scheduled: 'border-surface-600 bg-surface-900 text-surface-100',
  confirmed: 'border-info bg-info/10 text-surface-100',
  arrived: 'border-warn bg-warn/12 text-surface-100',
  'in-chair': 'border-primary bg-primary/18 text-surface-100',
  done: 'border-success bg-success/10 text-surface-200',
  'no-show': 'border-danger border-dashed bg-surface-900 text-surface-300',
  cancelled: 'border-surface-700 bg-surface-900 text-surface-400 line-through',
};

@Component({
  selector: 'app-appointment-card',
  imports: [TranslocoModule, Menu, AppDatePipe],
  templateUrl: './appointment-card.html',
  host: { class: 'block select-none' },
})
export class AppointmentCard {
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleStore);

  readonly appointment = input.required<Appointment>();
  readonly patient = input<Patient | undefined>(undefined);
  readonly compact = input(false);
  readonly editable = input(true);
  readonly canCancel = input(false);

  readonly statusChange = output<AppointmentStatus>();
  readonly openPatient = output<void>();

  protected readonly classes = computed(() => STATUS_CLASSES[this.appointment().status]);
  protected readonly patientName = computed(() => {
    const p = this.patient();
    return p ? patientDisplayName(p, this.locale.lang()) : '';
  });
  protected readonly hasAlerts = computed(() => (this.patient()?.alerts.length ?? 0) > 0);

  protected readonly statusMenu = computed<MenuItem[]>(() => {
    const current = this.appointment().status;
    const items: MenuItem[] = APPOINTMENT_STATUSES.filter(
      (s) => s !== 'cancelled' && s !== current,
    ).map((s) => ({
      label: this.transloco.translate(`apptStatus.${s}`),
      command: () => this.statusChange.emit(s),
    }));
    items.push({ separator: true });
    items.push({
      label: this.transloco.translate('scheduler.openPatient'),
      icon: 'pi pi-user',
      command: () => this.openPatient.emit(),
    });
    if (this.canCancel() && current !== 'cancelled') {
      items.push({
        label: this.transloco.translate('scheduler.cancelAppointment'),
        icon: 'pi pi-times',
        styleClass: 'text-danger',
        command: () => this.statusChange.emit('cancelled'),
      });
    }
    return items;
  });

  protected stop(event: Event): void {
    event.stopPropagation();
  }
}
