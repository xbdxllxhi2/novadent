import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthBackend } from '../../core/auth/auth-backend';
import type { AuthSession, DemoUser } from '../../core/auth/permission.model';
import { notImplemented } from './not-implemented';

/** Will complete the Keycloak OIDC flow and resolve the session from the staff directory. */
@Injectable({ providedIn: 'root' })
export class RemoteAuthBackend extends AuthBackend {
  listDemoUsers(): Observable<DemoUser[]> {
    return of([]);
  }
  login(): Observable<AuthSession> {
    return notImplemented('AuthBackend.login');
  }
  restore(): Observable<AuthSession | null> {
    return notImplemented('AuthBackend.restore');
  }
  logout(): Observable<void> {
    return notImplemented('AuthBackend.logout');
  }
}
