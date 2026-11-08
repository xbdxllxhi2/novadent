import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { NotifyService } from '../../core/notify/notify.service';
import { ClinicalBackend } from './clinical-backend';
import { OdontogramStore } from './odontogram.store';
import type {
  PlanItemInput,
  PlanItemStatus,
  PlanStatus,
  TreatmentPlan,
} from './treatment-plan.model';

@Injectable({ providedIn: 'root' })
export class TreatmentPlansStore {
  private readonly backend = inject(ClinicalBackend);
  private readonly notify = inject(NotifyService);
  private readonly odontogram = inject(OdontogramStore);

  readonly patientId = signal<string | null>(null);
  readonly plans = signal<TreatmentPlan[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  load(patientId: string): void {
    if (this.patientId() !== patientId) this.plans.set([]);
    this.patientId.set(patientId);
    this.loading.set(true);
    this.backend.listPlans(patientId).subscribe({
      next: (list) => {
        if (this.patientId() !== patientId) return;
        this.plans.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.failure(e);
      },
    });
  }

  create(title: string, done?: (plan: TreatmentPlan) => void): void {
    const patientId = this.patientId();
    if (!patientId) return;
    this.saving.set(true);
    this.backend.createPlan(patientId, title).subscribe({
      next: (plan) => {
        this.saving.set(false);
        this.plans.update((list) => [plan, ...list]);
        this.notify.success('notify.planCreated');
        done?.(plan);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  rename(planId: string, title: string): void {
    this.apply(this.backend.renamePlan(planId, title));
  }

  setStatus(planId: string, status: PlanStatus): void {
    this.apply(
      this.backend.setPlanStatus(planId, status),
      status === 'accepted' ? 'notify.planAccepted' : 'notify.saved',
    );
  }

  addPhase(planId: string, title: string): void {
    this.apply(this.backend.addPhase(planId, title));
  }

  renamePhase(planId: string, phaseId: string, title: string): void {
    this.apply(this.backend.renamePhase(planId, phaseId, title));
  }

  removePhase(planId: string, phaseId: string): void {
    this.apply(this.backend.removePhase(planId, phaseId));
  }

  addItem(planId: string, phaseId: string, input: PlanItemInput, done?: () => void): void {
    this.apply(this.backend.addItem(planId, phaseId, input), 'notify.planItemAdded', done, true);
  }

  updateItem(planId: string, itemId: string, patch: Partial<PlanItemInput>): void {
    this.apply(this.backend.updateItem(planId, itemId, patch));
  }

  removeItem(planId: string, itemId: string): void {
    this.apply(this.backend.removeItem(planId, itemId), 'notify.saved', undefined, true);
  }

  setItemStatus(planId: string, itemId: string, status: PlanItemStatus): void {
    this.apply(
      this.backend.setItemStatus(planId, itemId, status),
      status === 'completed' ? 'notify.planItemCompleted' : 'notify.saved',
      undefined,
      true,
    );
  }

  private apply(
    call: Observable<TreatmentPlan>,
    successKey = 'notify.saved',
    done?: () => void,
    touchesChart = false,
  ): void {
    this.saving.set(true);
    call.subscribe({
      next: (plan) => {
        this.saving.set(false);
        this.plans.update((list) => list.map((p) => (p.id === plan.id ? plan : p)));
        if (touchesChart) this.odontogram.reload();
        this.notify.success(successKey);
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }
}
