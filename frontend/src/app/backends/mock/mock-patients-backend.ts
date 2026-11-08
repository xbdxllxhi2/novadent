import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { canEditNote } from '../../core/auth/clinical-policy';
import { BackendError } from '../../core/backend-error';
import { digitsOf, matchesAllTokens } from '../../core/text/normalize';
import type {
  ClinicalNote,
  Patient,
  PatientInput,
  PatientSearchOptions,
} from '../../domain/patients/patient.model';
import { PatientsBackend } from '../../domain/patients/patients-backend';
import { newId } from './ids';
import { respond, respondAsync } from './latency';
import { MockFileStore } from './mock-files';
import {
  Attachment,
  AttachmentInput,
  MAX_ATTACHMENT_BYTES,
} from '../../domain/patients/attachment.model';
import { MockAuthBackend } from './mock-auth-backend';
import { MockDb } from './mock-db';

@Injectable({ providedIn: 'root' })
export class MockPatientsBackend extends PatientsBackend {
  private readonly db = inject(MockDb);
  private readonly auth = inject(MockAuthBackend);
  private readonly files = inject(MockFileStore);

  search(query: string, options: PatientSearchOptions = {}): Observable<Patient[]> {
    return respond(() => {
      this.auth.require('patient.read');
      const q = query.trim();
      const qDigits = digitsOf(q);
      const all = this.db.collection<Patient>('patients').all();
      const filtered = all.filter((p) => {
        if (!options.includeArchived && p.archived) return false;
        if (!q) return true;
        const names = `${p.firstNameLatin} ${p.lastNameLatin} ${p.firstNameArabic} ${p.lastNameArabic}`;
        if (matchesAllTokens(names, q)) return true;
        if (
          qDigits.length >= 3 &&
          (digitsOf(p.phone).includes(qDigits) || digitsOf(p.phone2).includes(qDigits))
        )
          return true;
        return (
          p.fileNumber.toLowerCase().includes(q.toLowerCase()) ||
          (qDigits.length >= 1 && digitsOf(p.fileNumber).endsWith(qDigits))
        );
      });
      filtered.sort(
        (a, b) =>
          a.lastNameLatin.localeCompare(b.lastNameLatin) ||
          a.firstNameLatin.localeCompare(b.firstNameLatin),
      );
      return options.limit ? filtered.slice(0, options.limit) : filtered;
    });
  }

  get(id: string): Observable<Patient> {
    return respond(() => {
      this.auth.require('patient.read');
      return this.db.collection<Patient>('patients').require(id);
    });
  }

  getMany(ids: string[]): Observable<Patient[]> {
    return respond(() => {
      this.auth.require('patient.read');
      const wanted = new Set(ids);
      return this.db.collection<Patient>('patients').where((p) => wanted.has(p.id));
    });
  }

  create(input: PatientInput): Observable<Patient> {
    return respond(() => {
      this.auth.require('patient.write');
      this.validate(input);
      const now = new Date().toISOString();
      const seq = this.db.nextSequence('patientFile');
      return this.db.collection<Patient>('patients').insert({
        ...input,
        id: newId(),
        fileNumber: `P-${String(seq).padStart(6, '0')}`,
        archived: false,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  update(id: string, patch: Partial<PatientInput>): Observable<Patient> {
    return respond(() => {
      this.auth.require('patient.write');
      return this.db.collection<Patient>('patients').update(id, (current) => {
        const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
        this.validate(next);
        return next;
      });
    });
  }

  setArchived(id: string, archived: boolean): Observable<Patient> {
    return respond(() => {
      this.auth.require('patient.archive');
      return this.db
        .collection<Patient>('patients')
        .update(id, { archived, updatedAt: new Date().toISOString() });
    });
  }

  listNotes(patientId: string): Observable<ClinicalNote[]> {
    return respond(() => {
      this.auth.require('note.read');
      return this.db
        .collection<ClinicalNote>('clinicalNotes')
        .where((n) => n.patientId === patientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  addNote(patientId: string, body: string): Observable<ClinicalNote> {
    return respond(() => {
      const session = this.auth.require('note.write');
      if (!session.doctorId) throw new BackendError('forbidden', { permission: 'note.write' });
      this.db.collection<Patient>('patients').require(patientId);
      const now = new Date().toISOString();
      return this.db.collection<ClinicalNote>('clinicalNotes').insert({
        id: newId(),
        patientId,
        doctorId: session.doctorId,
        body: body.trim(),
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  updateNote(noteId: string, body: string): Observable<ClinicalNote> {
    return respond(() => {
      const session = this.auth.require('note.write');
      const notes = this.db.collection<ClinicalNote>('clinicalNotes');
      const note = notes.require(noteId);
      if (!canEditNote(session, note))
        throw new BackendError('forbidden', { permission: 'chart.manage' });
      return notes.update(noteId, { body: body.trim(), updatedAt: new Date().toISOString() });
    });
  }

  listAttachments(patientId: string): Observable<Attachment[]> {
    return respond(() => {
      this.auth.require('attachment.read');
      return this.db
        .collection<Attachment>('attachments')
        .where((a) => a.patientId === patientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  addAttachment(input: AttachmentInput, file: Blob): Observable<Attachment> {
    return respondAsync(async () => {
      const session = this.auth.require('attachment.write');
      this.db.collection<Patient>('patients').require(input.patientId);
      if (file.size === 0 || file.size > MAX_ATTACHMENT_BYTES)
        throw new BackendError('validation', { field: 'file' });
      const id = newId();
      await this.files.put(id, file);
      return this.db.collection<Attachment>('attachments').insert({
        ...input,
        id,
        size: file.size,
        note: input.note?.trim() || null,
        uploadedBy: session.user.id,
        createdAt: new Date().toISOString(),
      });
    });
  }

  getAttachmentBlob(id: string): Observable<Blob> {
    return respondAsync(async () => {
      this.auth.require('attachment.read');
      this.db.collection<Attachment>('attachments').require(id);
      return this.files.get(id);
    });
  }

  deleteAttachment(id: string): Observable<void> {
    return respondAsync(async () => {
      this.auth.require('attachment.write');
      this.db.collection<Attachment>('attachments').require(id);
      await this.files.delete(id);
      this.db.collection<Attachment>('attachments').remove(id);
    });
  }

  private validate(input: PatientInput): void {
    if (!input.firstNameLatin.trim() && !input.firstNameArabic.trim())
      throw new BackendError('validation', { field: 'firstName' });
    if (!input.lastNameLatin.trim() && !input.lastNameArabic.trim())
      throw new BackendError('validation', { field: 'lastName' });
    if (!/^\+222\d{8}$/.test(input.phone)) throw new BackendError('validation', { field: 'phone' });
  }
}
