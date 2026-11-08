import { Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { BillingStore } from '../../domain/billing/billing.store';
import type { Invoice } from '../../domain/billing/invoice.model';
import { ProceduresStore } from '../../domain/clinical/procedures.store';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { LocalizedPipe } from '../../shared/ui/localized.pipe';
import { MoneyPipe } from '../../shared/ui/money.pipe';

/** Pick completed, uninvoiced plan items for a patient and issue one invoice. */
@Component({
  selector: 'app-create-invoice-dialog',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    Checkbox,
    Dialog,
    AppDatePipe,
    LocalizedPipe,
    MoneyPipe,
  ],
  templateUrl: './create-invoice-dialog.html',
})
export class CreateInvoiceDialog {
  protected readonly store = inject(BillingStore);
  protected readonly procedures = inject(ProceduresStore);
  protected readonly staff = inject(StaffStore);

  readonly visible = model(false);
  readonly patientId = input.required<string>();
  readonly created = output<Invoice>();

  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly total = computed(() =>
    this.store
      .uninvoiced()
      .filter((i) => this.selected().has(i.itemId))
      .reduce((s, i) => s + i.price, 0),
  );

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.store.loadUninvoiced(this.patientId());
        if (!this.procedures.loaded()) this.procedures.load();
      }
    });
    // Select everything by default once the list arrives.
    effect(() => {
      const items = this.store.uninvoiced();
      if (this.visible()) this.selected.set(new Set(items.map((i) => i.itemId)));
    });
  }

  protected toggle(itemId: string, checked: boolean): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

  protected submit(): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;
    this.store.createInvoice(this.patientId(), ids, (inv) => {
      this.visible.set(false);
      this.created.emit(inv);
    });
  }
}
