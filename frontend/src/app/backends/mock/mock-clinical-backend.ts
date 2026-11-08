import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { canEditChartEntry } from '../../core/auth/clinical-policy';
import { BackendError } from '../../core/backend-error';
import { ClinicalBackend } from '../../domain/clinical/clinical-backend';
import type { ClinicalDocument, DocumentInput } from '../../domain/clinical/document.model';
import type { Procedure } from '../../domain/clinical/procedure.model';
import type { ChartEntry, ChartEntryInput } from '../../domain/clinical/tooth.model';
import type {
  PlanItem,
  PlanItemInput,
  PlanItemStatus,
  PlanStatus,
  TreatmentPlan,
} from '../../domain/clinical/treatment-plan.model';
import type { Patient } from '../../domain/patients/patient.model';
import { newId } from './ids';
import { respond } from './latency';
import { MockAuthBackend } from './mock-auth-backend';
import { MockDb } from './mock-db';
import type { StoredProcedure } from './seed';

@Injectable({ providedIn: 'root' })
export class MockClinicalBackend extends ClinicalBackend {
  private readonly db = inject(MockDb);
  private readonly auth = inject(MockAuthBackend);

  // Procedures --------------------------------------------------------------------------------

  listProcedures(): Observable<Procedure[]> {
    return respond(() => {
      this.auth.require('procedure.read');
      return this.db.collection<StoredProcedure>('procedures').all().map(stripId);
    });
  }

  saveProcedure(procedure: Procedure): Observable<Procedure> {
    return respond(() => {
      this.auth.require('procedure.manage');
      if (!procedure.code.trim()) throw new BackendError('validation', { field: 'code' });
      return stripId(
        this.db
          .collection<StoredProcedure>('procedures')
          .upsert({ ...procedure, id: procedure.code }),
      );
    });
  }

  // Chart -------------------------------------------------------------------------------------

