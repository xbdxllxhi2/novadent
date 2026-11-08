import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { AuthStore } from '../../core/auth/auth.store';
import type { DocumentKind } from '../../domain/clinical/document.model';
import { DocumentsStore } from '../../domain/clinical/documents.store';
import { PatientsStore } from '../../domain/patients/patients.store';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { StatusTag } from '../../shared/ui/status-tag';
import { DocumentDialog } from '../documents/document-dialog';
import { injectPatientId } from './patient-route';

@Component({
  selector: 'app-patient-documents-tab',
  imports: [
    RouterLink,
    TranslocoModule,
    Button,
    AppDatePipe,
    EmptyState,
    StatusTag,
    DocumentDialog,
  ],
  templateUrl: './patient-documents-tab.html',
  host: { class: 'block' },
})
export class PatientDocumentsTab {
  protected readonly store = inject(DocumentsStore);
  protected readonly patients = inject(PatientsStore);
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);
  private readonly patientId = injectPatientId();

  protected readonly dialogOpen = signal(false);
  protected readonly dialogKind = signal<DocumentKind>('prescription');
  /** Writing needs the permission AND a doctor identity: documents are signed by a practitioner. */
  protected readonly canWrite = computed(
    () => this.auth.can('document.write') && this.auth.doctorId() !== null,
  );

  constructor() {
    effect(() => {
      const id = this.patientId();
      if (id) this.store.load(id);
    });
  }

  protected open(kind: DocumentKind): void {
    this.dialogKind.set(kind);
    this.dialogOpen.set(true);
  }

  protected excerpt(body: string): string {
    const line =
      body
        .split('\n')
        .map((l) => l.trim())
        .find(Boolean) ?? '';
    return line.length > 90 ? line.slice(0, 90) + '...' : line;
  }
}
