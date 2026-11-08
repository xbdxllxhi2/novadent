import { Component, input } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { Tooltip } from 'primeng/tooltip';
import type { MedicalAlert } from '../../domain/patients/patient.model';
import { StatusTag } from '../../shared/ui/status-tag';

/** Medical alert badges. Severity sets the tone; the label always says what it is. */
@Component({
  selector: 'app-medical-alerts',
  imports: [TranslocoModule, Tooltip, StatusTag],
  template: `
    @for (alert of alerts(); track alert.id) {
      <app-status-tag
        [tone]="
          alert.severity === 'danger' ? 'danger' : alert.severity === 'warn' ? 'warn' : 'info'
        "
        [pTooltip]="'alerts.' + alert.kind | transloco"
        tooltipPosition="top"
      >
        <i
          class="pi text-fine"
          [class.pi-exclamation-triangle]="alert.severity === 'danger'"
          [class.pi-info-circle]="alert.severity !== 'danger'"
        ></i>
        {{ alert.label }}
      </app-status-tag>
    } @empty {
      @if (showEmpty()) {
        <span class="text-caption text-surface-400">{{ 'patients.noAlerts' | transloco }}</span>
      }
    }
  `,
  host: { class: 'inline-flex flex-wrap items-center gap-1.5' },
})
export class MedicalAlerts {
  readonly alerts = input.required<MedicalAlert[]>();
  readonly showEmpty = input(false);
}
