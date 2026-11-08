import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MenuItem } from 'primeng/api';
import {
  AutoComplete,
  AutoCompleteCompleteEvent,
  AutoCompleteSelectEvent,
} from 'primeng/autocomplete';
import { Avatar } from 'primeng/avatar';
import { Menu } from 'primeng/menu';
import { Select } from 'primeng/select';
import { AuthStore } from '../../core/auth/auth.store';
import { APP_LANGS, AppLang, LocaleStore } from '../../core/i18n/locale.store';
import { ThemeToggle } from '../../core/theme/theme-toggle';
import type { Patient } from '../../domain/patients/patient.model';
import { PatientsBackend } from '../../domain/patients/patients-backend';
import { PatientName, patientDisplayName } from '../../shared/ui/patient-name';
import { PhonePipe } from '../../shared/ui/phone.pipe';

const LANG_LABELS: Record<AppLang, string> = { fr: 'Français', ar: 'العربية', en: 'English' };

@Component({
  selector: 'app-topbar',
  imports: [
    FormsModule,
    TranslocoModule,
    AutoComplete,
    Avatar,
    Menu,
    Select,
    ThemeToggle,
    PatientName,
    PhonePipe,
  ],
  templateUrl: './topbar.html',
  host: {
    class:
      'flex h-[56px] flex-none items-center gap-2 border-b border-surface-700 bg-surface-950 px-3 sm:px-5',
  },
})
export class Topbar {
  protected readonly auth = inject(AuthStore);
  protected readonly locale = inject(LocaleStore);
  private readonly patients = inject(PatientsBackend);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly menuClick = output<void>();

  protected readonly langOptions = APP_LANGS.map((code) => ({ code, label: LANG_LABELS[code] }));
  protected readonly suggestions = signal<Patient[]>([]);
  protected readonly canSearch = computed(() => this.auth.can('patient.read'));
  protected readonly roleLabel = computed(() => {
    const name = this.auth.role()?.name ?? '';
    return name.startsWith('roles.') ? this.transloco.translate(name) : name;
  });
  protected readonly userMenu = computed<MenuItem[]>(() => [
    {
      label: this.transloco.translate('auth.signOut'),
      icon: 'pi pi-sign-out',
      command: () => this.auth.logout(),
    },
  ]);
  protected query: string | Patient | null = null;
  protected readonly patientLabel = (p: Patient): string =>
    patientDisplayName(p, this.locale.lang());

  protected search(event: AutoCompleteCompleteEvent): void {
    this.patients.search(event.query, { limit: 8 }).subscribe({
      next: (list) => this.suggestions.set(list),
      error: () => this.suggestions.set([]),
    });
  }

  protected open(event: AutoCompleteSelectEvent): void {
    const patient = event.value as Patient;
    this.query = null;
    this.suggestions.set([]);
    void this.router.navigate(['/patients', patient.id]);
  }
}
