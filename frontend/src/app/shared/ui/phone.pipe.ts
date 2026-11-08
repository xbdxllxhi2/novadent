import { Pipe, PipeTransform } from '@angular/core';
import { formatPhone } from '../../core/i18n/formats';

@Pipe({ name: 'phone' })
export class PhonePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatPhone(value);
  }
}
