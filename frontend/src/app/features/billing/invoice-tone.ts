import type { InvoiceStatus } from '../../domain/billing/invoice.model';
import type { StatusTone } from '../../shared/ui/status-tag';

export function invoiceTone(status: InvoiceStatus): StatusTone {
  switch (status) {
    case 'issued':
      return 'warn';
    case 'partially-paid':
      return 'info';
    case 'paid':
      return 'success';
    case 'void':
      return 'neutral';
  }
}
