import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AuthStore } from '../../core/auth/auth.store';
import { Chair, DOCTOR_COLORS, Doctor } from '../../domain/staff/staff.model';
import { StaffStore } from '../../domain/staff/staff.store';
import { StatusTag } from '../../shared/ui/status-tag';

type DoctorDraft = Omit<Doctor, 'id'> & { id?: string };
type ChairDraft = Omit<Chair, 'id'> & { id?: string };

@Component({
  selector: 'app-doctors-chairs-settings',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    Dialog,
    InputNumber,
    InputText,
    TableModule,
    ToggleSwitch,
    StatusTag,
  ],
  templateUrl: './doctors-chairs-settings.html',
  host: { class: 'flex flex-col gap-4' },
})
export class DoctorsChairsSettings {
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);

  protected readonly canManage = computed(() => this.auth.can('settings.manage'));
  protected readonly colors = DOCTOR_COLORS;

  protected readonly doctorOpen = signal(false);
  protected readonly doctor = signal<DoctorDraft>(emptyDoctor());
  protected readonly chairOpen = signal(false);
  protected readonly chair = signal<ChairDraft>(emptyChair(1));

  protected editDoctor(d?: Doctor): void {
    this.doctor.set(
      d ? { ...d } : emptyDoctor(this.colors[this.staff.doctors().length % this.colors.length]),
    );
    this.doctorOpen.set(true);
  }

  protected patchDoctor(patch: Partial<DoctorDraft>): void {
    this.doctor.update((d) => ({ ...d, ...patch }));
  }

  protected saveDoctor(): void {
    const d = this.doctor();
    if (!d.nameLatin.trim()) return;
    this.staff.saveDoctor(
      {
        ...d,
        nameLatin: d.nameLatin.trim(),
        nameArabic: d.nameArabic.trim(),
        specialty: d.specialty?.trim() || undefined,
      },
      () => this.doctorOpen.set(false),
    );
  }

  protected editChair(c?: Chair): void {
    this.chair.set(c ? { ...c } : emptyChair(this.staff.chairs().length + 1));
    this.chairOpen.set(true);
  }

  protected patchChair(patch: Partial<ChairDraft>): void {
    this.chair.update((c) => ({ ...c, ...patch }));
  }

  protected saveChair(): void {
    const c = this.chair();
    if (!c.name.trim()) return;
    this.staff.saveChair({ ...c, name: c.name.trim() }, () => this.chairOpen.set(false));
  }
}

function emptyDoctor(color: string = DOCTOR_COLORS[0]): DoctorDraft {
  return { nameLatin: '', nameArabic: '', color, specialty: '', active: true };
}

function emptyChair(order: number): ChairDraft {
  return { name: `Fauteuil ${order}`, order, active: true };
}
