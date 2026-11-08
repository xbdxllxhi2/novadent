import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { MockAuthBackend } from './backends/mock/mock-auth-backend';
import { MockBillingBackend } from './backends/mock/mock-billing-backend';
import { MockClinicalBackend } from './backends/mock/mock-clinical-backend';
import { MockPatientsBackend } from './backends/mock/mock-patients-backend';
import { MockSchedulingBackend } from './backends/mock/mock-scheduling-backend';
import { MockStaffBackend } from './backends/mock/mock-staff-backend';
import { MockTasksBackend } from './backends/mock/mock-tasks-backend';
import { RemoteAuthBackend } from './backends/remote/remote-auth-backend';
import { RemoteBillingBackend } from './backends/remote/remote-billing-backend';
import { RemoteClinicalBackend } from './backends/remote/remote-clinical-backend';
import { RemotePatientsBackend } from './backends/remote/remote-patients-backend';
import { RemoteSchedulingBackend } from './backends/remote/remote-scheduling-backend';
import { RemoteStaffBackend } from './backends/remote/remote-staff-backend';
import { RemoteTasksBackend } from './backends/remote/remote-tasks-backend';
import { AuthBackend } from './core/auth/auth-backend';
import { AuthStore } from './core/auth/auth.store';
import { LocaleStore } from './core/i18n/locale.store';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';
import { NovodentPreset } from './core/theme/novodent-preset';
import { BillingBackend } from './domain/billing/billing-backend';
import { ClinicalBackend } from './domain/clinical/clinical-backend';
import { PatientsBackend } from './domain/patients/patients-backend';
import { SchedulingBackend } from './domain/scheduling/scheduling-backend';
import { StaffBackend } from './domain/staff/staff-backend';
import { TasksBackend } from './domain/tasks/tasks-backend';
import { environment } from '../environments/environment';

const remote = environment.backend === 'remote';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideHttpClient(),
    provideTransloco({
      config: {
        availableLangs: ['fr', 'ar', 'en'],
        defaultLang: 'fr',
        fallbackLang: 'fr',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
      },
      loader: TranslocoHttpLoader,
    }),
    providePrimeNG({
      theme: { preset: NovodentPreset, options: { darkModeSelector: '.dark' } },
      ripple: false,
    }),
    MessageService,
    ConfirmationService,

    // Backend seams: one line per bounded context. The remote adapters are stubs until the API exists.
    {
      provide: AuthBackend,
      useFactory: () => (remote ? inject(RemoteAuthBackend) : inject(MockAuthBackend)),
    },
    {
      provide: StaffBackend,
      useFactory: () => (remote ? inject(RemoteStaffBackend) : inject(MockStaffBackend)),
    },
    {
      provide: PatientsBackend,
      useFactory: () => (remote ? inject(RemotePatientsBackend) : inject(MockPatientsBackend)),
    },
    {
      provide: SchedulingBackend,
      useFactory: () => (remote ? inject(RemoteSchedulingBackend) : inject(MockSchedulingBackend)),
    },
    {
      provide: ClinicalBackend,
      useFactory: () => (remote ? inject(RemoteClinicalBackend) : inject(MockClinicalBackend)),
    },
    {
      provide: BillingBackend,
      useFactory: () => (remote ? inject(RemoteBillingBackend) : inject(MockBillingBackend)),
    },
    {
      provide: TasksBackend,
      useFactory: () => (remote ? inject(RemoteTasksBackend) : inject(MockTasksBackend)),
    },

    // Language and direction must be applied before the first render; the session before guards run.
    provideAppInitializer(() => {
      inject(LocaleStore);
      return inject(AuthStore).restore();
    }),
  ],
};
