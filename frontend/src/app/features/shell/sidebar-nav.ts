import { Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import type { Permission } from '../../core/auth/permission.model';
import { ClinicSettingsStore } from '../../domain/staff/clinic-settings.store';

interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
  exact?: boolean;
  anyOf: Permission[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', labelKey: 'nav.home', icon: 'pi-home', exact: true, anyOf: [] },
  {
    path: '/waiting-room',
    labelKey: 'nav.waitingRoom',
    icon: 'pi-hourglass',
    anyOf: ['appointment.read'],
  },
  {
    path: '/scheduler',
    labelKey: 'nav.scheduler',
    icon: 'pi-calendar',
    anyOf: ['appointment.read'],
  },
  { path: '/patients', labelKey: 'nav.patients', icon: 'pi-users', anyOf: ['patient.read'] },
  {
    path: '/billing/invoices',
    labelKey: 'nav.invoices',
    icon: 'pi-receipt',
    anyOf: ['invoice.read'],
  },
  {
    path: '/billing/reports/production',
    labelKey: 'nav.reports',
    icon: 'pi-chart-bar',
    anyOf: ['report.production'],
  },
  { path: '/settings', labelKey: 'nav.settings', icon: 'pi-cog', anyOf: ['settings.read'] },
];

@Component({
  selector: 'app-sidebar-nav',
  imports: [RouterLink, RouterLinkActive, TranslocoModule],
  templateUrl: './sidebar-nav.html',
  host: { class: 'flex h-full flex-col' },
})
export class SidebarNav {
  private readonly auth = inject(AuthStore);
  protected readonly settings = inject(ClinicSettingsStore);

  readonly navigated = output<void>();

  protected readonly items = computed(() =>
    NAV_ITEMS.filter((i) => i.anyOf.length === 0 || this.auth.canAny(...i.anyOf)),
  );
}
