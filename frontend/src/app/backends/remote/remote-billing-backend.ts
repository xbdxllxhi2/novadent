import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BillingBackend } from '../../domain/billing/billing-backend';
import type {
  Invoice,
  Payment,
  ProductionRow,
  UninvoicedItem,
} from '../../domain/billing/invoice.model';
import { notImplemented } from './not-implemented';

@Injectable({ providedIn: 'root' })
export class RemoteBillingBackend extends BillingBackend {
  listInvoices(): Observable<Invoice[]> {
    return notImplemented('BillingBackend.listInvoices');
  }
  getInvoice(): Observable<Invoice> {
    return notImplemented('BillingBackend.getInvoice');
  }
  listUninvoicedItems(): Observable<UninvoicedItem[]> {
    return notImplemented('BillingBackend.listUninvoicedItems');
  }
  createInvoice(): Observable<Invoice> {
    return notImplemented('BillingBackend.createInvoice');
  }
  voidInvoice(): Observable<Invoice> {
    return notImplemented('BillingBackend.voidInvoice');
  }
  listPayments(): Observable<Payment[]> {
    return notImplemented('BillingBackend.listPayments');
  }
  addPayment(): Observable<Payment> {
    return notImplemented('BillingBackend.addPayment');
  }
  voidPayment(): Observable<Payment> {
    return notImplemented('BillingBackend.voidPayment');
  }
  productionReport(): Observable<ProductionRow[]> {
    return notImplemented('BillingBackend.productionReport');
  }
  outstandingBalance(): Observable<number> {
    return notImplemented('BillingBackend.outstandingBalance');
  }
}
