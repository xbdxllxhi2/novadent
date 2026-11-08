import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { AuthStore } from '../../core/auth/auth.store';
import { BillingBackend } from '../../domain/billing/billing-backend';
import { balanceOf } from '../../domain/billing/invoice-math';
import type { Invoice } from '../../domain/billing/invoice.model';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { MoneyPipe } from '../../shared/ui/money.pipe';
import { StatusTag } from '../../shared/ui/status-tag';
import { CreateInvoiceDialog } from '../billing/create-invoice-dialog';
import { invoiceTone } from '../billing/invoice-tone';
import { injectPatientId } from './patient-route';

@Component({
  selector: 'app-patient-invoices-tab',
  imports: [
    TranslocoModule,
    Button,
    TableModule,
    AppDatePipe,
    EmptyState,
    MoneyPipe,
    StatusTag,
    CreateInvoiceDialog,
  ],
  templateUrl: './patient-invoices-tab.html',
  host: { class: 'block' },
})
export class PatientInvoicesTab {
  protected readonly auth = inject(AuthStore);
  private readonly billing = inject(BillingBackend);
  private readonly router = inject(Router);
  protected readonly patientId = injectPatientId();

  protected readonly invoices = signal<Invoice[]>([]);
  protected readonly loading = signal(true);
  protected readonly createOpen = signal(false);
  protected readonly tone = invoiceTone;
  protected readonly balance = balanceOf;
  protected readonly outstanding = computed(() =>
    this.invoices().reduce((s, i) => s + balanceOf(i), 0),
  );

  constructor() {
    effect(() => {
      const id = this.patientId();
      if (id) this.reload(id);
    });
  }

  protected open(inv: Invoice): void {
    void this.router.navigate(['/billing/invoices', inv.id]);
  }

  protected created(inv: Invoice): void {
    void this.router.navigate(['/billing/invoices', inv.id]);
  }

  private reload(id: string): void {
    this.loading.set(true);
    this.billing.listInvoices({ patientId: id }).subscribe({
      next: (list) => {
        this.invoices.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
