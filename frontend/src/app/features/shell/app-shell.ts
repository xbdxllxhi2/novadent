import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Drawer } from 'primeng/drawer';
import { ClinicSettingsStore } from '../../domain/staff/clinic-settings.store';
import { StaffStore } from '../../domain/staff/staff.store';
import { SidebarNav } from './sidebar-nav';
import { Topbar } from './topbar';

/**
 * Persistent frame: sidebar + topbar mounted once above the routed pages so navigation never
 * remounts them. Loads the reference data every page needs (doctors, chairs, clinic settings).
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Drawer, SidebarNav, Topbar],
  templateUrl: './app-shell.html',
  host: { class: 'flex h-full w-full overflow-hidden bg-surface-950 text-surface-100' },
})
export class AppShell implements OnInit {
  private readonly staff = inject(StaffStore);
  private readonly settings = inject(ClinicSettingsStore);

  /** Mobile drawer state; on `lg` and up the sidebar is static. */
  protected readonly drawerOpen = signal(false);

  ngOnInit(): void {
    this.staff.loadCore();
    this.settings.load();
  }
}
