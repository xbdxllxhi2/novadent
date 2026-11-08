import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { DatePicker } from 'primeng/datepicker';
import { SelectButton } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { BillingStore } from '../../domain/billing/billing.store';
import { balanceOf } from '../../domain/billing/invoice-math';
import type { Invoice, InvoiceFilter } from '../../domain/billing/invoice.model';
import { PatientNamesStore } from '../../domain/patients/patient-names.store';
import { addDays, startOfDay } from '../../domain/scheduling/slots';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { MoneyPipe } from '../../shared/ui/money.pipe';
import { PageHeader } from '../../shared/ui/page-header';
import { PatientName } from '../../shared/ui/patient-name';
import { StatusTag } from '../../shared/ui/status-tag';
import { invoiceTone } from './invoice-tone';

type StatusFilter = 'all' | 'open' | 'paid' | 'void';

@Component({
  selector: 'app-invoices-page',
  imports: [
    FormsModule,
    TranslocoModule,
    DatePicker,
    SelectButton,
    TableModule,
    AppDatePipe,
    EmptyState,
    MoneyPipe,
    PageHeader,
    PatientName,
    StatusTag,
  ],
  templateUrl: './invoices-page.html',
  host: { class: 'block' },
})
export class InvoicesPage implements OnInit {
  protected readonly store = inject(BillingStore);
  protected readonly patients = inject(PatientNamesStore);
  private readonly router = inject(Router);

  protected readonly status = signal<StatusFilter>('open');
  protected readonly range = signal<Date[] | null>(null);
  protected readonly statusOptions: { value: StatusFilter; labelKey: string }[] = [
    { value: 'open', labelKey: 'billing.filterOpen' },
    { value: 'paid', labelKey: 'invoiceStatus.paid' },
    { value: 'void', labelKey: 'invoiceStatus.void' },
    { value: 'all', labelKey: 'billing.filterAll' },
  ];
  protected readonly tone = invoiceTone;
  protected readonly balance = balanceOf;
  protected readonly totals = computed(() => {
    const list = this.store.invoices();
    return {
      total: list.reduce((s, i) => s + (i.status === 'void' ? 0 : i.total), 0),
      balance: list.reduce((s, i) => s + balanceOf(i), 0),
    };
  });

  constructor() {
    effect(() => this.patients.ensure(this.store.invoices().map((i) => i.patientId)));
  }

  ngOnInit(): void {
    this.reload();
  }

  protected setStatus(value: StatusFilter): void {
    this.status.set(value);
    this.reload();
  }

  protected setRange(value: Date[] | null): void {
    this.range.set(value);
    if (!value || (value[0] && value[1]) || value.every((d) => !d)) this.reload();
  }

  protected open(invoice: Invoice): void {
    void this.router.navigate(['/billing/invoices', invoice.id]);
  }

  private reload(): void {
    const filter: InvoiceFilter = {};
    const status = this.status();
    if (status !== 'all') filter.status = status;
    const r = this.range();
    if (r && r[0]) filter.from = startOfDay(r[0]).toISOString();
    if (r && r[1]) filter.to = addDays(startOfDay(r[1]), 1).toISOString();
    this.store.load(filter);
  }
}
