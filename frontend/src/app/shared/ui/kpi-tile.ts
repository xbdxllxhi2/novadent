import { Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-tile',
  templateUrl: './kpi-tile.html',
  host: { class: 'block' },
})
export class KpiTile {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly icon = input<string | null>(null);
}
