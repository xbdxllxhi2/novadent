import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import type { Permission } from '../../core/auth/permission.model';
import { PageHeader } from '../../shared/ui/page-header';

interface SettingsLink {
  path: string;
  labelKey: string;
  icon: string;
  anyOf: Permission[];
}

const LINKS: SettingsLink[] = [
  { path: 'general', labelKey: 'settings.general', icon: 'pi-sliders-h', anyOf: [] },
  { path: 'hours', labelKey: 'settings.hours', icon: 'pi-clock', anyOf: [] },
  { path: 'doctors-chairs', labelKey: 'settings.doctorsChairs', icon: 'pi-users', anyOf: [] },
  {
    path: 'procedures',
    labelKey: 'settings.procedures',
    icon: 'pi-list',
    anyOf: ['procedure.read'],
  },
  {
    path: 'staff',
    labelKey: 'settings.staff',
    icon: 'pi-shield',
    anyOf: ['staff.read', 'staff.manage'],
  },
  { path: 'demo', labelKey: 'settings.demo', icon: 'pi-database', anyOf: [] },
];

@Component({
  selector: 'app-settings-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslocoModule, PageHeader],
  templateUrl: './settings-page.html',
  host: { class: 'block' },
})
export class SettingsPage {
  private readonly auth = inject(AuthStore);
  protected readonly links = computed(() =>
    LINKS.filter((l) => l.anyOf.length === 0 || this.auth.canAny(...l.anyOf)),
  );
  protected readonly readOnly = computed(() => !this.auth.can('settings.manage'));
}
