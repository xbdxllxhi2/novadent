import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleStore } from '../../core/i18n/locale.store';
import type { LocalizedText } from '../../domain/clinical/procedure.model';

/** Picks the active language out of a LocalizedText, falling back to French. */
@Pipe({ name: 'localized', pure: false })
export class LocalizedPipe implements PipeTransform {
  private readonly locale = inject(LocaleStore);

  transform(value: LocalizedText | null | undefined): string {
    if (!value) return '';
    return value[this.locale.lang()] || value.fr || value.en || value.ar || '';
  }
}
