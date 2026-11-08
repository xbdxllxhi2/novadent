import { Component, computed, effect, inject, input, model, output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputGroup } from 'primeng/inputgroup';
import { InputGroupAddon } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { Textarea } from 'primeng/textarea';
import { normalizePhone, parseDateLike, toIsoDate } from '../../core/i18n/formats';
import type {
  AlertKind,
  AlertSeverity,
  MedicalAlert,
  Patient,
  PatientInput,
} from '../../domain/patients/patient.model';
import { PatientsStore } from '../../domain/patients/patients.store';
import { StaffStore } from '../../domain/staff/staff.store';
import { newId } from '../../backends/mock/ids';

interface AlertForm {
  id: string;
  kind: AlertKind;
  label: string;
  severity: AlertSeverity;
}

/** Create or edit a patient. Pass `patient` null for creation. */
@Component({
  selector: 'app-patient-form-dialog',
  imports: [
    ReactiveFormsModule,
    TranslocoModule,
    Button,
    DatePicker,
    Dialog,
    InputGroup,
    InputGroupAddon,
    InputText,
    Select,
    SelectButton,
    Textarea,
  ],
  templateUrl: './patient-form-dialog.html',
})
export class PatientFormDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly store = inject(PatientsStore);
  protected readonly staff = inject(StaffStore);

  readonly visible = model(false);
  readonly patient = input<Patient | null>(null);
  readonly saved = output<Patient>();

  protected readonly isEdit = computed(() => this.patient() !== null);
  protected readonly genderOptions = [
    { value: 'M', labelKey: 'patients.male' },
    { value: 'F', labelKey: 'patients.female' },
  ];
  protected readonly alertKinds: AlertKind[] = ['allergy', 'condition', 'medication'];
  protected readonly alertSeverities: AlertSeverity[] = ['info', 'warn', 'danger'];
  protected readonly maxDate = new Date();

  protected readonly form = this.fb.nonNullable.group({
    firstNameLatin: [''],
    lastNameLatin: [''],
    firstNameArabic: [''],
    lastNameArabic: [''],
    gender: ['M' as 'M' | 'F'],
    birthDate: [null as Date | null],
    phone: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    phone2: [''],
    address: [''],
    primaryDoctorId: [null as string | null],
    notes: [''],
    alerts: this.fb.array<FormGroup>([]),
  });

  constructor() {
    effect(() => {
      if (this.visible()) this.reset(this.patient());
    });
  }

  protected get alerts(): FormArray<FormGroup> {
    return this.form.controls.alerts;
  }

  protected addAlert(alert?: MedicalAlert): void {
    this.alerts.push(
      this.fb.nonNullable.group({
        id: [alert?.id ?? newId()],
        kind: [alert?.kind ?? ('allergy' as AlertKind)],
        label: [alert?.label ?? '', Validators.required],
        severity: [alert?.severity ?? ('warn' as AlertSeverity)],
      }),
    );
  }

  protected removeAlert(index: number): void {
    this.alerts.removeAt(index);
  }

  protected nameMissing(): boolean {
    const v = this.form.getRawValue();
    return (
      !(v.firstNameLatin.trim() || v.firstNameArabic.trim()) ||
      !(v.lastNameLatin.trim() || v.lastNameArabic.trim())
    );
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.nameMissing()) return;
    const v = this.form.getRawValue();
    const phone = normalizePhone(v.phone);
    if (!phone) return;
    const input: PatientInput = {
      firstNameLatin: v.firstNameLatin.trim(),
      lastNameLatin: v.lastNameLatin.trim(),
      firstNameArabic: v.firstNameArabic.trim(),
      lastNameArabic: v.lastNameArabic.trim(),
      gender: v.gender,
      birthDate: v.birthDate ? toIsoDate(v.birthDate) : null,
      phone,
      phone2: v.phone2.trim() ? normalizePhone(v.phone2) : null,
      address: v.address.trim() || null,
      primaryDoctorId: v.primaryDoctorId,
      alerts: (v.alerts as AlertForm[]).map((a) => ({
        id: a.id,
        kind: a.kind,
        label: a.label.trim(),
        severity: a.severity,
      })),
      notes: v.notes.trim(),
    };
    const existing = this.patient();
    const done = (p: Patient) => {
      this.visible.set(false);
      this.saved.emit(p);
    };
    if (existing) this.store.update(existing.id, input, done);
    else this.store.create(input, done);
  }

  private reset(patient: Patient | null): void {
    this.alerts.clear();
    this.form.reset({
      firstNameLatin: patient?.firstNameLatin ?? '',
      lastNameLatin: patient?.lastNameLatin ?? '',
      firstNameArabic: patient?.firstNameArabic ?? '',
      lastNameArabic: patient?.lastNameArabic ?? '',
      gender: patient?.gender ?? 'M',
      birthDate: patient?.birthDate ? parseDateLike(patient.birthDate) : null,
      phone: patient ? patient.phone.replace(/^\+222/, '') : '',
      phone2: patient?.phone2 ? patient.phone2.replace(/^\+222/, '') : '',
      address: patient?.address ?? '',
      primaryDoctorId: patient?.primaryDoctorId ?? null,
      notes: patient?.notes ?? '',
    });
    for (const a of patient?.alerts ?? []) this.addAlert(a);
  }
}
