import { Observable, throwError } from 'rxjs';

/**
 * Placeholder for the backend phase. Every remote adapter method returns this so the DI switch in
 * app.config.ts compiles today, and the set of these calls is the exact checklist of endpoints to
 * implement against the Spring Boot API.
 */
export function notImplemented<T>(method: string): Observable<T> {
  return throwError(() => new Error(`Remote backend not implemented: ${method}`));
}
