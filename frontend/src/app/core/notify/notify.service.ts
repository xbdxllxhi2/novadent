import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslocoService } from '@jsverse/transloco';
import { BackendError } from '../backend-error';

/**
 * Thin wrapper over PrimeNG's MessageService. Every store call that mutates something reports
 * through here, so the user always gets a toast confirming success or explaining a failure.
 *
 * Callers pass translation KEYS (`notify.patientSaved`) plus optional params; the service
 * translates. A `BackendError` is mapped to `errors.<code>` with its params, so mocks and the real
 * API share one vocabulary.
 */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly messages = inject(MessageService);
  private readonly transloco = inject(TranslocoService);

  success(key: string, params?: Record<string, unknown>): void {
    this.messages.add({
      severity: 'success',
      summary: this.t('notify.success'),
      detail: this.t(key, params),
      life: 3000,
    });
  }

  info(key: string, params?: Record<string, unknown>): void {
    this.messages.add({
      severity: 'info',
      summary: this.t('notify.info'),
      detail: this.t(key, params),
      life: 4000,
    });
  }

  warn(key: string, params?: Record<string, unknown>): void {
    this.messages.add({
      severity: 'warn',
      summary: this.t('notify.warning'),
      detail: this.t(key, params),
      life: 4500,
    });
  }

  error(key: string, params?: Record<string, unknown>): void {
    this.messages.add({
      severity: 'error',
      summary: this.t('notify.error'),
      detail: this.t(key, params),
      life: 6000,
    });
  }

  /** For `.subscribe({ error })` handlers: shows the backend's reason when it is a known code. */
  failure(err: unknown, fallbackKey = 'errors.unknown'): void {
    if (err instanceof BackendError) {
      this.error(`errors.${err.code}`, err.params);
      return;
    }
    this.error(fallbackKey);
  }

  private t(key: string, params?: Record<string, unknown>): string {
    return this.transloco.translate(key, params);
  }
}