  listChartEntries(patientId: string): Observable<ChartEntry[]> {
    return respond(() => {
      this.auth.require('chart.read');
      return this.db
        .collection<ChartEntry>('chartEntries')
        .where((e) => e.patientId === patientId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    });
  }

  addChartEntry(input: ChartEntryInput): Observable<ChartEntry> {
    return respond(() => {
      const session = this.auth.require('chart.write');
      this.db.collection<Patient>('patients').require(input.patientId);
      const doctorId = session.doctorId ?? input.doctorId;
      if (!doctorId) throw new BackendError('validation', { field: 'doctorId' });
      return this.db.collection<ChartEntry>('chartEntries').insert({
        ...input,
        doctorId,
        id: newId(),
        recordedAt: new Date().toISOString(),
        voided: false,
      });
    });
  }

  updateChartEntry(
    id: string,
    patch: Partial<Pick<ChartEntry, 'status' | 'note' | 'surfaces'>>,
  ): Observable<ChartEntry> {
    return respond(() => {
      const session = this.auth.require('chart.write');
      const entries = this.db.collection<ChartEntry>('chartEntries');
      const entry = entries.require(id);
      if (!canEditChartEntry(session, entry))
        throw new BackendError('forbidden', { permission: 'chart.manage' });
      return entries.update(id, patch);
    });
  }

  voidChartEntry(id: string): Observable<ChartEntry> {
    return respond(() => {
      const session = this.auth.require('chart.write');
      const entries = this.db.collection<ChartEntry>('chartEntries');
      const entry = entries.require(id);
      if (!canEditChartEntry(session, entry))
        throw new BackendError('forbidden', { permission: 'chart.manage' });
      return entries.update(id, { voided: true });
    });
  }

  // Treatment plans ---------------------------------------------------------------------------

  listPlans(patientId: string): Observable<TreatmentPlan[]> {
    return respond(() => {
      this.auth.require('plan.read');
      return this.db
        .collection<TreatmentPlan>('treatmentPlans')
        .where((p) => p.patientId === patientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  getPlan(planId: string): Observable<TreatmentPlan> {
    return respond(() => {
      this.auth.require('plan.read');
      return this.db.collection<TreatmentPlan>('treatmentPlans').require(planId);
    });
  }

  createPlan(patientId: string, title: string): Observable<TreatmentPlan> {
    return respond(() => {
      const session = this.auth.require('plan.write');
      this.db.collection<Patient>('patients').require(patientId);
      const now = new Date().toISOString();
      return this.db.collection<TreatmentPlan>('treatmentPlans').insert({
        id: newId(),
        patientId,
        title: title.trim() || 'Plan de soins',
        status: 'draft',
        phases: [{ id: newId(), title: 'Phase 1', order: 1, items: [] }],
        acceptedAt: null,
        createdBy: session.user.id,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  renamePlan(planId: string, title: string): Observable<TreatmentPlan> {
    return this.mutatePlan('plan.write', planId, (plan) => ({
      ...plan,
      title: title.trim() || plan.title,
    }));
  }

  setPlanStatus(planId: string, status: PlanStatus): Observable<TreatmentPlan> {
    return this.mutatePlan(
      status === 'accepted' ? 'plan.accept' : 'plan.write',
      planId,
      (plan) => ({
        ...plan,
        status,
        acceptedAt:
          status === 'accepted' ? (plan.acceptedAt ?? new Date().toISOString()) : plan.acceptedAt,
      }),
    );
  }

  addPhase(planId: string, title: string): Observable<TreatmentPlan> {
    return this.mutatePlan('plan.write', planId, (plan) => ({
      ...plan,
      phases: [
        ...plan.phases,
        {
          id: newId(),
          title: title.trim() || `Phase ${plan.phases.length + 1}`,
          order: plan.phases.length + 1,
          items: [],
        },
      ],
    }));
  }

  renamePhase(planId: string, phaseId: string, title: string): Observable<TreatmentPlan> {
    return this.mutatePlan('plan.write', planId, (plan) => ({
      ...plan,
      phases: plan.phases.map((ph) =>
        ph.id === phaseId ? { ...ph, title: title.trim() || ph.title } : ph,
      ),
    }));
  }

  removePhase(planId: string, phaseId: string): Observable<TreatmentPlan> {
    return this.mutatePlan('plan.write', planId, (plan) => {
      const phase = plan.phases.find((ph) => ph.id === phaseId);
      if (phase?.items.some((i) => i.status === 'completed' || i.invoiceLineId))
        throw new BackendError('conflict');
      return {
        ...plan,
        phases: plan.phases
          .filter((ph) => ph.id !== phaseId)
          .map((ph, i) => ({ ...ph, order: i + 1 })),
      };
    });
  }

  addItem(planId: string, phaseId: string, input: PlanItemInput): Observable<TreatmentPlan> {
    return respond(() => {
      const session = this.auth.require('plan.write');
      const plans = this.db.collection<TreatmentPlan>('treatmentPlans');
      const plan = plans.require(planId);
      const phase = plan.phases.find((ph) => ph.id === phaseId);
      if (!phase) throw new BackendError('notFound', { id: phaseId });
      const procedure = this.db
        .collection<StoredProcedure>('procedures')
        .require(input.procedureCode);
      const item: PlanItem = {
        id: newId(),
        procedureCode: input.procedureCode,
        toothFdi: input.toothFdi,
        surfaces: input.surfaces,
        doctorId: input.doctorId || session.doctorId || '',
        price: Number.isFinite(input.price) ? Math.round(input.price) : procedure.defaultPrice,
        status: 'planned',
        completedAt: null,
        chartEntryId: null,
        invoiceLineId: null,
      };
      if (!item.doctorId) throw new BackendError('validation', { field: 'doctorId' });
      // A planned procedure on a tooth shows on the chart as planned.
      if (item.toothFdi !== null) {
        const entry = this.db.collection<ChartEntry>('chartEntries').insert({
          id: newId(),
          patientId: plan.patientId,
          toothFdi: item.toothFdi,
          surfaces: item.surfaces,
          kind: 'procedure',
          condition: null,
          procedureCode: item.procedureCode,
          status: 'planned',
          doctorId: item.doctorId,
          recordedAt: new Date().toISOString(),
          planItemId: item.id,
          note: null,
          voided: false,
        });
        item.chartEntryId = entry.id;
      }
      phase.items.push(item);
      return plans.update(planId, { ...plan, updatedAt: new Date().toISOString() });
    });
  }

  updateItem(
    planId: string,
    itemId: string,
    patch: Partial<PlanItemInput>,
  ): Observable<TreatmentPlan> {
    return this.mutatePlan('plan.write', planId, (plan) => {
      const item = findItem(plan, itemId);
      if (item.status === 'completed') throw new BackendError('conflict');
      Object.assign(
        item,
        patch,
        patch.price !== undefined ? { price: Math.round(patch.price) } : {},
      );
      return plan;
    });
  }

  removeItem(planId: string, itemId: string): Observable<TreatmentPlan> {
    return this.mutatePlan('plan.write', planId, (plan) => {
      const item = findItem(plan, itemId);
      if (item.status === 'completed' || item.invoiceLineId) throw new BackendError('conflict');
      if (item.chartEntryId)
        this.db.collection<ChartEntry>('chartEntries').update(item.chartEntryId, { voided: true });
      for (const ph of plan.phases) ph.items = ph.items.filter((i) => i.id !== itemId);
      return plan;
    });
  }

  setItemStatus(planId: string, itemId: string, status: PlanItemStatus): Observable<TreatmentPlan> {
    return respond(() => {
      const session = this.auth.require(
        status === 'completed' || status === 'in-progress' ? 'chart.write' : 'plan.write',
      );
      const plans = this.db.collection<TreatmentPlan>('treatmentPlans');
      const plan = plans.require(planId);
      const item = findItem(plan, itemId);
      if (item.invoiceLineId && status !== 'completed') throw new BackendError('conflict');
      const entries = this.db.collection<ChartEntry>('chartEntries');
      const now = new Date().toISOString();

      if (status === 'completed' || status === 'in-progress') {
        if (!canEditChartEntry(session, { doctorId: item.doctorId }))
          throw new BackendError('forbidden', { permission: 'chart.manage' });
      }

      item.status = status;
      item.completedAt = status === 'completed' ? now : null;

      if (item.toothFdi !== null) {
        if (status === 'cancelled') {
          if (item.chartEntryId) entries.update(item.chartEntryId, { voided: true });
        } else if (item.chartEntryId && entries.get(item.chartEntryId)) {
          const condition =
            status === 'completed' ? conditionForProcedure(item.procedureCode) : null;
          entries.update(item.chartEntryId, {
            status:
              status === 'completed'
                ? 'completed'
                : status === 'in-progress'
                  ? 'in-progress'
                  : 'planned',
            condition,
            doctorId: session.doctorId ?? item.doctorId,
            recordedAt: status === 'completed' ? now : undefined,
          } as Partial<ChartEntry>);
        } else {
          const entry = entries.insert({
            id: newId(),
            patientId: plan.patientId,
            toothFdi: item.toothFdi,
            surfaces: item.surfaces,
            kind: 'procedure',
            condition: status === 'completed' ? conditionForProcedure(item.procedureCode) : null,
            procedureCode: item.procedureCode,
            status:
              status === 'completed'
                ? 'completed'
                : status === 'in-progress'
                  ? 'in-progress'
                  : 'planned',
            doctorId: session.doctorId ?? item.doctorId,
            recordedAt: now,
            planItemId: item.id,
            note: null,
            voided: false,
          });
          item.chartEntryId = entry.id;
        }
      }

      const live = plan.phases.flatMap((ph) => ph.items).filter((i) => i.status !== 'cancelled');
      if (
        live.length > 0 &&
        live.every((i) => i.status === 'completed') &&
        plan.status === 'accepted'
      )
        plan.status = 'completed';
      return plans.update(planId, { ...plan, updatedAt: now });
    });
  }

  // Documents ---------------------------------------------------------------------------------

  listDocuments(patientId: string): Observable<ClinicalDocument[]> {
    return respond(() => {
      this.auth.require('document.read');
      return this.db
        .collection<ClinicalDocument>('documents')
        .where((d) => d.patientId === patientId)
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    });
  }

  getDocument(id: string): Observable<ClinicalDocument> {
    return respond(() => {
      this.auth.require('document.read');
      return this.db.collection<ClinicalDocument>('documents').require(id);
    });
  }

  createDocument(input: DocumentInput): Observable<ClinicalDocument> {
    return respond(() => {
      const session = this.auth.require('document.write');
      if (!session.doctorId) throw new BackendError('forbidden', { permission: 'document.write' });
      this.db.collection<Patient>('patients').require(input.patientId);
      if (!input.body.trim()) throw new BackendError('validation', { field: 'body' });
      return this.db.collection<ClinicalDocument>('documents').insert({
        id: newId(),
        patientId: input.patientId,
        doctorId: session.doctorId,
        kind: input.kind,
        certificateType: input.kind === 'certificate' ? input.certificateType : null,
        days: input.kind === 'certificate' ? input.days : null,
        fromDate: input.kind === 'certificate' ? input.fromDate : null,
        body: input.body.trim(),
        issuedAt: new Date().toISOString(),
      });
    });
  }

  private mutatePlan(
    permission: 'plan.write' | 'plan.accept',
    planId: string,
    change: (plan: TreatmentPlan) => TreatmentPlan,
  ): Observable<TreatmentPlan> {
    return respond(() => {
      this.auth.require(permission);
      const plans = this.db.collection<TreatmentPlan>('treatmentPlans');
      const next = change(plans.require(planId));
      return plans.update(planId, { ...next, updatedAt: new Date().toISOString() });
    });
  }
}

function findItem(plan: TreatmentPlan, itemId: string): PlanItem {
  for (const ph of plan.phases) {
    const item = ph.items.find((i) => i.id === itemId);
    if (item) return item;
  }
  throw new BackendError('notFound', { id: itemId });
}

function stripId(p: StoredProcedure): Procedure {
  const { id: _id, ...rest } = p;
  return rest;
}

/** What a completed procedure leaves on the tooth. */
export function conditionForProcedure(code: string): ChartEntry['condition'] {
  if (code.startsWith('EXT')) return 'missing';
  if (code.startsWith('IMPL')) return 'implant';
  if (code.startsWith('COUR') || code === 'BRIDGE') return 'crown';
  if (code.startsWith('ENDO') || code === 'PULP') return 'root-canal';
  if (code === 'FACET') return 'veneer';
  if (code === 'SCEL') return 'sealant';
  if (
    code.startsWith('COMP') ||
    code === 'AMAL' ||
    code === 'CVI' ||
    code === 'INLAY' ||
    code === 'PANS'
  )
    return 'filling';
  return null;
}
