import { Component } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';

/** Colour key for the odontogram. Swatches read the same runtime tokens as the SVG. */
@Component({
  selector: 'app-odontogram-legend',
  imports: [TranslocoModule],
  template: `
    <ul class="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-surface-400">
      <li class="flex items-center gap-1.5">
        <span
          class="h-3 w-3 rounded-sm"
          style="background: color-mix(in srgb, var(--p-sky-500) 55%, var(--p-surface-900))"
        ></span
        >{{ 'clinicalStatus.existing' | transloco }}
      </li>
      <li class="flex items-center gap-1.5">
        <span
          class="h-3 w-3 rounded-sm"
          style="background: color-mix(in srgb, var(--p-red-500) 65%, var(--p-surface-900))"
        ></span
        >{{ 'conditions.caries' | transloco }}
      </li>
      <li class="flex items-center gap-1.5">
        <span
          class="h-3 w-3 rounded-sm border border-dashed"
          style="border-color: var(--p-red-500); background: repeating-linear-gradient(45deg, var(--p-red-500) 0 1px, transparent 1px 4px)"
        ></span
        >{{ 'clinicalStatus.planned' | transloco }}
      </li>
      <li class="flex items-center gap-1.5">
        <span
          class="h-3 w-3 rounded-sm"
          style="background: color-mix(in srgb, var(--p-orange-500) 70%, var(--p-surface-900))"
        ></span
        >{{ 'clinicalStatus.in-progress' | transloco }}
      </li>
      <li class="flex items-center gap-1.5">
        <span
          class="h-3 w-3 rounded-sm"
          style="background: color-mix(in srgb, var(--p-primary-color) 75%, var(--p-surface-900))"
        ></span
        >{{ 'clinicalStatus.completed' | transloco }}
      </li>
      <li class="flex items-center gap-1.5">
        <span class="flex h-3 w-3 items-center justify-center text-fine font-bold text-surface-500"
          >X</span
        >{{ 'conditions.missing' | transloco }}
      </li>
      <li class="text-surface-500">{{ 'odontogram.shiftHint' | transloco }}</li>
    </ul>
  `,
  host: { class: 'block' },
})
export class OdontogramLegend {}
