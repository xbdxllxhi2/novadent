import type { Invoice, InvoiceLine, InvoiceStatus, Payment } from './invoice.model';

export function lineAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice);
}

export function invoiceTotal(lines: Pick<InvoiceLine, 'amount'>[]): number {
  return lines.reduce((sum, l) => sum + l.amount, 0);
}

export function paidTotal(payments: Pick<Payment, 'amount' | 'voided'>[]): number {
  return payments.filter((p) => !p.voided).reduce((sum, p) => sum + p.amount, 0);
}

export function balanceOf(invoice: Pick<Invoice, 'total' | 'paid' | 'status'>): number {
  return invoice.status === 'void' ? 0 : Math.max(0, invoice.total - invoice.paid);
}

export function statusFor(total: number, paid: number, voided: boolean): InvoiceStatus {
  if (voided) return 'void';
  if (paid <= 0) return 'issued';
  if (paid >= total) return 'paid';
  return 'partially-paid';
}

/** Recomputes the denormalized fields from lines and payments. */
export function recomputeInvoice(invoice: Invoice, payments: Payment[]): Invoice {
  const total = invoiceTotal(invoice.lines);
  const paid = paidTotal(payments.filter((p) => p.invoiceId === invoice.id));
  return { ...invoice, total, paid, status: statusFor(total, paid, invoice.status === 'void') };
}
