import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { Role } from '../../core/auth/permission.model';
import { DemoDataInfo, StaffBackend } from '../../domain/staff/staff-backend';
import type { Chair, ClinicSettings, Doctor, StaffUser } from '../../domain/staff/staff.model';
import { notImplemented } from './not-implemented';

@Injectable({ providedIn: 'root' })
export class RemoteStaffBackend extends StaffBackend {
  getSettings(): Observable<ClinicSettings> {
    return notImplemented('StaffBackend.getSettings');
  }
  saveSettings(): Observable<ClinicSettings> {
    return notImplemented('StaffBackend.saveSettings');
  }
  listDoctors(): Observable<Doctor[]> {
    return notImplemented('StaffBackend.listDoctors');
  }
  saveDoctor(): Observable<Doctor> {
    return notImplemented('StaffBackend.saveDoctor');
  }
  listChairs(): Observable<Chair[]> {
    return notImplemented('StaffBackend.listChairs');
  }
  saveChair(): Observable<Chair> {
    return notImplemented('StaffBackend.saveChair');
  }
  listRoles(): Observable<Role[]> {
    return notImplemented('StaffBackend.listRoles');
  }
  saveRole(): Observable<Role> {
    return notImplemented('StaffBackend.saveRole');
  }
  listUsers(): Observable<StaffUser[]> {
    return notImplemented('StaffBackend.listUsers');
  }
  saveUser(): Observable<StaffUser> {
    return notImplemented('StaffBackend.saveUser');
  }
  demoDataInfo(): Observable<DemoDataInfo | null> {
    return of(null);
  }
  resetDemoData(): Observable<void> {
    return notImplemented('StaffBackend.resetDemoData');
  }
}
