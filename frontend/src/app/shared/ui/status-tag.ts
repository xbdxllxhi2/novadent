import { Component, computed, input } from '@angular/core';

export type StatusTone = 'neutral' | 'primary' | 'info' | 'success' | 'warn' | 'danger';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-surface-800 text-surface-300',
  primary: 'bg-primary/12 text-primary',
  info: 'bg-info/12 text-info',
  success: 'bg-success/12 text-success',
  warn: 'bg-warn/14 text-warn',
  danger: 'bg-danger/12 text-danger',
};

/** Small pill for statuses. Meaning is always carried by the label, never by colour alone. */
@Component({
  selector: 'app-status-tag',
  template: `<span
    class="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-meta font-medium"
    [class]="classes()"
    ><ng-content
  /></span>`,
  host: { class: 'inline-flex' },
})
export class StatusTag {
  readonly tone = input<StatusTone>('neutral');
  protected readonly classes = computed(() => TONE_CLASSES[this.tone()]);
}
