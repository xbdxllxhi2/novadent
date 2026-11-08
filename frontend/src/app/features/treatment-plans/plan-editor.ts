import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Menu } from 'primeng/menu';
import { ProgressBar } from 'primeng/progressbar';
import { AuthStore } from '../../core/auth/auth.store';
import { canEditChartEntry } from '../../core/auth/clinical-policy';
import { formatSurfaces } from '../../domain/clinical/fdi';
import { ProceduresStore } from '../../domain/clinical/procedures.store';
import {
  PlanItem,
  PlanItemStatus,
  PlanPhase,
  PlanStatus,
  TreatmentPlan,
  planProgress,
  planTotal,
} from '../../domain/clinical/treatment-plan.model';
import { TreatmentPlansStore } from '../../domain/clinical/treatment-plans.store';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { LocalizedPipe } from '../../shared/ui/localized.pipe';
import { MoneyPipe } from '../../shared/ui/money.pipe';
import { StatusTag, StatusTone } from '../../shared/ui/status-tag';

const PLAN_TONES: Record<PlanStatus, StatusTone> = {
  draft: 'neutral',
  proposed: 'info',
  accepted: 'primary',
  completed: 'success',
  cancelled: 'neutral',
};
const ITEM_TONES: Record<PlanItemStatus, StatusTone> = {
  planned: 'neutral',
  'in-progress': 'warn',
  completed: 'success',
  cancelled: 'neutral',
};

/** One treatment plan: phases, items, totals, and the status workflow. */
@Component({
  selector: 'app-plan-editor',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    InputText,
    Menu,
    ProgressBar,
    AppDatePipe,
    LocalizedPipe,
    MoneyPipe,
    StatusTag,
  ],
  templateUrl: './plan-editor.html',
  host: { class: 'block rounded-xl border border-surface-700 bg-surface-900' },
})
export class PlanEditor {
  protected readonly store = inject(TreatmentPlansStore);
  protected readonly procedures = inject(ProceduresStore);
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);
  private readonly confirm = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);

  readonly plan = input.required<TreatmentPlan>();
  readonly addItem = output<{ planId: string; phaseId: string }>();

  protected readonly editingTitle = signal(false);
  protected readonly titleDraft = signal('');
  protected readonly newPhaseTitle = signal('');
  protected readonly menuItem = signal<PlanItem | null>(null);

  protected readonly total = computed(() => planTotal(this.plan()));
  protected readonly progress = computed(() => planProgress(this.plan()));
  protected readonly percent = computed(() => {
    const p = this.progress();
    return p.total === 0 ? 0 : Math.round((p.done / p.total) * 100);
  });
  protected readonly canWrite = computed(() => this.auth.can('plan.write'));
  protected readonly canAccept = computed(() => this.auth.can('plan.accept'));
  protected readonly editable = computed(
    () =>
      this.canWrite() && this.plan().status !== 'completed' && this.plan().status !== 'cancelled',
  );
  protected readonly surfaces = formatSurfaces;
  protected readonly planTone = (s: PlanStatus) => PLAN_TONES[s];
  protected readonly itemTone = (s: PlanItemStatus) => ITEM_TONES[s];

  protected readonly itemMenu = computed<MenuItem[]>(() => {
    const item = this.menuItem();
    return item ? this.actionsFor(item) : [];
  });

  /** True when the row has at least one action, so no empty menus are offered. */
  protected hasActions(item: PlanItem): boolean {
    return this.actionsFor(item).length > 0;
  }

  private actionsFor(item: PlanItem): MenuItem[] {
    const plan = this.plan();
    const canTreat = canEditChartEntry(this.auth.session(), item);
    const items: MenuItem[] = [];
    if (item.status === 'planned' && canTreat)
      items.push({
        label: this.transloco.translate('plans.markInProgress'),
        icon: 'pi pi-play',
        command: () => this.store.setItemStatus(plan.id, item.id, 'in-progress'),
      });
    if ((item.status === 'planned' || item.status === 'in-progress') && canTreat)
      items.push({
        label: this.transloco.translate('plans.markCompleted'),
        icon: 'pi pi-check',
        command: () => this.store.setItemStatus(plan.id, item.id, 'completed'),
      });
    if (item.status === 'in-progress' && canTreat)
      items.push({
        label: this.transloco.translate('plans.markPlanned'),
        icon: 'pi pi-undo',
        command: () => this.store.setItemStatus(plan.id, item.id, 'planned'),
      });
    if (item.status !== 'completed' && this.canWrite() && !item.invoiceLineId) {
      items.push({ separator: true });
      items.push({
        label: this.transloco.translate('plans.cancelItem'),
        icon: 'pi pi-ban',
        command: () => this.store.setItemStatus(plan.id, item.id, 'cancelled'),
      });
      items.push({
        label: this.transloco.translate('plans.removeItem'),
        icon: 'pi pi-trash',
        styleClass: 'text-danger',
        command: () => this.store.removeItem(plan.id, item.id),
      });
    }
    return items;
  }

  protected phaseTotal(phase: PlanPhase): number {
    return phase.items.filter((i) => i.status !== 'cancelled').reduce((s, i) => s + i.price, 0);
  }

  protected startRename(): void {
    this.titleDraft.set(this.plan().title);
    this.editingTitle.set(true);
  }

  protected saveRename(): void {
    this.editingTitle.set(false);
    if (this.titleDraft().trim() && this.titleDraft().trim() !== this.plan().title)
      this.store.rename(this.plan().id, this.titleDraft());
  }

  protected addPhase(): void {
    this.store.addPhase(this.plan().id, this.newPhaseTitle());
    this.newPhaseTitle.set('');
  }

  protected removePhase(phase: PlanPhase): void {
    this.confirm.confirm({
      header: this.transloco.translate('plans.removePhase'),
      message: phase.title,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.store.removePhase(this.plan().id, phase.id),
    });
  }

  protected setStatus(status: PlanStatus): void {
    if (status === 'cancelled') {
      this.confirm.confirm({
        header: this.transloco.translate('plans.cancelPlan'),
        message: this.plan().title,
        icon: 'pi pi-exclamation-triangle',
        accept: () => this.store.setStatus(this.plan().id, 'cancelled'),
      });
      return;
    }
    this.store.setStatus(this.plan().id, status);
  }

  protected updatePrice(item: PlanItem, value: number | null): void {
    const price = Math.max(0, Math.round(value ?? 0));
    if (price !== item.price) this.store.updateItem(this.plan().id, item.id, { price });
  }
}
