import { Component, OnInit, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Select } from 'primeng/select';
import { AuthStore } from '../../core/auth/auth.store';
import type { DemoUser } from '../../core/auth/permission.model';
import { APP_LANGS, AppLang, LocaleStore } from '../../core/i18n/locale.store';
import { ThemeToggle } from '../../core/theme/theme-toggle';

const LANG_LABELS: Record<AppLang, string> = { fr: 'Français', ar: 'العربية', en: 'English' };

/** Mock sign-in: one card per demo user. Replaced by the Keycloak redirect in the backend phase. */
@Component({
  selector: 'app-sign-in-page',
  imports: [FormsModule, TranslocoModule, Select, ThemeToggle],
  templateUrl: './sign-in-page.html',
  host: { class: 'flex min-h-full items-center justify-center bg-surface-950 p-6' },
})
export class SignInPage implements OnInit {
  protected readonly auth = inject(AuthStore);
  protected readonly locale = inject(LocaleStore);
  private readonly transloco = inject(TranslocoService);

  /** Bound from the query string by withComponentInputBinding. */
  readonly returnUrl = input<string>('/');

  protected readonly langOptions = APP_LANGS.map((code) => ({ code, label: LANG_LABELS[code] }));

  ngOnInit(): void {
    this.auth.loadDemoUsers();
  }

  protected roleLabel(user: DemoUser): string {
    return user.roleName.startsWith('roles.')
      ? this.transloco.translate(user.roleName)
      : user.roleName;
  }

  protected initials(user: DemoUser): string {
    return user.displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected signIn(user: DemoUser): void {
    this.auth.login(user.id, this.returnUrl() || '/');
  }
}
