import { Observable } from 'rxjs';
import type { Role } from '../../core/auth/permission.model';
import type { Chair, ClinicSettings, Doctor, StaffUser } from './staff.model';

export interface DemoDataInfo {
  seedVersion: number;
  seededAt: string;
}

export abstract class StaffBackend {
  abstract getSettings(): Observable<ClinicSettings>;
  abstract saveSettings(settings: ClinicSettings): Observable<ClinicSettings>;

  abstract listDoctors(): Observable<Doctor[]>;
  abstract saveDoctor(doctor: Omit<Doctor, 'id'> & { id?: string }): Observable<Doctor>;

  abstract listChairs(): Observable<Chair[]>;
  abstract saveChair(chair: Omit<Chair, 'id'> & { id?: string }): Observable<Chair>;

  abstract listRoles(): Observable<Role[]>;
  abstract saveRole(role: Omit<Role, 'id'> & { id?: string }): Observable<Role>;

  abstract listUsers(): Observable<StaffUser[]>;
  abstract saveUser(user: Omit<StaffUser, 'id'> & { id?: string }): Observable<StaffUser>;

  /** Mock only: returns seed metadata, or null under the remote backend. */
  abstract demoDataInfo(): Observable<DemoDataInfo | null>;
  /** Mock only: clears and reseeds every collection. */
  abstract resetDemoData(): Observable<void>;
}
