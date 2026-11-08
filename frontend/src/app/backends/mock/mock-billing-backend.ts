import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendError } from '../../core/backend-error';
import { BillingBackend } from '../../domain/billing/billing-backend';
import { balanceOf, recomputeInvoice } from '../../domain/billing/invoice-math';
import type {
  Invoice,
  InvoiceFilter,
  InvoiceLine,
  Payment,
  PaymentInput,
  ProductionRow,
  UninvoicedItem,
} from '../../domain/billing/invoice.model';
import { buildProductionReport } from '../../domain/billing/production-report';
import type { TreatmentPlan } from '../../domain/clinical/treatment-plan.model';
import type { Patient } from '../../domain/patients/patient.model';
import type { DateRange } from '../../domain/scheduling/appointment.model';
import { newId } from './ids';
import { respond } from './latency';
import { MockAuthBackend } from './mock-auth-backend';
import { MockDb } from './mock-db';
import type { StoredProcedure } from './seed';

@Injectable({ providedIn: 'root' })
export class MockBillingBackend extends BillingBackend {
  private readonly db = inject(MockDb);
  private readonly auth = inject(MockAuthBackend);

  listInvoices(filter: InvoiceFilter = {}): Observable<Invoice[]> {
    return respond(() => {
      this.auth.require('invoice.read');
      return this.db
        .collection<Invoice>('invoices')
        .where((inv) => {
          if (filter.patientId && inv.patientId !== filter.patientId) return false;
          if (
            filter.status === 'open' &&
            !(inv.status === 'issued' || inv.status === 'partially-paid')
          )
            return false;
          if (filter.status && filter.status !== 'open' && inv.status !== filter.status)
            return false;
          if (filter.from && inv.issuedAt < filter.from) return false;
          if (filter.to && inv.issuedAt >= filter.to) return false;
          return true;
        })
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    });
  }

  getInvoice(id: string): Observable<Invoice> {
    return respond(() => {
      this.auth.require('invoice.read');
      return this.db.collection<Invoice>('invoices').require(id);
    });
  }

  listUninvoicedItems(patientId: string): Observable<UninvoicedItem[]> {
    return respond(() => {
      this.auth.require('invoice.read');
      const items: UninvoicedItem[] = [];
      for (const plan of this.db
        .collection<TreatmentPlan>('treatmentPlans')
        .where((p) => p.patientId === patientId)) {
        for (const ph of plan.phases) {
          for (const it of ph.items) {
            if (it.status === 'completed' && !it.invoiceLineId) {
              items.push({
                planId: plan.id,
                planTitle: plan.title,
                itemId: it.id,
                procedureCode: it.procedureCode,
                toothFdi: it.toothFdi,
                doctorId: it.doctorId,
                price: it.price,
                completedAt: it.completedAt ?? plan.updatedAt,
              });
            }
          }
        }
      }
      return items.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    });
  }

  createInvoice(patientId: string, planItemIds: string[]): Observable<Invoice> {
    return respond(() => {
      const session = this.auth.require('invoice.write');
      this.db.collection<Patient>('patients').require(patientId);
      const wanted = new Set(planItemIds);
      const plans = this.db.collection<TreatmentPlan>('treatmentPlans');
      const procedures = this.db.collection<StoredProcedure>('procedures');
      const lines: InvoiceLine[] = [];
      const touched: TreatmentPlan[] = [];

      for (const plan of plans.where((p) => p.patientId === patientId)) {
        let changed = false;
        for (const ph of plan.phases) {
          for (const it of ph.items) {
            if (!wanted.has(it.id)) continue;
            if (it.status !== 'completed' || it.invoiceLineId) throw new BackendError('conflict');
            const proc = procedures.get(it.procedureCode);
            const line: InvoiceLine = {
              id: newId(),
              planItemId: it.id,
              procedureCode: it.procedureCode,
              description: proc?.name.fr ?? it.procedureCode,
              toothFdi: it.toothFdi,
              doctorId: it.doctorId,
              quantity: 1,
              unitPrice: it.price,
              amount: it.price,
            };
            it.invoiceLineId = line.id;
            lines.push(line);
            changed = true;
          }
        }
        if (changed) touched.push(plan);
      }
      if (lines.length === 0) throw new BackendError('nothingToInvoice');

      const now = new Date();
      const year = now.getFullYear();
      const seq = this.db.nextSequence(`invoice-${year}`);
      const invoice: Invoice = {
        id: newId(),
        number: `INV-${year}-${String(seq).padStart(4, '0')}`,
        patientId,
        issuedAt: now.toISOString(),
        dueAt: null,
        lines,
        total: lines.reduce((s, l) => s + l.amount, 0),
        paid: 0,
        status: 'issued',
        voidedAt: null,
        voidReason: null,
        voidedBy: null,
        createdBy: session.user.id,
      };
      for (const plan of touched) plans.update(plan.id, { ...plan, updatedAt: now.toISOString() });
      return this.db.collection<Invoice>('invoices').insert(invoice);
    });
  }

