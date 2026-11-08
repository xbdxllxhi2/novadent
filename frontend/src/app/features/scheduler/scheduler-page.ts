import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { AuthStore } from '../../core/auth/auth.store';
import { HasPermission } from '../../core/auth/has-permission.directive';
import { formatDate } from '../../core/i18n/formats';
import { LocaleStore } from '../../core/i18n/locale.store';
import { PatientNamesStore } from '../../domain/patients/patient-names.store';
import { PatientsBackend } from '../../domain/patients/patients-backend';
import type { Appointment, AppointmentStatus } from '../../domain/scheduling/appointment.model';
import {
  SchedulerMode,
  SchedulerView,
  SchedulingStore,
} from '../../domain/scheduling/scheduling.store';
import { gridBounds, startOfDay, weekDays } from '../../domain/scheduling/slots';
import { ClinicSettingsStore } from '../../domain/staff/clinic-settings.store';
import type { Doctor } from '../../domain/staff/staff.model';
import { StaffStore } from '../../domain/staff/staff.store';
import { PageHeader } from '../../shared/ui/page-header';
import { AppointmentDialog, AppointmentDraft } from './appointment-dialog';
import { BlockedTimeDialog } from './blocked-time-dialog';
import { SchedulerGrid } from './scheduler-grid';
import type { MoveRequest, ResizeRequest, SchedulerColumn, SlotClick } from './scheduler-model';

