import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import { AuthStore } from '../../core/auth/auth.store';
import { canEditNote } from '../../core/auth/clinical-policy';
import type { ClinicalNote } from '../../domain/patients/patient.model';
import { PatientsStore } from '../../domain/patients/patients.store';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { injectPatientId } from './patient-route';

@Component({
  selector: 'app-patient-notes-tab',
  imports: [FormsModule, TranslocoModule, Button, Textarea, AppDatePipe, EmptyState],
  templateUrl: './patient-notes-tab.html',
  host: { class: 'block' },
})
export class PatientNotesTab {
  protected readonly store = inject(PatientsStore);
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);
  private readonly patientId = injectPatientId();

  protected readonly draft = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly editDraft = signal('');
  protected readonly canWrite = computed(
    () => this.auth.can('note.write') && this.auth.doctorId() !== null,
  );

  constructor() {
    effect(() => {
      const id = this.patientId();
      if (id) this.store.loadNotes(id);
    });
  }

  protected canEdit(note: ClinicalNote): boolean {
    return canEditNote(this.auth.session(), note);
  }

  protected add(): void {
    const body = this.draft().trim();
    if (!body) return;
    this.store.addNote(this.patientId(), body, () => this.draft.set(''));
  }

  protected startEdit(note: ClinicalNote): void {
    this.editingId.set(note.id);
    this.editDraft.set(note.body);
  }

  protected saveEdit(): void {
    const id = this.editingId();
    if (!id) return;
    this.store.updateNote(id, this.editDraft(), () => this.editingId.set(null));
  }
}
