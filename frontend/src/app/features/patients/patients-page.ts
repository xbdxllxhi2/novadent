import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AuthStore } from '../../core/auth/auth.store';
import { HasPermission } from '../../core/auth/has-permission.directive';
import { ageFromBirthDate } from '../../core/i18n/formats';
import type { Patient } from '../../domain/patients/patient.model';
import { PatientsStore } from '../../domain/patients/patients.store';
import { StaffStore } from '../../domain/staff/staff.store';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { PatientName } from '../../shared/ui/patient-name';
import { PhonePipe } from '../../shared/ui/phone.pipe';
import { StatusTag } from '../../shared/ui/status-tag';
import { MedicalAlerts } from './medical-alerts';
import { PatientFormDialog } from './patient-form-dialog';

@Component({
  selector: 'app-patients-page',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    IconField,
    InputIcon,
    InputText,
    TableModule,
    ToggleSwitch,
    HasPermission,
    EmptyState,
    PageHeader,
    PatientName,
    PhonePipe,
    StatusTag,
    MedicalAlerts,
    PatientFormDialog,
  ],
  templateUrl: './patients-page.html',
  host: { class: 'block' },
})
export class PatientsPage implements OnInit {
  protected readonly store = inject(PatientsStore);
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly formOpen = signal(false);
  protected readonly age = ageFromBirthDate;

  ngOnInit(): void {
    this.store.search(this.store.query(), true);
  }

  protected open(patient: Patient): void {
    void this.router.navigate(['/patients', patient.id]);
  }

  protected created(patient: Patient): void {
    this.formOpen.set(false);
    void this.router.navigate(['/patients', patient.id]);
  }
}
