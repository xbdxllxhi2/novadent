import { Observable } from 'rxjs';
import type { DateRange } from '../scheduling/appointment.model';
import type {
  Invoice,
  InvoiceFilter,
  Payment,
  PaymentInput,
  ProductionRow,
  UninvoicedItem,
} from './invoice.model';

export abstract class BillingBackend {
  abstract listInvoices(filter?: InvoiceFilter): Observable<Invoice[]>;
  abstract getInvoice(id: string): Observable<Invoice>;
  abstract listUninvoicedItems(patientId: string): Observable<UninvoicedItem[]>;
  abstract createInvoice(patientId: string, planItemIds: string[]): Observable<Invoice>;
  abstract voidInvoice(id: string, reason: string): Observable<Invoice>;
  abstract listPayments(invoiceId: string): Observable<Payment[]>;
  abstract addPayment(input: PaymentInput): Observable<Payment>;
  abstract voidPayment(paymentId: string): Observable<Payment>;
  abstract productionReport(range: DateRange): Observable<ProductionRow[]>;
  /** Sum of balances on open invoices, for the home KPI. */
  abstract outstandingBalance(): Observable<number>;
}
