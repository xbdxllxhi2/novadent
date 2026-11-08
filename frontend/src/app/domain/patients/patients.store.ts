import { Injectable, inject, signal } from '@angular/core';
import { NotifyService } from '../../core/notify/notify.service';
import type { ClinicalNote, Patient, PatientInput } from './patient.model';
import { PatientsBackend } from './patients-backend';

const SEARCH_DEBOUNCE_MS = 250;

@Injectable({ providedIn: 'root' })
export class PatientsStore {
  private readonly backend = inject(PatientsBackend);
  private readonly notify = inject(NotifyService);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private searchSeq = 0;

  // List / search
  readonly query = signal('');
  readonly includeArchived = signal(false);
  readonly results = signal<Patient[]>([]);
  readonly searching = signal(false);

  // Detail
  readonly current = signal<Patient | null>(null);
  readonly currentLoading = signal(false);
  readonly notes = signal<ClinicalNote[]>([]);
  readonly saving = signal(false);

  search(query = this.query(), immediate = false): void {
    this.query.set(query);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const run = () => {
      const seq = ++this.searchSeq;
      this.searching.set(true);
      this.backend.search(query, { includeArchived: this.includeArchived() }).subscribe({
        next: (list) => {
          if (seq !== this.searchSeq) return;
          this.results.set(list);
          this.searching.set(false);
        },
        error: (e) => {
          if (seq !== this.searchSeq) return;
          this.searching.set(false);
          this.notify.failure(e);
        },
      });
    };
    if (immediate) run();
    else this.searchTimer = setTimeout(run, SEARCH_DEBOUNCE_MS);
  }

  setIncludeArchived(value: boolean): void {
    this.includeArchived.set(value);
    this.search(this.query(), true);
  }

  load(id: string): void {
    if (this.current()?.id !== id) this.current.set(null);
    this.currentLoading.set(true);
    this.backend.get(id).subscribe({
      next: (p) => {
        this.current.set(p);
        this.currentLoading.set(false);
      },
      error: (e) => {
        this.currentLoading.set(false);
        this.notify.failure(e);
      },
    });
  }

  create(input: PatientInput, done?: (patient: Patient) => void): void {
    this.saving.set(true);
    this.backend.create(input).subscribe({
      next: (p) => {
        this.saving.set(false);
        this.results.update((list) => [p, ...list]);
        this.notify.success('notify.patientCreated', {
          name: `${p.firstNameLatin} ${p.lastNameLatin}`.trim(),
        });
        done?.(p);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  update(id: string, patch: Partial<PatientInput>, done?: (patient: Patient) => void): void {
    this.saving.set(true);
    this.backend.update(id, patch).subscribe({
      next: (p) => {
        this.saving.set(false);
        if (this.current()?.id === id) this.current.set(p);
        this.results.update((list) => list.map((x) => (x.id === id ? p : x)));
        this.notify.success('notify.saved');
        done?.(p);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  setArchived(id: string, archived: boolean): void {
    this.backend.setArchived(id, archived).subscribe({
      next: (p) => {
        if (this.current()?.id === id) this.current.set(p);
        this.results.update((list) =>
          archived && !this.includeArchived()
            ? list.filter((x) => x.id !== id)
            : list.map((x) => (x.id === id ? p : x)),
        );
        this.notify.success(archived ? 'notify.patientArchived' : 'notify.patientRestored');
      },
      error: (e) => this.notify.failure(e),
    });
  }

  loadNotes(patientId: string): void {
    this.backend
      .listNotes(patientId)
      .subscribe({ next: (n) => this.notes.set(n), error: (e) => this.notify.failure(e) });
  }

  addNote(patientId: string, body: string, done?: () => void): void {
    this.saving.set(true);
    this.backend.addNote(patientId, body).subscribe({
      next: (n) => {
        this.saving.set(false);
        this.notes.update((list) => [n, ...list]);
        this.notify.success('notify.noteSaved');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  updateNote(noteId: string, body: string, done?: () => void): void {
    this.saving.set(true);
    this.backend.updateNote(noteId, body).subscribe({
      next: (n) => {
        this.saving.set(false);
        this.notes.update((list) => list.map((x) => (x.id === noteId ? n : x)));
        this.notify.success('notify.noteSaved');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }
}
