import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { BillingStore } from '../../domain/billing/billing.store';
import { Invoice, PAYMENT_METHODS, PaymentMethod } from '../../domain/billing/invoice.model';

@Component({
  selector: 'app-payment-dialog',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    DatePicker,
    Dialog,
    InputNumber,
    InputText,
    Select,
  ],
  templateUrl: './payment-dialog.html',
})
export class PaymentDialog {
  protected readonly store = inject(BillingStore);

  readonly visible = model(false);
  readonly invoice = input.required<Invoice>();
  readonly balance = input.required<number>();

  protected readonly amount = signal<number>(0);
  protected readonly method = signal<PaymentMethod>('cash');
  protected readonly paidAt = signal<Date>(new Date());
  protected readonly reference = signal('');
  protected readonly methods = PAYMENT_METHODS;
  protected readonly valid = computed(() => this.amount() > 0 && this.amount() <= this.balance());

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.amount.set(this.balance());
        this.method.set('cash');
        this.paidAt.set(new Date());
        this.reference.set('');
      }
    });
  }

  protected submit(): void {
    if (!this.valid()) return;
    this.store.addPayment(
      {
        invoiceId: this.invoice().id,
        amount: this.amount(),
        method: this.method(),
        paidAt: this.paidAt().toISOString(),
        reference: this.reference().trim() || null,
      },
      () => this.visible.set(false),
    );
  }
}
