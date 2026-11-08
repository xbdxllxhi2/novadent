/** Error codes shared by the mock adapters and, later, the real API's problem responses. */
export type BackendErrorCode =
  | 'unknown'
  | 'notFound'
  | 'forbidden'
  | 'unauthenticated'
  | 'validation'
  | 'conflict'
  | 'appointmentConflictDoctor'
  | 'appointmentConflictChair'
  | 'appointmentBlocked'
  | 'outsideHours'
  | 'invoiceNotVoidable'
  | 'paymentExceedsBalance'
  | 'nothingToInvoice'
  | 'storageQuota';

/** Thrown by backends; stores hand it to NotifyService.failure() which maps it to `errors.<code>`. */
export class BackendError extends Error {
  constructor(
    readonly code: BackendErrorCode,
    readonly params: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = 'BackendError';
  }
}
