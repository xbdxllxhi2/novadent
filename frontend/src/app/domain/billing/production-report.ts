import type { DateRange } from '../scheduling/appointment.model';
import type { Invoice, Payment, ProductionRow } from './invoice.model';

/**
 * Production per doctor over a range of invoice dates. `invoiced` sums the doctor's line amounts
 * on non-void invoices; `collected` attributes each invoice's non-voided payments to its doctors
 * pro rata by line amount, so a half-paid invoice shared by two doctors credits each with half of
 * their share.
 */
export function buildProductionReport(
  invoices: Invoice[],
  payments: Payment[],
  range: DateRange,
): ProductionRow[] {
  const rows = new Map<string, ProductionRow>();
  const paidByInvoice = new Map<string, number>();
  for (const p of payments) {
    if (p.voided) continue;
    paidByInvoice.set(p.invoiceId, (paidByInvoice.get(p.invoiceId) ?? 0) + p.amount);
  }

  for (const inv of invoices) {
    if (inv.status === 'void') continue;
    if (inv.issuedAt < range.from || inv.issuedAt >= range.to) continue;
    const paid = paidByInvoice.get(inv.id) ?? 0;
    const total = inv.total || 1;
    const doctorsOnInvoice = new Set<string>();

    for (const line of inv.lines) {
      const row = rows.get(line.doctorId) ?? {
        doctorId: line.doctorId,
        invoiceCount: 0,
        invoiced: 0,
        collected: 0,
      };
      row.invoiced += line.amount;
      row.collected += Math.round((paid * line.amount) / total);
      rows.set(line.doctorId, row);
      doctorsOnInvoice.add(line.doctorId);
    }
    for (const doctorId of doctorsOnInvoice) {
      const row = rows.get(doctorId);
      if (row) row.invoiceCount += 1;
    }
  }

  return [...rows.values()].sort((a, b) => b.invoiced - a.invoiced);
}
