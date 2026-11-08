import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';
import { AuthStore } from '../../core/auth/auth.store';
import { formatSurfaces } from '../../domain/clinical/fdi';
import { OdontogramStore } from '../../domain/clinical/odontogram.store';
import { ProceduresStore } from '../../domain/clinical/procedures.store';
import type { Dentition } from '../../domain/clinical/tooth.model';
import { TreatmentPlansStore } from '../../domain/clinical/treatment-plans.store';
import { LoadingBlock } from '../../shared/ui/loading-block';
import { ChartHistory } from '../odontogram/chart-history';
import { Odontogram, ToothSelection } from '../odontogram/odontogram';
import { OdontogramLegend } from '../odontogram/odontogram-legend';
import {
  PickerMode,
  PickerTarget,
  ProcedurePickerDialog,
} from '../odontogram/procedure-picker-dialog';
import { injectPatientId } from './patient-route';

@Component({
  selector: 'app-patient-chart-tab',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    SelectButton,
    LoadingBlock,
    Odontogram,
    OdontogramLegend,
    ChartHistory,
    ProcedurePickerDialog,
  ],
  templateUrl: './patient-chart-tab.html',
  host: { class: 'block' },
})
export class PatientChartTab {
  protected readonly store = inject(OdontogramStore);
  protected readonly plans = inject(TreatmentPlansStore);
  protected readonly procedures = inject(ProceduresStore);
  protected readonly auth = inject(AuthStore);
  protected readonly patientId = injectPatientId();

  protected readonly dentition = signal<Dentition>('permanent');
  protected readonly selection = signal<ToothSelection | null>(null);
  protected readonly pickerOpen = signal(false);
  protected readonly pickerMode = signal<PickerMode>('finding');
  protected readonly pickerTarget = signal<PickerTarget | null>(null);

  protected readonly dentitionOptions: { value: Dentition; labelKey: string }[] = [
    { value: 'permanent', labelKey: 'odontogram.permanent' },
    { value: 'primary', labelKey: 'odontogram.primary' },
  ];
  protected readonly canWrite = computed(() => this.auth.can('chart.write'));
  protected readonly canPlan = computed(() => this.auth.can('plan.write'));
  protected readonly selectionLabel = computed(() => {
    const s = this.selection();
    if (!s) return '';
    return s.surfaces.length ? `${s.fdi} ${formatSurfaces(s.fdi, s.surfaces)}` : `${s.fdi}`;
  });

  constructor() {
    effect(() => {
      const id = this.patientId();
      if (!id) return;
      this.store.load(id);
      if (this.auth.can('plan.read')) this.plans.load(id);
      if (!this.procedures.loaded()) this.procedures.load();
    });
  }

  protected open(mode: PickerMode): void {
    const s = this.selection();
    this.pickerMode.set(mode);
    this.pickerTarget.set(s ? { fdi: s.fdi, surfaces: s.surfaces } : { fdi: null, surfaces: [] });
    this.pickerOpen.set(true);
  }

  protected onDone(): void {
    this.selection.set(null);
  }
}
