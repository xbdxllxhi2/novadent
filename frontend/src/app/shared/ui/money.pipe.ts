import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { formatMoney } from '../../core/i18n/formats';
import { LocaleStore } from '../../core/i18n/locale.store';

/** Integer MRU with grouping and the localized unit. Impure so it follows language changes. */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly locale = inject(LocaleStore);
  private readonly transloco = inject(TranslocoService);

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '';
    return formatMoney(value, this.locale.locale(), this.transloco.translate('common.currency'));
  }
}
