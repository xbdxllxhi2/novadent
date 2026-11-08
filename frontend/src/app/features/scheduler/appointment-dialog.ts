import { Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { Textarea } from 'primeng/textarea';
import { AuthStore } from '../../core/auth/auth.store';
import { toIsoDate } from '../../core/i18n/formats';
import { PatientNamesStore } from '../../domain/patients/patient-names.store';
import type { Patient } from '../../domain/patients/patient.model';
import { PatientsBackend } from '../../domain/patients/patients-backend';
import {
  APPOINTMENT_STATUSES,
  Appointment,
  AppointmentStatus,
  Conflict,
} from '../../domain/scheduling/appointment.model';
import { SchedulingStore } from '../../domain/scheduling/scheduling.store';
import {
  addMinutes,
  hmFromMinutes,
  minutesOfDay,
  snapMinutes,
  toIso,
} from '../../domain/scheduling/slots';
import { StaffStore } from '../../domain/staff/staff.store';
import { LocaleStore } from '../../core/i18n/locale.store';
import { PatientName, patientDisplayName } from '../../shared/ui/patient-name';
import { PhonePipe } from '../../shared/ui/phone.pipe';

/** Prefill for a new appointment (slot click, or "book" from a patient page). */
export interface AppointmentDraft {
  start: Date;
  doctorId: string | null;
  chairId: string | null;
  patient: Patient | null;
}

const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180];

@Component({
  selector: 'app-appointment-dialog',
  imports: [
    FormsModule,
    TranslocoModule,
    AutoComplete,
    Button,
    DatePicker,
    Dialog,
    InputText,
    Message,
    Select,
    SelectButton,
    Textarea,
    PatientName,
    PhonePipe,
  ],
  templateUrl: './appointment-dialog.html',
})
export class AppointmentDialog {
  protected readonly store = inject(SchedulingStore);
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);
  private readonly patientsBackend = inject(PatientsBackend);
  private readonly names = inject(PatientNamesStore);
  private readonly locale = inject(LocaleStore);

  readonly visible = model(false);
  /** Existing appointment to edit, or null to create. */
  readonly appointment = input<Appointment | null>(null);
  readonly draft = input<AppointmentDraft | null>(null);
  readonly saved = output<Appointment>();

  protected readonly isEdit = computed(() => this.appointment() !== null);

  // Form state (signals; the form is small enough not to need ReactiveForms)
  protected readonly patient = signal<Patient | null>(null);
  protected readonly doctorId = signal<string | null>(null);
  protected readonly chairId = signal<string | null>(null);
  protected readonly date = signal<Date>(new Date());
  protected readonly startHm = signal('09:00');
  protected readonly duration = signal(30);
  protected readonly reason = signal('');
  protected readonly note = signal('');
  protected readonly status = signal<AppointmentStatus>('scheduled');
  protected readonly submitted = signal(false);

  protected readonly suggestions = signal<Patient[]>([]);
  protected readonly durations = DURATIONS;
  protected readonly statuses = APPOINTMENT_STATUSES;
  protected readonly timeOptions = Array.from({ length: (22 - 7) * 4 }, (_, i) =>
    hmFromMinutes(7 * 60 + i * 15),
  );

  protected readonly startIso = computed(() => toIso(toIsoDate(this.date()), this.startHm()));
  protected readonly endIso = computed(() =>
    addMinutes(new Date(this.startIso()), this.duration()).toISOString(),
  );

  protected readonly conflicts = computed<Conflict[]>(() => {
    const doctorId = this.doctorId();
    const chairId = this.chairId();
    if (!doctorId || !chairId) return [];
    return this.store.conflictsFor({
      id: this.appointment()?.id,
      doctorId,
      chairId,
      start: this.startIso(),
      end: this.endIso(),
    });
  });
  protected readonly blocking = computed(() =>
    this.conflicts().filter((c) => c.kind !== 'outside-hours'),
  );
  protected readonly outsideHours = computed(() =>
    this.conflicts().some((c) => c.kind === 'outside-hours'),
  );

  /** Label shown in the autocomplete input once a patient is picked. */
  protected readonly patientLabel = (p: Patient): string =>
    patientDisplayName(p, this.locale.lang());

  protected readonly valid = computed(
    () =>
      !!this.patient() &&
      !!this.doctorId() &&
      !!this.chairId() &&
      this.reason().trim().length > 0 &&
      this.blocking().length === 0,
  );

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const existing = this.appointment();
      const draft = this.draft();
      this.submitted.set(false);
      if (existing) {
        this.patient.set(this.names.get(existing.patientId) ?? null);
        if (!this.patient())
          this.patientsBackend
            .get(existing.patientId)
            .subscribe({ next: (p) => this.patient.set(p) });
        this.doctorId.set(existing.doctorId);
        this.chairId.set(existing.chairId);
        const start = new Date(existing.start);
        this.date.set(start);
        this.startHm.set(hmFromMinutes(minutesOfDay(start)));
        this.duration.set(
          Math.max(15, Math.round((new Date(existing.end).getTime() - start.getTime()) / 60_000)),
        );
        this.reason.set(existing.reason);
        this.note.set(existing.note ?? '');
        this.status.set(existing.status);
      } else {
        const start = draft?.start ?? new Date();
        const doctorId =
          draft?.doctorId ?? this.auth.doctorId() ?? this.staff.activeDoctors()[0]?.id ?? null;
        this.patient.set(draft?.patient ?? null);
        this.doctorId.set(doctorId);
        this.chairId.set(draft?.chairId ?? this.defaultChairFor(doctorId));
        this.date.set(start);
        this.startHm.set(hmFromMinutes(snapMinutes(minutesOfDay(start))));
        this.duration.set(30);
        this.reason.set('');
        this.note.set('');
        this.status.set('scheduled');
      }
    });
  }

  protected search(event: AutoCompleteCompleteEvent): void {
    this.patientsBackend.search(event.query, { limit: 8 }).subscribe({
      next: (list) => this.suggestions.set(list),
      error: () => this.suggestions.set([]),
    });
  }

  protected conflictKey(c: Conflict): string {
    switch (c.kind) {
      case 'doctor':
        return 'scheduler.conflictDoctor';
      case 'chair':
        return 'scheduler.conflictChair';
      case 'blocked':
        return 'scheduler.conflictBlocked';
      default:
        return 'scheduler.outsideHours';
    }
  }

  protected submit(): void {
    this.submitted.set(true);
    const patient = this.patient();
    const doctorId = this.doctorId();
    const chairId = this.chairId();
    if (!this.valid() || !patient || !doctorId || !chairId) return;
    this.names.put(patient);
    const payload = {
      patientId: patient.id,
      doctorId,
      chairId,
      start: this.startIso(),
      end: this.endIso(),
      reason: this.reason().trim(),
      note: this.note().trim() || null,
    };
    const done = (a: Appointment) => {
      this.visible.set(false);
      this.saved.emit(a);
    };
    const existing = this.appointment();
    if (existing) {
      const patch = { ...payload };
      this.store.update(existing.id, patch, (a) => {
        if (this.status() !== existing.status) this.store.setStatus(existing.id, this.status());
        done(a);
      });
    } else {
      this.store.create({ ...payload, status: this.status() }, done);
    }
  }

  /** Doctors usually work on "their" chair: same index in the chair list, else the first chair. */
  private defaultChairFor(doctorId: string | null): string | null {
    const chairs = this.staff.activeChairs();
    if (chairs.length === 0) return null;
    const idx = this.staff.activeDoctors().findIndex((d) => d.id === doctorId);
    return (chairs[idx] ?? chairs[0]).id;
  }
}
