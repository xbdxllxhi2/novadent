import { describe, expect, it } from 'vitest';
import type { Invoice, InvoiceLine, Payment } from './invoice.model';
import { buildProductionReport } from './production-report';

function line(doctorId: string, amount: number): InvoiceLine {
  return {
    id: `${doctorId}-${amount}`,
    planItemId: null,
    procedureCode: 'X',
    description: '',
    toothFdi: null,
    doctorId,
    quantity: 1,
    unitPrice: amount,
    amount,
  };
}
function invoice(
  id: string,
  issuedAt: string,
  lines: InvoiceLine[],
  status: Invoice['status'] = 'issued',
): Invoice {
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return {
    id,
    number: id,
    patientId: 'p',
    issuedAt,
    dueAt: null,
    lines,
    total,
    paid: 0,
    status,
    voidedAt: null,
    voidReason: null,
    voidedBy: null,
    createdBy: 'u',
  };
}

describe('buildProductionReport', () => {
  const range = { from: '2026-11-01T00:00:00.000Z', to: '2026-12-01T00:00:00.000Z' };

  it('sums invoiced per doctor and attributes payments pro rata', () => {
    const invoices = [
      invoice('a', '2026-11-05T10:00:00.000Z', [line('d1', 3000), line('d2', 1000)]),
    ];
    const payments: Payment[] = [
      {
        id: 'p',
        invoiceId: 'a',
        amount: 2000,
        method: 'cash',
        paidAt: '',
        reference: null,
        receivedBy: 'u',
        voided: false,
      },
    ];
    const rows = buildProductionReport(invoices, payments, range);
    expect(rows).toEqual([
      { doctorId: 'd1', invoiceCount: 1, invoiced: 3000, collected: 1500 },
      { doctorId: 'd2', invoiceCount: 1, invoiced: 1000, collected: 500 },
    ]);
  });

  it('ignores void invoices, voided payments and dates outside the range', () => {
    const invoices = [
      invoice('a', '2026-11-05T10:00:00.000Z', [line('d1', 1000)]),
      invoice('b', '2026-11-06T10:00:00.000Z', [line('d1', 9000)], 'void'),
      invoice('c', '2026-10-30T10:00:00.000Z', [line('d1', 7000)]),
    ];
    const payments: Payment[] = [
      {
        id: 'p',
        invoiceId: 'a',
        amount: 1000,
        method: 'cash',
        paidAt: '',
        reference: null,
        receivedBy: 'u',
        voided: true,
      },
    ];
    expect(buildProductionReport(invoices, payments, range)).toEqual([
      { doctorId: 'd1', invoiceCount: 1, invoiced: 1000, collected: 0 },
    ]);
  });
});
