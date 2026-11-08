import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import { BillingBackend } from '../../domain/billing/billing-backend';
import { balanceOf } from '../../domain/billing/invoice-math';
import type { Invoice } from '../../domain/billing/invoice.model';
import { PatientsStore } from '../../domain/patients/patients.store';
import type { Appointment } from '../../domain/scheduling/appointment.model';
import { SchedulingBackend } from '../../domain/scheduling/scheduling-backend';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { MoneyPipe } from '../../shared/ui/money.pipe';
import { PhonePipe } from '../../shared/ui/phone.pipe';
import { StatusTag } from '../../shared/ui/status-tag';
import { appointmentTone } from '../scheduler/appointment-tone';
import { MedicalAlerts } from './medical-alerts';
import { injectPatientId } from './patient-route';

@Component({
  selector: 'app-patient-overview-tab',
  imports: [
    RouterLink,
    TranslocoModule,
    AppDatePipe,
    KpiTile,
    MoneyPipe,
    PhonePipe,
    StatusTag,
    MedicalAlerts,
  ],
  templateUrl: './patient-overview-tab.html',
  host: { class: 'block' },
})
export class PatientOverviewTab {
  protected readonly store = inject(PatientsStore);
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);
  private readonly scheduling = inject(SchedulingBackend);
  private readonly billing = inject(BillingBackend);
  private readonly patientId = injectPatientId();

  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly openInvoices = signal<Invoice[]>([]);
  protected readonly tone = appointmentTone;

  protected readonly nextAppointment = computed(() => {
    const now = new Date().toISOString();
    return (
      [...this.appointments()]
        .filter((a) => a.start >= now && a.status !== 'cancelled')
        .sort((a, b) => a.start.localeCompare(b.start))[0] ?? null
    );
  });
  protected readonly lastVisit = computed(
    () => this.appointments().find((a) => a.status === 'done') ?? null,
  );
  protected readonly recent = computed(() => this.appointments().slice(0, 5));
  protected readonly balance = computed(() =>
    this.openInvoices().reduce((s, inv) => s + balanceOf(inv), 0),
  );

  constructor() {
    effect(() => {
      const id = this.patientId();
      if (!id) return;
      if (this.auth.can('appointment.read'))
        this.scheduling.listForPatient(id).subscribe({
          next: (list) => this.appointments.set(list),
          error: () => this.appointments.set([]),
        });
      if (this.auth.can('invoice.read'))
        this.billing.listInvoices({ patientId: id, status: 'open' }).subscribe({
          next: (list) => this.openInvoices.set(list),
          error: () => this.openInvoices.set([]),
        });
    });
  }
}
