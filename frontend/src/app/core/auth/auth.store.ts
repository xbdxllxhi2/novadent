import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotifyService } from '../notify/notify.service';
import { AuthBackend } from './auth-backend';
import type { AuthSession, DemoUser, Permission } from './permission.model';

/**
 * The signed-in session and its resolved permission set. `restore()` runs from
 * `provideAppInitializer` so guards never see an undetermined state.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly backend = inject(AuthBackend);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);

  readonly session = signal<AuthSession | null>(null);
  readonly loading = signal(false);
  readonly demoUsers = signal<DemoUser[]>([]);

  readonly loggedIn = computed(() => this.session() !== null);
  readonly user = computed(() => this.session()?.user ?? null);
  readonly role = computed(() => this.session()?.role ?? null);
  readonly permissions = computed<ReadonlySet<Permission>>(
    () => new Set(this.session()?.permissions ?? []),
  );
  readonly doctorId = computed(() => this.session()?.doctorId ?? null);
  readonly initials = computed(() => {
    const name = this.user()?.displayName ?? '';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  });

  can(permission: Permission): boolean {
    return this.permissions().has(permission);
  }

  canAny(...permissions: Permission[]): boolean {
    return permissions.some((p) => this.permissions().has(p));
  }

  canAll(...permissions: Permission[]): boolean {
    return permissions.every((p) => this.permissions().has(p));
  }

  async restore(): Promise<void> {
    try {
      this.session.set(await firstValueFrom(this.backend.restore()));
    } catch {
      this.session.set(null);
    }
  }

  loadDemoUsers(): void {
    this.backend.listDemoUsers().subscribe({
      next: (users) => this.demoUsers.set(users),
      error: (err) => this.notify.failure(err),
    });
  }

  login(userId: string, returnUrl = '/'): void {
    this.loading.set(true);
    this.backend.login(userId).subscribe({
      next: (session) => {
        this.session.set(session);
        this.loading.set(false);
        void this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.failure(err);
      },
    });
  }

  logout(): void {
    this.backend.logout().subscribe({
      next: () => {
        this.session.set(null);
        void this.router.navigateByUrl('/sign-in');
      },
      error: (err) => this.notify.failure(err),
    });
  }
}
