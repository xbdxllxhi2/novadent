import { Observable } from 'rxjs';
import type { AuthSession, DemoUser } from './permission.model';

/**
 * Authentication seam. The mock lists demo users and signs in by id; the remote adapter will
 * complete the Keycloak flow and resolve the session from the token plus the staff directory.
 */
export abstract class AuthBackend {
  /** Only meaningful under the mock backend; remote returns []. */
  abstract listDemoUsers(): Observable<DemoUser[]>;
  abstract login(userId: string): Observable<AuthSession>;
  /** Restores a session persisted across reloads, or null. */
  abstract restore(): Observable<AuthSession | null>;
  abstract logout(): Observable<void>;
}
