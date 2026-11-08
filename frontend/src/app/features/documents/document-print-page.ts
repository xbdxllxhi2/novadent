import { Component, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { ageFromBirthDate } from '../../core/i18n/formats';
import { ClinicalBackend } from '../../domain/clinical/clinical-backend';
import type { ClinicalDocument } from '../../domain/clinical/document.model';
import type { Patient } from '../../domain/patients/patient.model';
import { PatientsBackend } from '../../domain/patients/patients-backend';
import { StaffBackend } from '../../domain/staff/staff-backend';
import type { ClinicSettings } from '../../domain/staff/staff.model';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { PhonePipe } from '../../shared/ui/phone.pipe';

/** Printable prescription or certificate, outside the shell (same mechanism as the invoice). */
@Component({
  selector: 'app-document-print-page',
  imports: [TranslocoModule, Button, AppDatePipe, PhonePipe],
  templateUrl: './document-print-page.html',
  host: { class: 'block min-h-full bg-surface-950 print:bg-white' },
})
export class DocumentPrintPage {
  private readonly clinical = inject(ClinicalBackend);
  private readonly patients = inject(PatientsBackend);
  private readonly staffBackend = inject(StaffBackend);
  protected readonly staff = inject(StaffStore);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly document = signal<ClinicalDocument | null>(null);
  protected readonly patient = signal<Patient | null>(null);
  protected readonly clinic = signal<ClinicSettings | null>(null);
  protected readonly age = ageFromBirthDate;

  constructor() {
    this.staffBackend.getSettings().subscribe({ next: (s) => this.clinic.set(s) });
    if (this.staff.doctors().length === 0) this.staff.loadCore();
    effect(() => {
      this.clinical.getDocument(this.id()).subscribe({
        next: (doc) => {
          this.document.set(doc);
          this.patients.get(doc.patientId).subscribe({ next: (p) => this.patient.set(p) });
        },
      });
    });
  }

  protected print(): void {
    window.print();
  }

  protected back(): void {
    const doc = this.document();
    void this.router.navigate(doc ? ['/patients', doc.patientId, 'documents'] : ['/']);
  }
}
