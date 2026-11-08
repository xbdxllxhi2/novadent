import { Observable, defer, of, throwError, timer } from 'rxjs';
import { delay, mergeMap } from 'rxjs/operators';
import { BackendError, BackendErrorCode } from '../../core/backend-error';

const MIN_MS = 120;
const JITTER_MS = 180;

function latency(): number {
  return MIN_MS + Math.floor(Math.random() * JITTER_MS);
}

/** Emits the value after a realistic network delay. The value is produced lazily on subscribe. */
export function respond<T>(produce: () => T): Observable<T> {
  return defer(() => {
    try {
      return of(produce()).pipe(delay(latency()));
    } catch (err) {
      return timer(latency()).pipe(mergeMap(() => throwError(() => err)));
    }
  });
}

/** Like respond(), for producers that are asynchronous (IndexedDB, file reads). */
export function respondAsync<T>(produce: () => Promise<T>): Observable<T> {
  return defer(() => timer(latency()).pipe(mergeMap(() => produce())));
}

export function fail<T = never>(
  code: BackendErrorCode,
  params?: Record<string, unknown>,
): Observable<T> {
  return timer(latency()).pipe(mergeMap(() => throwError(() => new BackendError(code, params))));
}
