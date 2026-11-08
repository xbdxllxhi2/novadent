import { Component, effect, inject, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { TableModule } from 'primeng/table';
import type { Appointment } from '../../domain/scheduling/appointment.model';
import { SchedulingBackend } from '../../domain/scheduling/scheduling-backend';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { StatusTag } from '../../shared/ui/status-tag';
import { appointmentTone } from '../scheduler/appointment-tone';
import { injectPatientId } from './patient-route';

@Component({
  selector: 'app-patient-appointments-tab',
  imports: [TranslocoModule, TableModule, AppDatePipe, EmptyState, StatusTag],
  templateUrl: './patient-appointments-tab.html',
  host: { class: 'block' },
})
export class PatientAppointmentsTab {
  protected readonly staff = inject(StaffStore);
  private readonly scheduling = inject(SchedulingBackend);
  private readonly patientId = injectPatientId();

  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly loading = signal(true);
  protected readonly tone = appointmentTone;

  constructor() {
    effect(() => {
      const id = this.patientId();
      if (!id) return;
      this.loading.set(true);
      this.scheduling.listForPatient(id).subscribe({
        next: (list) => {
          this.appointments.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }
}
