import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { AuthStore } from '../../core/auth/auth.store';
import { OdontogramStore } from '../../domain/clinical/odontogram.store';
import { ProceduresStore } from '../../domain/clinical/procedures.store';
import { TreatmentPlansStore } from '../../domain/clinical/treatment-plans.store';
import { EmptyState } from '../../shared/ui/empty-state';
import { LoadingBlock } from '../../shared/ui/loading-block';
import { PickerTarget, ProcedurePickerDialog } from '../odontogram/procedure-picker-dialog';
import { PlanEditor } from '../treatment-plans/plan-editor';
import { injectPatientId } from './patient-route';

@Component({
  selector: 'app-patient-plans-tab',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    Dialog,
    InputText,
    EmptyState,
    LoadingBlock,
    PlanEditor,
    ProcedurePickerDialog,
  ],
  templateUrl: './patient-plans-tab.html',
  host: { class: 'block' },
})
export class PatientPlansTab {
  protected readonly store = inject(TreatmentPlansStore);
  protected readonly procedures = inject(ProceduresStore);
  protected readonly odontogram = inject(OdontogramStore);
  protected readonly auth = inject(AuthStore);
  protected readonly patientId = injectPatientId();

  protected readonly newOpen = signal(false);
  protected readonly newTitle = signal('');
  protected readonly pickerOpen = signal(false);
  protected readonly pickerTarget = signal<PickerTarget | null>(null);

  protected readonly canWrite = computed(() => this.auth.can('plan.write'));
  protected readonly active = computed(() =>
    this.store.plans().filter((p) => p.status !== 'cancelled' && p.status !== 'completed'),
  );
  protected readonly closed = computed(() =>
    this.store.plans().filter((p) => p.status === 'cancelled' || p.status === 'completed'),
  );

  constructor() {
    effect(() => {
      const id = this.patientId();
      if (!id) return;
      this.store.load(id);
      if (this.auth.can('chart.read')) this.odontogram.load(id);
      if (!this.procedures.loaded()) this.procedures.load();
    });
  }

  protected createPlan(): void {
    this.store.create(this.newTitle(), () => {
      this.newOpen.set(false);
      this.newTitle.set('');
    });
  }

  protected addItem(target: { planId: string; phaseId: string }): void {
    this.pickerTarget.set({
      fdi: null,
      surfaces: [],
      planId: target.planId,
      phaseId: target.phaseId,
    });
    this.pickerOpen.set(true);
  }
}
