export type PaymentMethod = 'cash' | 'bank-transfer' | 'bankily' | 'masrvi' | 'sedad' | 'other';
export const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'bankily',
  'masrvi',
  'sedad',
  'bank-transfer',
  'other',
];

export type InvoiceStatus = 'issued' | 'partially-paid' | 'paid' | 'void';

export interface InvoiceLine {
  id: string;
  planItemId: string | null;
  procedureCode: string;
  description: string;
  toothFdi: number | null;
  doctorId: string;
  quantity: number;
  /** Integer MRU. */
  unitPrice: number;
  /** quantity * unitPrice, integer MRU. */
  amount: number;
}

export interface Invoice {
  id: string;
  /** `INV-2026-0001`, allocated by the backend. */
  number: string;
  patientId: string;
  issuedAt: string;
  dueAt: string | null;
  lines: InvoiceLine[];
  /** Denormalized sum of line amounts, recomputed by the backend. */
  total: number;
  /** Denormalized sum of non-voided payments. */
  paid: number;
  status: InvoiceStatus;
  voidedAt: string | null;
  voidReason: string | null;
  voidedBy: string | null;
  createdBy: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  reference: string | null;
  receivedBy: string;
  voided: boolean;
}

export type PaymentInput = Pick<
  Payment,
  'invoiceId' | 'amount' | 'method' | 'paidAt' | 'reference'
>;

export interface InvoiceFilter {
  patientId?: string;
  status?: InvoiceStatus | 'open';
  from?: string;
  to?: string;
}

/** A completed plan item that has not been invoiced yet. */
export interface UninvoicedItem {
  planId: string;
  planTitle: string;
  itemId: string;
  procedureCode: string;
  toothFdi: number | null;
  doctorId: string;
  price: number;
  completedAt: string;
}

export interface ProductionRow {
  doctorId: string;
  invoiceCount: number;
  /** Sum of the doctor's line amounts on non-void invoices in range. */
  invoiced: number;
  /** Payments attributed to the doctor pro rata by line amount. */
  collected: number;
}
