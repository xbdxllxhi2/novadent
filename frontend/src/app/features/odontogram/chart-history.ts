import { Component, inject, input, output } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { AuthStore } from '../../core/auth/auth.store';
import { canEditChartEntry } from '../../core/auth/clinical-policy';
import { formatSurfaces } from '../../domain/clinical/fdi';
import { ProceduresStore } from '../../domain/clinical/procedures.store';
import type { ChartEntry, ClinicalStatus } from '../../domain/clinical/tooth.model';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { LocalizedPipe } from '../../shared/ui/localized.pipe';
import { StatusTag, StatusTone } from '../../shared/ui/status-tag';

const TONES: Record<ClinicalStatus, StatusTone> = {
  existing: 'info',
  planned: 'danger',
  'in-progress': 'warn',
  completed: 'primary',
};

/** Dated list of chart entries. Void is only offered to the recording doctor or chart managers. */
@Component({
  selector: 'app-chart-history',
  imports: [TranslocoModule, Button, AppDatePipe, EmptyState, LocalizedPipe, StatusTag],
  templateUrl: './chart-history.html',
  host: { class: 'block' },
})
export class ChartHistory {
  protected readonly staff = inject(StaffStore);
  protected readonly procedures = inject(ProceduresStore);
  private readonly auth = inject(AuthStore);
  private readonly confirm = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);

  readonly entries = input.required<ChartEntry[]>();
  /** Highlighted tooth, if any. */
  readonly focusFdi = input<number | null>(null);
  readonly voided = output<string>();

  protected readonly tone = (s: ClinicalStatus) => TONES[s];
  protected readonly surfaces = formatSurfaces;

  protected canEdit(entry: ChartEntry): boolean {
    return canEditChartEntry(this.auth.session(), entry);
  }

  protected askVoid(entry: ChartEntry): void {
    this.confirm.confirm({
      header: this.transloco.translate('odontogram.void'),
      message: this.transloco.translate('odontogram.voidConfirm'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.voided.emit(entry.id),
    });
  }
}
