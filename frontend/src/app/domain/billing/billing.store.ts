import { Injectable, computed, inject, signal } from '@angular/core';
import { NotifyService } from '../../core/notify/notify.service';
import type { DateRange } from '../scheduling/appointment.model';
import { BillingBackend } from './billing-backend';
import { balanceOf } from './invoice-math';
import type {
  Invoice,
  InvoiceFilter,
  Payment,
  PaymentInput,
  ProductionRow,
  UninvoicedItem,
} from './invoice.model';

@Injectable({ providedIn: 'root' })
export class BillingStore {
  private readonly backend = inject(BillingBackend);
  private readonly notify = inject(NotifyService);

  // List
  readonly filter = signal<InvoiceFilter>({});
  readonly invoices = signal<Invoice[]>([]);
  readonly loading = signal(false);

  // Detail
  readonly invoice = signal<Invoice | null>(null);
  readonly payments = signal<Payment[]>([]);
  readonly invoiceLoading = signal(false);
  readonly saving = signal(false);

  // Invoiceable work
  readonly uninvoiced = signal<UninvoicedItem[]>([]);

  // Report
  readonly report = signal<ProductionRow[]>([]);
  readonly reportLoading = signal(false);
  readonly outstanding = signal<number | null>(null);

  readonly balance = computed(() => {
    const inv = this.invoice();
    return inv ? balanceOf(inv) : 0;
  });

  load(filter: InvoiceFilter = this.filter()): void {
    this.filter.set(filter);
    this.loading.set(true);
    this.backend.listInvoices(filter).subscribe({
      next: (list) => {
        this.invoices.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.failure(e);
      },
    });
  }

  loadInvoice(id: string): void {
    if (this.invoice()?.id !== id) {
      this.invoice.set(null);
      this.payments.set([]);
    }
    this.invoiceLoading.set(true);
    this.backend.getInvoice(id).subscribe({
      next: (inv) => {
        this.invoice.set(inv);
        this.invoiceLoading.set(false);
      },
      error: (e) => {
        this.invoiceLoading.set(false);
        this.notify.failure(e);
      },
    });
    this.backend
      .listPayments(id)
      .subscribe({ next: (p) => this.payments.set(p), error: (e) => this.notify.failure(e) });
  }

  loadUninvoiced(patientId: string): void {
    this.backend.listUninvoicedItems(patientId).subscribe({
      next: (items) => this.uninvoiced.set(items),
      error: (e) => this.notify.failure(e),
    });
  }

  createInvoice(patientId: string, planItemIds: string[], done?: (invoice: Invoice) => void): void {
    this.saving.set(true);
    this.backend.createInvoice(patientId, planItemIds).subscribe({
      next: (inv) => {
        this.saving.set(false);
        this.invoices.update((list) => [inv, ...list]);
        this.uninvoiced.update((items) => items.filter((i) => !planItemIds.includes(i.itemId)));
        this.notify.success('notify.invoiceCreated', { number: inv.number });
        done?.(inv);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  voidInvoice(id: string, reason: string, done?: () => void): void {
    this.saving.set(true);
    this.backend.voidInvoice(id, reason).subscribe({
      next: (inv) => {
        this.saving.set(false);
        this.replace(inv);
        this.notify.success('notify.invoiceVoided');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  addPayment(input: PaymentInput, done?: () => void): void {
    this.saving.set(true);
    this.backend.addPayment(input).subscribe({
      next: (payment) => {
        this.saving.set(false);
        this.payments.update((list) => [...list, payment]);
        this.loadInvoice(input.invoiceId);
        this.notify.success('notify.paymentRecorded');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  voidPayment(paymentId: string): void {
    const invoiceId = this.invoice()?.id;
    this.backend.voidPayment(paymentId).subscribe({
      next: () => {
        if (invoiceId) this.loadInvoice(invoiceId);
        this.notify.success('notify.paymentVoided');
      },
      error: (e) => this.notify.failure(e),
    });
  }

  loadReport(range: DateRange): void {
    this.reportLoading.set(true);
    this.backend.productionReport(range).subscribe({
      next: (rows) => {
        this.report.set(rows);
        this.reportLoading.set(false);
      },
      error: (e) => {
        this.reportLoading.set(false);
        this.notify.failure(e);
      },
    });
  }

  loadOutstanding(): void {
    this.backend
      .outstandingBalance()
      .subscribe({ next: (v) => this.outstanding.set(v), error: () => this.outstanding.set(null) });
  }

  private replace(inv: Invoice): void {
    if (this.invoice()?.id === inv.id) this.invoice.set(inv);
    this.invoices.update((list) => list.map((x) => (x.id === inv.id ? inv : x)));
  }
}
