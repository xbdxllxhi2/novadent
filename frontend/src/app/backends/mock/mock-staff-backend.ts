import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendError } from '../../core/backend-error';
import type { Role } from '../../core/auth/permission.model';
import { DemoDataInfo, StaffBackend } from '../../domain/staff/staff-backend';
import type { Chair, ClinicSettings, Doctor, StaffUser } from '../../domain/staff/staff.model';
import { newId } from './ids';
import { respond } from './latency';
import { MockAuthBackend } from './mock-auth-backend';
import { MockDb } from './mock-db';

@Injectable({ providedIn: 'root' })
export class MockStaffBackend extends StaffBackend {
  private readonly db = inject(MockDb);
  private readonly auth = inject(MockAuthBackend);

  getSettings(): Observable<ClinicSettings> {
    return respond(() => this.settings());
  }

  saveSettings(settings: ClinicSettings): Observable<ClinicSettings> {
    return respond(() => {
      this.auth.require('settings.manage');
      return this.db
        .collection<ClinicSettings>('clinicSettings')
        .upsert({ ...settings, id: 'clinic' });
    });
  }

  listDoctors(): Observable<Doctor[]> {
    return respond(() => this.db.collection<Doctor>('doctors').all());
  }

  saveDoctor(doctor: Omit<Doctor, 'id'> & { id?: string }): Observable<Doctor> {
    return respond(() => {
      this.auth.require('settings.manage');
      return this.db.collection<Doctor>('doctors').upsert({ ...doctor, id: doctor.id ?? newId() });
    });
  }

  listChairs(): Observable<Chair[]> {
    return respond(() =>
      this.db
        .collection<Chair>('chairs')
        .all()
        .sort((a, b) => a.order - b.order),
    );
  }

  saveChair(chair: Omit<Chair, 'id'> & { id?: string }): Observable<Chair> {
    return respond(() => {
      this.auth.require('settings.manage');
      return this.db.collection<Chair>('chairs').upsert({ ...chair, id: chair.id ?? newId() });
    });
  }

  listRoles(): Observable<Role[]> {
    return respond(() => {
      this.auth.require('staff.read', 'staff.manage', 'settings.read');
      return this.db.collection<Role>('roles').all();
    });
  }

  saveRole(role: Omit<Role, 'id'> & { id?: string }): Observable<Role> {
    return respond(() => {
      this.auth.require('staff.manage');
      const roles = this.db.collection<Role>('roles');
      if (role.id) {
        const existing = roles.require(role.id);
        if (existing.locked) throw new BackendError('forbidden', { permission: 'staff.manage' });
      }
      return roles.upsert({
        ...role,
        id: role.id ?? newId(),
        builtIn: role.id ? role.builtIn : false,
        locked: false,
      });
    });
  }

  listUsers(): Observable<StaffUser[]> {
    return respond(() => {
      this.auth.require('staff.read', 'staff.manage');
      return this.db.collection<StaffUser>('staffUsers').all();
    });
  }

  saveUser(user: Omit<StaffUser, 'id'> & { id?: string }): Observable<StaffUser> {
    return respond(() => {
      this.auth.require('staff.manage');
      this.db.collection<Role>('roles').require(user.roleId);
      return this.db
        .collection<StaffUser>('staffUsers')
        .upsert({ ...user, id: user.id ?? newId() });
    });
  }

  demoDataInfo(): Observable<DemoDataInfo | null> {
    return respond(() => this.db.meta());
  }

  resetDemoData(): Observable<void> {
    return respond(() => {
      this.auth.require('settings.manage');
      this.db.reset();
    });
  }

  /** Synchronous accessor for other mocks (scheduler hours). */
  settings(): ClinicSettings {
    const s = this.db.collection<ClinicSettings>('clinicSettings').get('clinic');
    if (!s) throw new BackendError('notFound', { id: 'clinic' });
    return s;
  }
}
