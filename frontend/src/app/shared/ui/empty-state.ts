import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
  host: { class: 'block' },
})
export class EmptyState {
  /** PrimeIcons name without the `pi-` prefix. */
  readonly icon = input<string>('inbox');
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
