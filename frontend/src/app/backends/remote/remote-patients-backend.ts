import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Attachment } from '../../domain/patients/attachment.model';
import type { ClinicalNote, Patient } from '../../domain/patients/patient.model';
import { PatientsBackend } from '../../domain/patients/patients-backend';
import { notImplemented } from './not-implemented';

@Injectable({ providedIn: 'root' })
export class RemotePatientsBackend extends PatientsBackend {
  search(): Observable<Patient[]> {
    return notImplemented('PatientsBackend.search');
  }
  get(): Observable<Patient> {
    return notImplemented('PatientsBackend.get');
  }
  getMany(): Observable<Patient[]> {
    return notImplemented('PatientsBackend.getMany');
  }
  create(): Observable<Patient> {
    return notImplemented('PatientsBackend.create');
  }
  update(): Observable<Patient> {
    return notImplemented('PatientsBackend.update');
  }
  setArchived(): Observable<Patient> {
    return notImplemented('PatientsBackend.setArchived');
  }
  listNotes(): Observable<ClinicalNote[]> {
    return notImplemented('PatientsBackend.listNotes');
  }
  addNote(): Observable<ClinicalNote> {
    return notImplemented('PatientsBackend.addNote');
  }
  updateNote(): Observable<ClinicalNote> {
    return notImplemented('PatientsBackend.updateNote');
  }
  listAttachments(): Observable<Attachment[]> {
    return notImplemented('PatientsBackend.listAttachments');
  }
  addAttachment(): Observable<Attachment> {
    return notImplemented('PatientsBackend.addAttachment');
  }
  getAttachmentBlob(): Observable<Blob> {
    return notImplemented('PatientsBackend.getAttachmentBlob');
  }
  deleteAttachment(): Observable<void> {
    return notImplemented('PatientsBackend.deleteAttachment');
  }
}
