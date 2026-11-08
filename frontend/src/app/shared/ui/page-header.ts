import { Component, input } from '@angular/core';

/** Page title strip. Project action buttons as content. */
@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.html',
  host: { class: 'block' },
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
}
