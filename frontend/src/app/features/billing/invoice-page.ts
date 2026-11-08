import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Textarea } from 'primeng/textarea';
import { AuthStore } from '../../core/auth/auth.store';
import { HasPermission } from '../../core/auth/has-permission.directive';
import { BillingStore } from '../../domain/billing/billing.store';
import type { Payment } from '../../domain/billing/invoice.model';
import { ProceduresStore } from '../../domain/clinical/procedures.store';
import { PatientNamesStore } from '../../domain/patients/patient-names.store';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { LoadingBlock } from '../../shared/ui/loading-block';
import { MoneyPipe } from '../../shared/ui/money.pipe';
import { PageHeader } from '../../shared/ui/page-header';
import { PatientName } from '../../shared/ui/patient-name';
import { StatusTag } from '../../shared/ui/status-tag';
import { invoiceTone } from './invoice-tone';
import { PaymentDialog } from './payment-dialog';

@Component({
  selector: 'app-invoice-page',
  imports: [
    FormsModule,
    RouterLink,
    TranslocoModule,
    Button,
    Dialog,
    TableModule,
    Textarea,
    HasPermission,
    AppDatePipe,
    KpiTile,
    LoadingBlock,
    MoneyPipe,
    PageHeader,
    PatientName,
    StatusTag,
    PaymentDialog,
  ],
  templateUrl: './invoice-page.html',
  host: { class: 'block' },
})
export class InvoicePage {
  protected readonly store = inject(BillingStore);
  protected readonly patients = inject(PatientNamesStore);
  protected readonly staff = inject(StaffStore);
  protected readonly procedures = inject(ProceduresStore);
  protected readonly auth = inject(AuthStore);
  private readonly confirm = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);

  readonly id = input.required<string>();

  protected readonly paymentOpen = signal(false);
  protected readonly voidOpen = signal(false);
  protected readonly voidReason = signal('');
  protected readonly tone = invoiceTone;

  protected readonly patient = computed(() => this.patients.get(this.store.invoice()?.patientId));
  protected readonly canPay = computed(
    () =>
      this.auth.can('payment.write') &&
      this.store.invoice()?.status !== 'void' &&
      this.store.balance() > 0,
  );
  protected readonly canVoid = computed(
    () =>
      this.auth.can('invoice.void') &&
      this.store.invoice()?.status !== 'void' &&
      (this.store.invoice()?.paid ?? 0) === 0,
  );

  constructor() {
    effect(() => this.store.loadInvoice(this.id()));
    effect(() => {
      const inv = this.store.invoice();
      if (inv) this.patients.ensure([inv.patientId]);
    });
    if (!this.procedures.loaded()) this.procedures.load();
  }

  protected submitVoid(): void {
    const inv = this.store.invoice();
    if (!inv) return;
    this.store.voidInvoice(inv.id, this.voidReason(), () => {
      this.voidOpen.set(false);
      this.voidReason.set('');
    });
  }

  protected askVoidPayment(payment: Payment): void {
    this.confirm.confirm({
      header: this.transloco.translate('billing.voidPayment'),
      message: this.transloco.translate('billing.voidPaymentConfirm'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.store.voidPayment(payment.id),
    });
  }

  protected userName(userId: string): string {
    return this.staff.users().find((u) => u.id === userId)?.displayName ?? '';
  }
}
