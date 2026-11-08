import { Pipe, PipeTransform, inject } from '@angular/core';
import { DateStyle, formatDate } from '../../core/i18n/formats';
import { LocaleStore } from '../../core/i18n/locale.store';

/** Locale-aware date formatting; impure so it follows language changes. */
@Pipe({ name: 'appDate', pure: false })
export class AppDatePipe implements PipeTransform {
  private readonly locale = inject(LocaleStore);

  transform(value: string | Date | null | undefined, style: DateStyle = 'short'): string {
    return formatDate(value, this.locale.locale(), style);
  }
}