@Component({
  selector: 'app-scheduler-page',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    DatePicker,
    Select,
    SelectButton,
    HasPermission,
    PageHeader,
    SchedulerGrid,
    AppointmentDialog,
    BlockedTimeDialog,
  ],
  templateUrl: './scheduler-page.html',
  host: { class: 'block' },
})
export class SchedulerPage implements OnInit {
  protected readonly store = inject(SchedulingStore);
  protected readonly staff = inject(StaffStore);
  protected readonly settings = inject(ClinicSettingsStore);
  protected readonly auth = inject(AuthStore);
  private readonly locale = inject(LocaleStore);
  private readonly names = inject(PatientNamesStore);
  private readonly patientsBackend = inject(PatientsBackend);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);

  /** Query param from a patient page's "book appointment" button. */
  readonly patientId = input<string | undefined>(undefined);

  protected readonly dialogOpen = signal(false);
  protected readonly blockOpen = signal(false);
  protected readonly editing = signal<Appointment | null>(null);
  protected readonly draft = signal<AppointmentDraft | null>(null);

  protected readonly viewOptions: { value: SchedulerView; labelKey: string }[] = [
    { value: 'day', labelKey: 'scheduler.day' },
    { value: 'week', labelKey: 'scheduler.week' },
  ];
  protected readonly modeOptions: { value: SchedulerMode; labelKey: string }[] = [
    { value: 'doctor', labelKey: 'scheduler.byDoctor' },
    { value: 'chair', labelKey: 'scheduler.byChair' },
  ];

  protected readonly canEdit = computed(() => this.auth.can('appointment.write'));
  protected readonly canCancel = computed(() => this.auth.can('appointment.cancel'));

  protected readonly title = computed(() => {
    const anchor = this.store.anchorDate();
    if (this.store.view() === 'day') return formatDate(anchor, this.locale.locale(), 'weekdayLong');
    const days = weekDays(anchor);
    return `${formatDate(days[0], this.locale.locale(), 'medium')}  -  ${formatDate(days[6], this.locale.locale(), 'medium')}`;
  });

  protected readonly days = computed(() =>
    this.store.view() === 'day' ? [this.store.anchorDate()] : weekDays(this.store.anchorDate()),
  );
  protected readonly bounds = computed(() =>
    gridBounds(this.settings.hours() ?? emptyHours(), this.days()),
  );

  protected readonly weekDoctor = computed<Doctor | null>(() => {
    const id = this.store.weekDoctorId() ?? this.auth.doctorId();
    const doctors = this.staff.activeDoctors();
    return doctors.find((d) => d.id === id) ?? (doctors.length > 0 ? doctors[0] : null);
  });

  protected readonly columns = computed<SchedulerColumn[]>(() => {
    const view = this.store.view();
    const day = this.store.anchorDate();
    if (view === 'week') {
      const doctor = this.weekDoctor();
      return this.days().map((d) => ({
        key: `${doctor?.id ?? 'none'}|${d.toDateString()}`,
        day: d,
        doctorId: doctor?.id ?? null,
        chairId: null,
        title: formatDate(d, this.locale.locale(), 'weekdayShort'),
        subtitle: null,
        color: doctor?.color ?? null,
      }));
    }
    if (this.store.mode() === 'chair') {
      return this.staff.activeChairs().map((c) => ({
        key: `chair|${c.id}`,
        day,
        doctorId: null,
        chairId: c.id,
        title: c.name,
        subtitle: null,
        color: null,
      }));
    }
    const hidden = this.store.hiddenDoctorIds();
    return this.staff
      .activeDoctors()
      .filter((d) => !hidden.has(d.id))
      .map((d) => ({
        key: `doctor|${d.id}`,
        day,
        doctorId: d.id,
        chairId: null,
        title: d.nameLatin,
        subtitle: d.specialty ?? null,
        color: d.color,
      }));
  });

  constructor() {
    effect(() => this.names.ensure(this.store.appointments().map((a) => a.patientId)));
    // "Book appointment" from a patient page.
    effect(() => {
      const id = this.patientId();
      if (!id || !this.canEdit()) return;
      this.patientsBackend.get(id).subscribe({
        next: (patient) => {
          const start = new Date();
          start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
          this.editing.set(null);
          this.draft.set({ start, doctorId: patient.primaryDoctorId, chairId: null, patient });
          this.dialogOpen.set(true);
          void this.router.navigate([], { queryParams: {}, replaceUrl: true });
        },
      });
    });
  }

  ngOnInit(): void {
    this.store.load();
  }

  protected setView(view: SchedulerView): void {
    this.store.setView(view);
  }

  protected onDatePicked(date: Date | null): void {
    if (date) this.store.goTo(date);
  }

  protected newAppointment(): void {
    this.editing.set(null);
    const start = new Date(this.store.anchorDate());
    const now = new Date();
    if (startOfDay(now).getTime() === start.getTime())
      start.setHours(now.getHours(), Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
    else start.setHours(9, 0, 0, 0);
    this.draft.set({ start, doctorId: null, chairId: null, patient: null });
    this.dialogOpen.set(true);
  }

  protected onSlotClick(click: SlotClick): void {
    if (!this.canEdit()) return;
    this.editing.set(null);
    this.draft.set({
      start: click.start,
      doctorId: click.column.doctorId,
      chairId: click.column.chairId,
      patient: null,
    });
    this.dialogOpen.set(true);
  }

  protected onCardClick(appointment: Appointment): void {
    if (!this.canEdit()) return;
    this.editing.set(appointment);
    this.draft.set(null);
    this.dialogOpen.set(true);
  }

  protected onMove(req: MoveRequest): void {
    const patch: Partial<Appointment> = { start: req.start, end: req.end };
    if (req.column.doctorId) patch.doctorId = req.column.doctorId;
    if (req.column.chairId) patch.chairId = req.column.chairId;
    this.store.update(req.id, patch);
  }

  protected onResize(req: ResizeRequest): void {
    this.store.update(req.id, { end: req.end });
  }

  protected onStatusChange(change: { id: string; status: AppointmentStatus }): void {
    if (change.status === 'cancelled') {
      this.confirm.confirm({
        header: this.transloco.translate('scheduler.cancelAppointment'),
        message: this.transloco.translate('scheduler.cancelConfirm'),
        icon: 'pi pi-exclamation-triangle',
        accept: () => this.store.setStatus(change.id, 'cancelled'),
      });
      return;
    }
    this.store.setStatus(change.id, change.status);
  }

  protected openPatient(patientId: string): void {
    void this.router.navigate(['/patients', patientId]);
  }
}

function emptyHours() {
  return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
}
