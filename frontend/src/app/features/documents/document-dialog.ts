import { Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { SelectButton } from 'primeng/selectbutton';
import { Textarea } from 'primeng/textarea';
import { AuthStore } from '../../core/auth/auth.store';
import { formatDate, toIsoDate } from '../../core/i18n/formats';
import { LocaleStore } from '../../core/i18n/locale.store';
import type {
  CertificateType,
  ClinicalDocument,
  DocumentKind,
} from '../../domain/clinical/document.model';
import { DocumentsStore } from '../../domain/clinical/documents.store';
import type { Patient } from '../../domain/patients/patient.model';
import { StaffStore } from '../../domain/staff/staff.store';
import { patientDisplayName } from '../../shared/ui/patient-name';

/**
 * Free-text prescription or certificate. The doctor writes what they want; certificates start
 * from an editable template filled with the patient, doctor and dates.
 */
@Component({
  selector: 'app-document-dialog',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    DatePicker,
    Dialog,
    InputNumber,
    SelectButton,
    Textarea,
  ],
  templateUrl: './document-dialog.html',
})
export class DocumentDialog {
  protected readonly store = inject(DocumentsStore);
  private readonly auth = inject(AuthStore);
  private readonly staff = inject(StaffStore);
  private readonly locale = inject(LocaleStore);
  private readonly transloco = inject(TranslocoService);

  readonly visible = model(false);
  readonly patient = input.required<Patient>();
  readonly kind = input<DocumentKind>('prescription');
  readonly saved = output<ClinicalDocument>();

  protected readonly certificateType = signal<CertificateType>('sick-leave');
  protected readonly days = signal(1);
  protected readonly fromDate = signal<Date>(new Date());
  protected readonly body = signal('');
  protected readonly submitted = signal(false);

  protected readonly certificateTypes: CertificateType[] = ['sick-leave', 'attendance'];
  protected readonly valid = computed(() => this.body().trim().length > 0);
  protected readonly isCertificate = computed(() => this.kind() === 'certificate');

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      this.submitted.set(false);
      this.certificateType.set('sick-leave');
      this.days.set(1);
      this.fromDate.set(new Date());
      this.body.set(
        this.kind() === 'certificate' ? this.template('sick-leave', 1, new Date()) : '',
      );
    });
  }

  /** Re-fills the certificate text when its parameters change, keeping any manual edits otherwise. */
  protected regenerate(
    type = this.certificateType(),
    days = this.days(),
    from = this.fromDate(),
  ): void {
    this.certificateType.set(type);
    this.days.set(days);
    this.fromDate.set(from);
    this.body.set(this.template(type, days, from));
  }

  protected submit(): void {
    this.submitted.set(true);
    if (!this.valid()) return;
    const certificate = this.isCertificate();
    this.store.create(
      {
        patientId: this.patient().id,
        kind: this.kind(),
        certificateType: certificate ? this.certificateType() : null,
        days: certificate && this.certificateType() === 'sick-leave' ? this.days() : null,
        fromDate: certificate ? toIsoDate(this.fromDate()) : null,
        body: this.body(),
      },
      (doc) => {
        this.visible.set(false);
        this.saved.emit(doc);
      },
    );
  }

  private template(type: CertificateType, days: number, from: Date): string {
    const doctor =
      this.staff.doctor(this.auth.doctorId())?.nameLatin ?? this.auth.user()?.displayName ?? '';
    const params = {
      doctor,
      patient: patientDisplayName(this.patient(), this.locale.lang()),
      days,
      date: formatDate(from, this.locale.locale(), 'long'),
      today: formatDate(new Date(), this.locale.locale(), 'long'),
    };
    return this.transloco.translate(
      type === 'sick-leave' ? 'documents.templateSickLeave' : 'documents.templateAttendance',
      params,
    );
  }
}
