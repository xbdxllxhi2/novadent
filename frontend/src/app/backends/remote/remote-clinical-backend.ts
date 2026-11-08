import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ClinicalBackend } from '../../domain/clinical/clinical-backend';
import type { ClinicalDocument } from '../../domain/clinical/document.model';
import type { Procedure } from '../../domain/clinical/procedure.model';
import type { ChartEntry } from '../../domain/clinical/tooth.model';
import type { TreatmentPlan } from '../../domain/clinical/treatment-plan.model';
import { notImplemented } from './not-implemented';

@Injectable({ providedIn: 'root' })
export class RemoteClinicalBackend extends ClinicalBackend {
  listProcedures(): Observable<Procedure[]> {
    return notImplemented('ClinicalBackend.listProcedures');
  }
  saveProcedure(): Observable<Procedure> {
    return notImplemented('ClinicalBackend.saveProcedure');
  }
  listChartEntries(): Observable<ChartEntry[]> {
    return notImplemented('ClinicalBackend.listChartEntries');
  }
  addChartEntry(): Observable<ChartEntry> {
    return notImplemented('ClinicalBackend.addChartEntry');
  }
  updateChartEntry(): Observable<ChartEntry> {
    return notImplemented('ClinicalBackend.updateChartEntry');
  }
  voidChartEntry(): Observable<ChartEntry> {
    return notImplemented('ClinicalBackend.voidChartEntry');
  }
  listPlans(): Observable<TreatmentPlan[]> {
    return notImplemented('ClinicalBackend.listPlans');
  }
  getPlan(): Observable<TreatmentPlan> {
    return notImplemented('ClinicalBackend.getPlan');
  }
  createPlan(): Observable<TreatmentPlan> {
    return notImplemented('ClinicalBackend.createPlan');
  }
  renamePlan(): Observable<TreatmentPlan> {
    return notImplemented('ClinicalBackend.renamePlan');
  }
  setPlanStatus(): Observable<TreatmentPlan> {
    return notImplemented('ClinicalBackend.setPlanStatus');
  }
  addPhase(): Observable<TreatmentPlan> {
    return notImplemented('ClinicalBackend.addPhase');
  }
  renamePhase(): Observable<TreatmentPlan> {
    return notImplemented('ClinicalBackend.renamePhase');
  }
  removePhase(): Observable<TreatmentPlan> {
    return notImplemented('ClinicalBackend.removePhase');
  }
  addItem(): Observable<TreatmentPlan> {
    return notImplemented('ClinicalBackend.addItem');
  }
  updateItem(): Observable<TreatmentPlan> {
    return notImplemented('ClinicalBackend.updateItem');
  }
  removeItem(): Observable<TreatmentPlan> {
    return notImplemented('ClinicalBackend.removeItem');
  }
  setItemStatus(): Observable<TreatmentPlan> {
    return notImplemented('ClinicalBackend.setItemStatus');
  }
  listDocuments(): Observable<ClinicalDocument[]> {
    return notImplemented('ClinicalBackend.listDocuments');
  }
  getDocument(): Observable<ClinicalDocument> {
    return notImplemented('ClinicalBackend.getDocument');
  }
  createDocument(): Observable<ClinicalDocument> {
    return notImplemented('ClinicalBackend.createDocument');
  }
}
