import { Observable } from 'rxjs';
import type { ClinicalDocument, DocumentInput } from './document.model';
import type { Procedure } from './procedure.model';
import type { ChartEntry, ChartEntryInput } from './tooth.model';
import type {
  PlanItemInput,
  PlanItemStatus,
  PlanStatus,
  TreatmentPlan,
} from './treatment-plan.model';

export abstract class ClinicalBackend {
  abstract listProcedures(): Observable<Procedure[]>;
  abstract saveProcedure(procedure: Procedure): Observable<Procedure>;

  abstract listChartEntries(patientId: string): Observable<ChartEntry[]>;
  abstract addChartEntry(input: ChartEntryInput): Observable<ChartEntry>;
  abstract updateChartEntry(
    id: string,
    patch: Partial<Pick<ChartEntry, 'status' | 'note' | 'surfaces'>>,
  ): Observable<ChartEntry>;
  abstract voidChartEntry(id: string): Observable<ChartEntry>;

  abstract listPlans(patientId: string): Observable<TreatmentPlan[]>;
  abstract getPlan(planId: string): Observable<TreatmentPlan>;
  abstract createPlan(patientId: string, title: string): Observable<TreatmentPlan>;
  abstract renamePlan(planId: string, title: string): Observable<TreatmentPlan>;
  abstract setPlanStatus(planId: string, status: PlanStatus): Observable<TreatmentPlan>;
  abstract addPhase(planId: string, title: string): Observable<TreatmentPlan>;
  abstract renamePhase(planId: string, phaseId: string, title: string): Observable<TreatmentPlan>;
  abstract removePhase(planId: string, phaseId: string): Observable<TreatmentPlan>;
  abstract addItem(
    planId: string,
    phaseId: string,
    input: PlanItemInput,
  ): Observable<TreatmentPlan>;
  abstract updateItem(
    planId: string,
    itemId: string,
    patch: Partial<PlanItemInput>,
  ): Observable<TreatmentPlan>;
  abstract removeItem(planId: string, itemId: string): Observable<TreatmentPlan>;
  /** Completing an item records a `completed` ChartEntry and makes the item invoiceable. */
  abstract setItemStatus(
    planId: string,
    itemId: string,
    status: PlanItemStatus,
  ): Observable<TreatmentPlan>;

  abstract listDocuments(patientId: string): Observable<ClinicalDocument[]>;
  abstract getDocument(id: string): Observable<ClinicalDocument>;
  /** Only doctors create documents; the mock stamps the session's doctor. */
  abstract createDocument(input: DocumentInput): Observable<ClinicalDocument>;
}