  voidInvoice(id: string, reason: string): Observable<Invoice> {
    return respond(() => {
      const session = this.auth.require('invoice.void');
      const invoices = this.db.collection<Invoice>('invoices');
      const invoice = invoices.require(id);
      if (invoice.status === 'void') throw new BackendError('invoiceNotVoidable');
      if (invoice.paid > 0) throw new BackendError('invoiceNotVoidable');
      // Release the plan items so they can be invoiced again.
      const plans = this.db.collection<TreatmentPlan>('treatmentPlans');
      const lineIds = new Set(invoice.lines.map((l) => l.id));
      for (const plan of plans.where((p) => p.patientId === invoice.patientId)) {
        let changed = false;
        for (const ph of plan.phases)
          for (const it of ph.items)
            if (it.invoiceLineId && lineIds.has(it.invoiceLineId)) {
              it.invoiceLineId = null;
              changed = true;
            }
        if (changed) plans.update(plan.id, plan);
      }
      const now = new Date().toISOString();
      return invoices.update(id, {
        status: 'void',
        voidedAt: now,
        voidReason: reason.trim() || null,
        voidedBy: session.user.id,
      });
    });
  }

  listPayments(invoiceId: string): Observable<Payment[]> {
    return respond(() => {
      this.auth.require('invoice.read');
      return this.db
        .collection<Payment>('payments')
        .where((p) => p.invoiceId === invoiceId)
        .sort((a, b) => a.paidAt.localeCompare(b.paidAt));
    });
  }

  addPayment(input: PaymentInput): Observable<Payment> {
    return respond(() => {
      const session = this.auth.require('payment.write');
      const invoices = this.db.collection<Invoice>('invoices');
      const invoice = invoices.require(input.invoiceId);
      if (invoice.status === 'void') throw new BackendError('conflict');
      const amount = Math.round(input.amount);
      if (!(amount > 0)) throw new BackendError('validation', { field: 'amount' });
      if (amount > balanceOf(invoice))
        throw new BackendError('paymentExceedsBalance', { balance: balanceOf(invoice) });
      const payments = this.db.collection<Payment>('payments');
      const payment = payments.insert({
        id: newId(),
        invoiceId: input.invoiceId,
        amount,
        method: input.method,
        paidAt: input.paidAt || new Date().toISOString(),
        reference: input.reference?.trim() || null,
        receivedBy: session.user.id,
        voided: false,
      });
      invoices.update(
        invoice.id,
        recomputeInvoice(
          invoice,
          payments.where((p) => p.invoiceId === invoice.id),
        ),
      );
      return payment;
    });
  }

  voidPayment(paymentId: string): Observable<Payment> {
    return respond(() => {
      this.auth.require('payment.void');
      const payments = this.db.collection<Payment>('payments');
      const payment = payments.update(paymentId, { voided: true });
      const invoices = this.db.collection<Invoice>('invoices');
      const invoice = invoices.require(payment.invoiceId);
      invoices.update(
        invoice.id,
        recomputeInvoice(
          invoice,
          payments.where((p) => p.invoiceId === invoice.id),
        ),
      );
      return payment;
    });
  }

  productionReport(range: DateRange): Observable<ProductionRow[]> {
    return respond(() => {
      this.auth.require('report.production');
      return buildProductionReport(
        this.db.collection<Invoice>('invoices').all(),
        this.db.collection<Payment>('payments').all(),
        range,
      );
    });
  }

  outstandingBalance(): Observable<number> {
    return respond(() => {
      this.auth.require('invoice.read');
      return this.db
        .collection<Invoice>('invoices')
        .all()
        .reduce((sum, inv) => sum + balanceOf(inv), 0);
    });
  }
}
