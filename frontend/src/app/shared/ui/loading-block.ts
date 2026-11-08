import { Component, computed, input } from '@angular/core';
import { Skeleton } from 'primeng/skeleton';

/** A stack of skeleton rows while a list loads. */
@Component({
  selector: 'app-loading-block',
  imports: [Skeleton],
  template: `
    <div class="flex flex-col gap-2">
      @for (row of rowsArray(); track row) {
        <p-skeleton [height]="height()" borderRadius="8px" />
      }
    </div>
  `,
  host: { class: 'block' },
})
export class LoadingBlock {
  readonly rows = input(4);
  readonly height = input('2.5rem');
  protected readonly rowsArray = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
}
