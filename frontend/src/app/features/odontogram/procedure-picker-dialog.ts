import { Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { Textarea } from 'primeng/textarea';
import { AuthStore } from '../../core/auth/auth.store';
import { normalizeText } from '../../core/text/normalize';
import { allTeeth, formatSurfaces } from '../../domain/clinical/fdi';
import { OdontogramStore } from '../../domain/clinical/odontogram.store';
import type { Procedure } from '../../domain/clinical/procedure.model';
import { ProceduresStore } from '../../domain/clinical/procedures.store';
import {
  CLINICAL_STATUSES,
  ClinicalStatus,
  Surface,
  TOOTH_CONDITIONS,
  ToothCondition,
} from '../../domain/clinical/tooth.model';
import type { TreatmentPlan } from '../../domain/clinical/treatment-plan.model';
import { TreatmentPlansStore } from '../../domain/clinical/treatment-plans.store';
import { StaffStore } from '../../domain/staff/staff.store';
import { LocaleStore } from '../../core/i18n/locale.store';
import { LocalizedPipe } from '../../shared/ui/localized.pipe';
import { MoneyPipe } from '../../shared/ui/money.pipe';

export type PickerMode = 'finding' | 'plan';

export interface PickerTarget {
  fdi: number | null;
  surfaces: Surface[];
  /** Preselected plan and phase when opened from the plan editor. */
  planId?: string;
  phaseId?: string;
}

const NEW_PLAN = '__new__';

/**
 * Two jobs behind one dialog: record a finding on the chart (`finding`), or plan a procedure
 * into a treatment plan (`plan`), optionally creating the plan on the fly.
 */
@Component({
  selector: 'app-procedure-picker-dialog',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    Dialog,
    IconField,
    InputIcon,
    InputNumber,
    InputText,
    Select,
    SelectButton,
    Textarea,
    LocalizedPipe,
    MoneyPipe,
  ],
  templateUrl: './procedure-picker-dialog.html',
})
export class ProcedurePickerDialog {
  protected readonly procedures = inject(ProceduresStore);
  protected readonly plans = inject(TreatmentPlansStore);
  protected readonly odontogram = inject(OdontogramStore);
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);
  private readonly locale = inject(LocaleStore);

  readonly visible = model(false);
  readonly mode = input<PickerMode>('plan');
  readonly patientId = input.required<string>();
  readonly target = input<PickerTarget | null>(null);
  readonly done = output<void>();

  // Finding form
  protected readonly condition = signal<ToothCondition>('caries');
  protected readonly findingStatus = signal<ClinicalStatus>('existing');
  protected readonly note = signal('');

  // Plan form
  protected readonly query = signal('');
  protected readonly procedure = signal<Procedure | null>(null);
  protected readonly price = signal<number>(0);
  protected readonly doctorId = signal<string | null>(null);
  protected readonly planChoice = signal<string>(NEW_PLAN);
  protected readonly phaseId = signal<string | null>(null);
  protected readonly newPlanTitle = signal('');
  protected readonly toothFdi = signal<number | null>(null);
  protected readonly submitted = signal(false);

  protected readonly conditions = TOOTH_CONDITIONS;
  protected readonly findingStatuses: ClinicalStatus[] = CLINICAL_STATUSES.filter(
    (s) => s !== 'in-progress',
  );
  protected readonly teethOptions = allTeeth('permanent').map((fdi) => ({
    fdi,
    label: String(fdi),
  }));
  protected readonly newPlanValue = NEW_PLAN;

  protected readonly targetLabel = computed(() => {
    const t = this.target();
    const fdi = this.toothFdi() ?? t?.fdi ?? null;
    if (fdi === null) return '';
    const surfaces = t?.fdi === fdi ? t.surfaces : [];
    return surfaces.length ? `${fdi} ${formatSurfaces(fdi, surfaces)}` : `${fdi}`;
  });

  protected readonly filtered = computed(() => {
    const q = normalizeText(this.query());
    const list = this.procedures.active();
    if (!q) return list;
    return list.filter((p) =>
      normalizeText(`${p.code} ${p.name.fr} ${p.name.ar} ${p.name.en}`).includes(q),
    );
  });

  protected readonly openPlans = computed<TreatmentPlan[]>(() =>
    this.plans
      .plans()
      .filter((p) => p.status === 'draft' || p.status === 'proposed' || p.status === 'accepted'),
  );
  protected readonly planOptions = computed(() => [
    { value: NEW_PLAN, label: '' },
    ...this.openPlans().map((p) => ({ value: p.id, label: p.title })),
  ]);
  protected readonly phases = computed(
    () => this.openPlans().find((p) => p.id === this.planChoice())?.phases ?? [],
  );

  protected readonly valid = computed(() => {
    if (this.mode() === 'finding') return (this.toothFdi() ?? this.target()?.fdi) !== null;
    if (!this.procedure() || !this.doctorId()) return false;
    if (this.planChoice() !== NEW_PLAN && !this.phaseId()) return false;
    return true;
  });

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const t = this.target();
      this.submitted.set(false);
      this.query.set('');
      this.procedure.set(null);
      this.note.set('');
      this.condition.set('caries');
      this.findingStatus.set('existing');
      this.toothFdi.set(t?.fdi ?? null);
      this.doctorId.set(this.auth.doctorId() ?? this.staff.activeDoctors()[0]?.id ?? null);
      const preset =
        t?.planId && this.openPlans().some((p) => p.id === t.planId)
          ? t.planId
          : (this.openPlans()[0]?.id ?? NEW_PLAN);
      this.planChoice.set(preset);
      this.phaseId.set(
        t?.phaseId ?? this.openPlans().find((p) => p.id === preset)?.phases[0]?.id ?? null,
      );
      this.newPlanTitle.set('');
    });
    effect(() => {
      // Keep the phase in sync with the chosen plan.
      const phases = this.phases();
      if (phases.length && !phases.some((ph) => ph.id === this.phaseId()))
        this.phaseId.set(phases[0].id);
    });
  }

  protected pick(p: Procedure): void {
    this.procedure.set(p);
    this.price.set(p.defaultPrice);
    if (p.appliesTo === 'mouth' || p.appliesTo === 'arch') this.toothFdi.set(null);
  }

  protected submit(): void {
    this.submitted.set(true);
    if (!this.valid()) return;
    const t = this.target();
    const fdi = this.toothFdi() ?? t?.fdi ?? null;
    const surfaces = t && t.fdi === fdi ? t.surfaces : [];

    if (this.mode() === 'finding') {
      if (fdi === null) return;
      this.odontogram.add(
        {
          patientId: this.patientId(),
          toothFdi: fdi,
          surfaces,
          kind: 'condition',
          condition: this.condition(),
          procedureCode: null,
          status: this.findingStatus(),
          doctorId: this.auth.doctorId() ?? '',
          planItemId: null,
          note: this.note().trim() || null,
        },
        () => this.finish(),
      );
      return;
    }

    const procedure = this.procedure()!;
    const item = {
      procedureCode: procedure.code,
      toothFdi: fdi,
      surfaces,
      doctorId: this.doctorId()!,
      price: this.price(),
    };
    if (this.planChoice() === NEW_PLAN) {
      this.plans.create(this.newPlanTitle(), (plan) =>
        this.plans.addItem(plan.id, plan.phases[0].id, item, () => this.finish()),
      );
    } else {
      this.plans.addItem(this.planChoice(), this.phaseId()!, item, () => this.finish());
    }
  }

  private finish(): void {
    this.visible.set(false);
    this.done.emit();
  }

  protected procedureName(p: Procedure): string {
    return p.name[this.locale.lang()] || p.name.fr;
  }
}
