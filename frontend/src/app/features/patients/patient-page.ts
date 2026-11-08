import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Tab, TabList, Tabs } from 'primeng/tabs';
import { filter, map, startWith } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { HasPermission } from '../../core/auth/has-permission.directive';
import type { Permission } from '../../core/auth/permission.model';
import { ageFromBirthDate } from '../../core/i18n/formats';
import type { Patient } from '../../domain/patients/patient.model';
import { PatientsStore } from '../../domain/patients/patients.store';
import { StaffStore } from '../../domain/staff/staff.store';
import { LoadingBlock } from '../../shared/ui/loading-block';
import { PatientName } from '../../shared/ui/patient-name';
import { PhonePipe } from '../../shared/ui/phone.pipe';
import { StatusTag } from '../../shared/ui/status-tag';
import { MedicalAlerts } from './medical-alerts';
import { PatientFormDialog } from './patient-form-dialog';
import { TaskDialog } from '../tasks/task-dialog';

interface TabDef {
  path: string;
  labelKey: string;
  icon: string;
  anyOf: Permission[];
}

const TABS: TabDef[] = [
  { path: '', labelKey: 'patients.tabOverview', icon: 'pi-id-card', anyOf: [] },
  { path: 'timeline', labelKey: 'patients.tabTimeline', icon: 'pi-history', anyOf: [] },
  { path: 'chart', labelKey: 'patients.tabChart', icon: 'pi-th-large', anyOf: ['chart.read'] },
  { path: 'plans', labelKey: 'patients.tabPlans', icon: 'pi-list-check', anyOf: ['plan.read'] },
  {
    path: 'appointments',
    labelKey: 'patients.tabAppointments',
    icon: 'pi-calendar',
    anyOf: ['appointment.read'],
  },
  {
    path: 'invoices',
    labelKey: 'patients.tabInvoices',
    icon: 'pi-receipt',
    anyOf: ['invoice.read'],
  },
  { path: 'notes', labelKey: 'patients.tabNotes', icon: 'pi-file-edit', anyOf: ['note.read'] },
  {
    path: 'documents',
    labelKey: 'patients.tabDocuments',
    icon: 'pi-file',
    anyOf: ['document.read'],
  },
  {
    path: 'attachments',
    labelKey: 'patients.tabAttachments',
    icon: 'pi-images',
    anyOf: ['attachment.read'],
  },
];

@Component({
  selector: 'app-patient-page',
  imports: [
    RouterOutlet,
    RouterLink,
    TranslocoModule,
    Button,
    Tabs,
    TabList,
    Tab,
    HasPermission,
    LoadingBlock,
    PatientName,
    PhonePipe,
    StatusTag,
    MedicalAlerts,
    PatientFormDialog,
    TaskDialog,
  ],
  templateUrl: './patient-page.html',
  host: { class: 'block' },
})
export class PatientPage {
  protected readonly store = inject(PatientsStore);
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);

  /** Route param, bound by withComponentInputBinding. */
  readonly id = input.required<string>();

  protected readonly editOpen = signal(false);
  protected readonly requestOpen = signal(false);
  protected readonly age = ageFromBirthDate;
  protected readonly tabs = computed(() =>
    TABS.filter((t) => t.anyOf.length === 0 || this.auth.canAny(...t.anyOf)),
  );

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** The active tab is the segment after /patients/:id. */
  protected readonly activeTab = computed(() => {
    const segments = this.url().split('?')[0].split('/').filter(Boolean);
    const idx = segments.indexOf('patients');
    return idx >= 0 ? (segments[idx + 2] ?? '') : '';
  });

  constructor() {
    effect(() => this.store.load(this.id()));
  }

  protected toggleArchive(patient: Patient): void {
    if (patient.archived) {
      this.store.setArchived(patient.id, false);
      return;
    }
    this.confirm.confirm({
      header: this.transloco.translate('patients.archive'),
      message: this.transloco.translate('patients.archiveConfirm'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.store.setArchived(patient.id, true),
    });
  }
}
