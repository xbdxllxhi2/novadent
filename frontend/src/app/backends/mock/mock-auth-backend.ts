import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthBackend } from '../../core/auth/auth-backend';
import { BackendError } from '../../core/backend-error';
import type { AuthSession, DemoUser, Permission, Role } from '../../core/auth/permission.model';
import type { StaffUser } from '../../domain/staff/staff.model';
import { MockDb } from './mock-db';
import { respond } from './latency';

const SESSION_KEY = 'novadent.session';

/**
 * Demo sign-in: pick a staff user, get their role's permissions. Also the authority the other
 * mock backends consult (`current()`, `require()`), so permission and ownership rules are enforced
 * on the "server" side of the seam exactly as the real API will.
 */
@Injectable({ providedIn: 'root' })
export class MockAuthBackend extends AuthBackend {
  private readonly db = inject(MockDb);

  listDemoUsers(): Observable<DemoUser[]> {
    return respond(() => {
      const roles = new Map(
        this.db
          .collection<Role>('roles')
          .all()
          .map((r) => [r.id, r]),
      );
      return this.db
        .collection<StaffUser>('staffUsers')
        .where((u) => u.active)
        .map((u) => ({
          id: u.id,
          displayName: u.displayName,
          username: u.username,
          roleId: u.roleId,
          roleName: roles.get(u.roleId)?.name ?? '',
          doctorId: u.doctorId,
        }));
    });
  }

  login(userId: string): Observable<AuthSession> {
    return respond(() => {
      const session = this.buildSession(userId);
      if (!session) throw new BackendError('notFound', { id: userId });
      localStorage.setItem(SESSION_KEY, userId);
      return session;
    });
  }

  restore(): Observable<AuthSession | null> {
    return respond(() => this.current());
  }

  logout(): Observable<void> {
    return respond(() => {
      localStorage.removeItem(SESSION_KEY);
    });
  }

  /** Synchronous session for other mock backends. */
  current(): AuthSession | null {
    const userId = localStorage.getItem(SESSION_KEY);
    return userId ? this.buildSession(userId) : null;
  }

  /** Throws `unauthenticated` or `forbidden` unless the session holds one of the permissions. */
  require(...anyOf: Permission[]): AuthSession {
    const session = this.current();
    if (!session) throw new BackendError('unauthenticated');
    if (anyOf.length > 0 && !anyOf.some((p) => session.permissions.includes(p))) {
      throw new BackendError('forbidden', { permission: anyOf[0] });
    }
    return session;
  }

  private buildSession(userId: string): AuthSession | null {
    const user = this.db.collection<StaffUser>('staffUsers').get(userId);
    if (!user || !user.active) return null;
    const role = this.db.collection<Role>('roles').get(user.roleId);
    if (!role) return null;
    return { user, role, permissions: [...role.permissions], doctorId: user.doctorId };
  }
}
