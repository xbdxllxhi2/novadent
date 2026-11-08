import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { BillingBackend } from '../../domain/billing/billing-backend';
import { balanceOf } from '../../domain/billing/invoice-math';
import type { Invoice, Payment } from '../../domain/billing/invoice.model';
import type { Patient } from '../../domain/patients/patient.model';
import { PatientsBackend } from '../../domain/patients/patients-backend';
import { StaffBackend } from '../../domain/staff/staff-backend';
import type { ClinicSettings } from '../../domain/staff/staff.model';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { MoneyPipe } from '../../shared/ui/money.pipe';
import { PhonePipe } from '../../shared/ui/phone.pipe';

/**
 * Printable invoice outside the app shell. Printing is a route (not window.open) so the future
 * desktop shell can load it directly for silent printing.
 */
@Component({
  selector: 'app-invoice-print-page',
  imports: [TranslocoModule, Button, AppDatePipe, MoneyPipe, PhonePipe],
  templateUrl: './invoice-print-page.html',
  host: { class: 'block min-h-full bg-surface-950 print:bg-white' },
})
export class InvoicePrintPage {
  private readonly billing = inject(BillingBackend);
  private readonly patients = inject(PatientsBackend);
  private readonly staffBackend = inject(StaffBackend);
  protected readonly staff = inject(StaffStore);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly invoice = signal<Invoice | null>(null);
  protected readonly patient = signal<Patient | null>(null);
  protected readonly payments = signal<Payment[]>([]);
  protected readonly clinic = signal<ClinicSettings | null>(null);
  protected readonly balance = computed(() => {
    const inv = this.invoice();
    return inv ? balanceOf(inv) : 0;
  });

  constructor() {
    this.staffBackend.getSettings().subscribe({ next: (s) => this.clinic.set(s) });
    if (this.staff.doctors().length === 0) this.staff.loadCore();
    effect(() => {
      const id = this.id();
      this.billing.getInvoice(id).subscribe({
        next: (inv) => {
          this.invoice.set(inv);
          this.patients.get(inv.patientId).subscribe({ next: (p) => this.patient.set(p) });
        },
      });
      this.billing
        .listPayments(id)
        .subscribe({ next: (list) => this.payments.set(list.filter((p) => !p.voided)) });
    });
  }

  protected print(): void {
    window.print();
  }

  protected back(): void {
    void this.router.navigate(['/billing/invoices', this.id()]);
  }
}
