import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { permissionGuard } from './core/auth/permission.guard';

export const routes: Routes = [
  {
    path: 'sign-in',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/sign-in-page').then((m) => m.SignInPage),
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./features/auth/forbidden-page').then((m) => m.ForbiddenPage),
  },
  {
    path: 'print/document/:id',
    canActivate: [authGuard, permissionGuard('document.read')],
    loadComponent: () =>
      import('./features/documents/document-print-page').then((m) => m.DocumentPrintPage),
  },
  {
    path: 'print/invoice/:id',
    canActivate: [authGuard, permissionGuard('invoice.read')],
    loadComponent: () =>
      import('./features/billing/invoice-print-page').then((m) => m.InvoicePrintPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./features/shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
      },
      {
        path: 'patients',
        canActivate: [permissionGuard('patient.read')],
        loadComponent: () =>
          import('./features/patients/patients-page').then((m) => m.PatientsPage),
      },
      {
        path: 'patients/:id',
        canActivate: [permissionGuard('patient.read')],
        loadComponent: () => import('./features/patients/patient-page').then((m) => m.PatientPage),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./features/patients/patient-overview-tab').then((m) => m.PatientOverviewTab),
          },
          {
            path: 'chart',
            canActivate: [permissionGuard('chart.read')],
            loadComponent: () =>
              import('./features/patients/patient-chart-tab').then((m) => m.PatientChartTab),
          },
          {
            path: 'plans',
            canActivate: [permissionGuard('plan.read')],
            loadComponent: () =>
              import('./features/patients/patient-plans-tab').then((m) => m.PatientPlansTab),
          },
          {
            path: 'appointments',
            canActivate: [permissionGuard('appointment.read')],
            loadComponent: () =>
              import('./features/patients/patient-appointments-tab').then(
                (m) => m.PatientAppointmentsTab,
              ),
          },
          {
            path: 'invoices',
            canActivate: [permissionGuard('invoice.read')],
            loadComponent: () =>
              import('./features/patients/patient-invoices-tab').then((m) => m.PatientInvoicesTab),
          },
          {
            path: 'notes',
            canActivate: [permissionGuard('note.read')],
            loadComponent: () =>
              import('./features/patients/patient-notes-tab').then((m) => m.PatientNotesTab),
          },
          {
            path: 'documents',
            canActivate: [permissionGuard('document.read')],
            loadComponent: () =>
              import('./features/patients/patient-documents-tab').then(
                (m) => m.PatientDocumentsTab,
              ),
          },
          {
            path: 'attachments',
            canActivate: [permissionGuard('attachment.read')],
            loadComponent: () =>
              import('./features/patients/patient-attachments-tab').then(
                (m) => m.PatientAttachmentsTab,
              ),
          },
          {
            path: 'timeline',
            loadComponent: () =>
              import('./features/patients/patient-timeline-tab').then((m) => m.PatientTimelineTab),
          },
        ],
      },
      {
        path: 'waiting-room',
        canActivate: [permissionGuard('appointment.read')],
        loadComponent: () =>
          import('./features/waiting-room/waiting-room-page').then((m) => m.WaitingRoomPage),
      },
      {
        path: 'scheduler',
        canActivate: [permissionGuard('appointment.read')],
        loadComponent: () =>
          import('./features/scheduler/scheduler-page').then((m) => m.SchedulerPage),
      },
      {
        path: 'billing/invoices',
        canActivate: [permissionGuard('invoice.read')],
        loadComponent: () => import('./features/billing/invoices-page').then((m) => m.InvoicesPage),
      },
      {
        path: 'billing/invoices/:id',
        canActivate: [permissionGuard('invoice.read')],
        loadComponent: () => import('./features/billing/invoice-page').then((m) => m.InvoicePage),
      },
      {
        path: 'billing/reports/production',
        canActivate: [permissionGuard('report.production')],
        loadComponent: () =>
          import('./features/billing/production-report-page').then((m) => m.ProductionReportPage),
      },
      {
        path: 'settings',
        canActivate: [permissionGuard('settings.read')],
        loadComponent: () =>
          import('./features/settings/settings-page').then((m) => m.SettingsPage),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'general' },
          {
            path: 'general',
            loadComponent: () =>
              import('./features/settings/general-settings').then((m) => m.GeneralSettings),
          },
          {
            path: 'hours',
            loadComponent: () =>
              import('./features/settings/clinic-hours-editor').then((m) => m.ClinicHoursEditor),
          },
          {
            path: 'doctors-chairs',
            loadComponent: () =>
              import('./features/settings/doctors-chairs-settings').then(
                (m) => m.DoctorsChairsSettings,
              ),
          },
          {
            path: 'procedures',
            canActivate: [permissionGuard('procedure.read')],
            loadComponent: () =>
              import('./features/settings/procedures-settings').then((m) => m.ProceduresSettings),
          },
          {
            path: 'staff',
            canActivate: [permissionGuard('staff.read', 'staff.manage')],
            loadComponent: () =>
              import('./features/settings/staff-roles-settings').then((m) => m.StaffRolesSettings),
          },
          {
            path: 'demo',
            loadComponent: () =>
              import('./features/settings/demo-data-settings').then((m) => m.DemoDataSettings),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
