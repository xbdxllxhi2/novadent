import { Observable } from 'rxjs';
import type { Attachment, AttachmentInput } from './attachment.model';
import type { ClinicalNote, Patient, PatientInput, PatientSearchOptions } from './patient.model';

export abstract class PatientsBackend {
  abstract search(query: string, options?: PatientSearchOptions): Observable<Patient[]>;
  abstract get(id: string): Observable<Patient>;
  abstract getMany(ids: string[]): Observable<Patient[]>;
  abstract create(input: PatientInput): Observable<Patient>;
  abstract update(id: string, patch: Partial<PatientInput>): Observable<Patient>;
  abstract setArchived(id: string, archived: boolean): Observable<Patient>;
  abstract listNotes(patientId: string): Observable<ClinicalNote[]>;
  abstract addNote(patientId: string, body: string): Observable<ClinicalNote>;
  abstract updateNote(noteId: string, body: string): Observable<ClinicalNote>;
  abstract listAttachments(patientId: string): Observable<Attachment[]>;
  abstract addAttachment(input: AttachmentInput, file: Blob): Observable<Attachment>;
  abstract getAttachmentBlob(id: string): Observable<Blob>;
  abstract deleteAttachment(id: string): Observable<void>;
}
