import { NgTemplateOutlet } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AuthStore } from '../../core/auth/auth.store';
import { PatientNamesStore } from '../../domain/patients/patient-names.store';
import type { Appointment } from '../../domain/scheduling/appointment.model';
import { MessagesStore } from '../../domain/scheduling/messages.store';
import { SchedulingStore } from '../../domain/scheduling/scheduling.store';
import type { Doctor } from '../../domain/staff/staff.model';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { PatientName } from '../../shared/ui/patient-name';
import { MedicalAlerts } from '../patients/medical-alerts';
import { TaskDialog } from '../tasks/task-dialog';
import { MessageThreadDialog } from './message-thread-dialog';

interface DoctorQueue {
  doctor: Doctor;
  expected: Appointment[];
  waiting: Appointment[];
  inChair: Appointment[];
}

/**
 * Today's flow per doctor: expected (scheduled/confirmed), waiting (arrived), in chair.
 * Reception marks arrivals; the doctor takes the next patient and opens the file. Both sides
 * leave short messages on an appointment; the doctor can send a request to the reception.
 */
@Component({
  selector: 'app-waiting-room-page',
  imports: [
    NgTemplateOutlet,
    FormsModule,
    TranslocoModule,
    Button,
    ToggleSwitch,
    AppDatePipe,
    EmptyState,
    PageHeader,
    PatientName,
    MedicalAlerts,
    TaskDialog,
    MessageThreadDialog,
  ],
  templateUrl: './waiting-room-page.html',
  host: { class: 'block' },
})
export class WaitingRoomPage implements OnInit, OnDestroy {
  protected readonly scheduling = inject(SchedulingStore);
  protected readonly messages = inject(MessagesStore);
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);
  protected readonly patients = inject(PatientNamesStore);
  private readonly router = inject(Router);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  /** A doctor sees their own queue by default and can widen to everyone. */
  protected readonly onlyMine = signal(this.auth.doctorId() !== null);
  protected readonly canAct = computed(() => this.auth.can('appointment.write'));
  protected readonly canRequest = computed(() => this.auth.can('task.write'));
  protected readonly isDoctor = computed(() => this.auth.doctorId() !== null);

  protected readonly threadFor = signal<Appointment | null>(null);
  protected readonly threadOpen = signal(false);
  protected readonly requestFor = signal<Appointment | null>(null);
  protected readonly requestOpen = signal(false);

  protected readonly queues = computed<DoctorQueue[]>(() => {
    const mine = this.onlyMine() ? this.auth.doctorId() : null;
    const byStart = (a: Appointment, b: Appointment) => a.start.localeCompare(b.start);
    return this.staff
      .activeDoctors()
      .filter((d) => !mine || d.id === mine)
      .map((doctor) => {
        const own = this.scheduling.appointments().filter((a) => a.doctorId === doctor.id);
        return {
          doctor,
          expected: own
            .filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
            .sort(byStart),
          waiting: own.filter((a) => a.status === 'arrived').sort(byStart),
          inChair: own.filter((a) => a.status === 'in-chair').sort(byStart),
        };
      });
  });

  protected readonly totalWaiting = computed(() =>
    this.queues().reduce((s, q) => s + q.waiting.length, 0),
  );

  constructor() {
    effect(() => {
      const appointments = this.scheduling.appointments();
      this.patients.ensure(appointments.map((a) => a.patientId));
      this.messages.load(appointments.filter((a) => a.status !== 'cancelled').map((a) => a.id));
    });
  }

  ngOnInit(): void {
    this.scheduling.view.set('day');
    this.scheduling.goTo(new Date());
    // Reception and doctors look at this screen for long stretches: refresh quietly.
    this.refreshTimer = setInterval(() => {
      this.scheduling.load();
      this.messages.load(
        this.scheduling.appointments().map((a) => a.id),
        true,
      );
    }, 60_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  protected messageCount(a: Appointment): number {
    return this.messages.for(a.id).length;
  }

  protected lastMessage(a: Appointment): string | null {
    const list = this.messages.for(a.id);
    return list.length ? list[list.length - 1].body : null;
  }

  protected openThread(a: Appointment): void {
    this.threadFor.set(a);
    this.threadOpen.set(true);
  }

  protected openRequest(a: Appointment): void {
    this.requestFor.set(a);
    this.requestOpen.set(true);
  }

  protected markArrived(a: Appointment): void {
    this.scheduling.setStatus(a.id, 'arrived');
  }

  protected takeCharge(a: Appointment): void {
    this.scheduling.setStatus(a.id, 'in-chair');
    void this.router.navigate(['/patients', a.patientId]);
  }

  protected finish(a: Appointment): void {
    this.scheduling.setStatus(a.id, 'done');
  }

  protected noShow(a: Appointment): void {
    this.scheduling.setStatus(a.id, 'no-show');
  }

  protected openPatient(a: Appointment): void {
    void this.router.navigate(['/patients', a.patientId]);
  }
}
