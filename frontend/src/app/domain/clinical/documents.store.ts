import { Injectable, inject, signal } from '@angular/core';
import { NotifyService } from '../../core/notify/notify.service';
import { ClinicalBackend } from './clinical-backend';
import type { ClinicalDocument, DocumentInput } from './document.model';

/** Prescriptions and certificates of the patient currently open. */
@Injectable({ providedIn: 'root' })
export class DocumentsStore {
  private readonly backend = inject(ClinicalBackend);
  private readonly notify = inject(NotifyService);

  readonly patientId = signal<string | null>(null);
  readonly documents = signal<ClinicalDocument[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  load(patientId: string): void {
    if (this.patientId() !== patientId) this.documents.set([]);
    this.patientId.set(patientId);
    this.loading.set(true);
    this.backend.listDocuments(patientId).subscribe({
      next: (list) => {
        if (this.patientId() !== patientId) return;
        this.documents.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.failure(e);
      },
    });
  }

  create(input: DocumentInput, done?: (doc: ClinicalDocument) => void): void {
    this.saving.set(true);
    this.backend.createDocument(input).subscribe({
      next: (doc) => {
        this.saving.set(false);
        this.documents.update((list) => [doc, ...list]);
        this.notify.success(
          doc.kind === 'prescription' ? 'notify.prescriptionCreated' : 'notify.certificateCreated',
        );
        done?.(doc);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }
}
