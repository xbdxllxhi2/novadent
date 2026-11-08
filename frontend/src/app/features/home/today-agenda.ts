import { Component, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { PatientNamesStore } from '../../domain/patients/patient-names.store';
import type { Appointment } from '../../domain/scheduling/appointment.model';
import { SchedulingStore } from '../../domain/scheduling/scheduling.store';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { LoadingBlock } from '../../shared/ui/loading-block';
import { PatientName } from '../../shared/ui/patient-name';
import { StatusTag } from '../../shared/ui/status-tag';
import { appointmentTone } from '../scheduler/appointment-tone';

interface DoctorAgenda {
  doctorId: string;
  appointments: Appointment[];
}

/** Today's appointments grouped by doctor. */
@Component({
  selector: 'app-today-agenda',
  imports: [
    TranslocoModule,
    RouterLink,
    AppDatePipe,
    EmptyState,
    LoadingBlock,
    PatientName,
    StatusTag,
  ],
  templateUrl: './today-agenda.html',
  host: { class: 'block' },
})
export class TodayAgenda {
  protected readonly scheduling = inject(SchedulingStore);
  protected readonly staff = inject(StaffStore);
  protected readonly patients = inject(PatientNamesStore);
  protected readonly tone = appointmentTone;

  protected readonly groups = computed<DoctorAgenda[]>(() => {
    const byDoctor = new Map<string, Appointment[]>();
    for (const a of this.scheduling.appointments()) {
      if (a.status === 'cancelled') continue;
      const list = byDoctor.get(a.doctorId) ?? [];
      list.push(a);
      byDoctor.set(a.doctorId, list);
    }
    return this.staff
      .activeDoctors()
      .map((d) => ({
        doctorId: d.id,
        appointments: (byDoctor.get(d.id) ?? []).sort((x, y) => x.start.localeCompare(y.start)),
      }))
      .filter((g) => g.appointments.length > 0);
  });

  constructor() {
    effect(() => this.patients.ensure(this.scheduling.appointments().map((a) => a.patientId)));
  }
}
