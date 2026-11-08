import { describe, expect, it } from 'vitest';
import type { Invoice, Payment } from './invoice.model';
import {
  balanceOf,
  invoiceTotal,
  lineAmount,
  paidTotal,
  recomputeInvoice,
  statusFor,
} from './invoice-math';

function invoice(total: number, paid = 0, status: Invoice['status'] = 'issued'): Invoice {
  return {
    id: 'i',
    number: 'INV-2026-0001',
    patientId: 'p',
    issuedAt: '',
    dueAt: null,
    lines: [
      {
        id: 'l',
        planItemId: null,
        procedureCode: 'X',
        description: '',
        toothFdi: null,
        doctorId: 'd',
        quantity: 1,
        unitPrice: total,
        amount: total,
      },
    ],
    total,
    paid,
    status,
    voidedAt: null,
    voidReason: null,
    voidedBy: null,
    createdBy: 'u',
  };
}
function payment(amount: number, voided = false): Payment {
  return {
    id: `p${amount}`,
    invoiceId: 'i',
    amount,
    method: 'cash',
    paidAt: '',
    reference: null,
    receivedBy: 'u',
    voided,
  };
}

describe('invoice math', () => {
  it('rounds line amounts and sums totals', () => {
    expect(lineAmount(3, 1000.4)).toBe(3001);
    expect(invoiceTotal([{ amount: 100 }, { amount: 250 }])).toBe(350);
    expect(paidTotal([payment(100), payment(50, true)])).toBe(100);
  });

  it('derives status from paid versus total', () => {
    expect(statusFor(1000, 0, false)).toBe('issued');
    expect(statusFor(1000, 400, false)).toBe('partially-paid');
    expect(statusFor(1000, 1000, false)).toBe('paid');
    expect(statusFor(1000, 0, true)).toBe('void');
  });

  it('balance is never negative and zero on void', () => {
    expect(balanceOf(invoice(1000, 400))).toBe(600);
    expect(balanceOf(invoice(1000, 1200))).toBe(0);
    expect(balanceOf(invoice(1000, 0, 'void'))).toBe(0);
  });

  it('recomputes denormalized fields from payments', () => {
    const next = recomputeInvoice(invoice(5000), [payment(2000), payment(3000, true)]);
    expect(next.paid).toBe(2000);
    expect(next.status).toBe('partially-paid');
  });
});
