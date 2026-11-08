import { Injectable, computed, inject, signal } from '@angular/core';
import { NotifyService } from '../../core/notify/notify.service';
import type { Role } from '../../core/auth/permission.model';
import { StaffBackend } from './staff-backend';
import type { Chair, Doctor, StaffUser } from './staff.model';

/** Doctors, chairs, roles and users. Doctors and chairs are needed almost everywhere. */
@Injectable({ providedIn: 'root' })
export class StaffStore {
  private readonly backend = inject(StaffBackend);
  private readonly notify = inject(NotifyService);

  readonly doctors = signal<Doctor[]>([]);
  readonly chairs = signal<Chair[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly users = signal<StaffUser[]>([]);
  readonly loaded = signal(false);
  readonly saving = signal(false);

  readonly activeDoctors = computed(() => this.doctors().filter((d) => d.active));
  readonly activeChairs = computed(() => this.chairs().filter((c) => c.active));
  readonly doctorById = computed(() => new Map(this.doctors().map((d) => [d.id, d])));
  readonly chairById = computed(() => new Map(this.chairs().map((c) => [c.id, c])));
  readonly roleById = computed(() => new Map(this.roles().map((r) => [r.id, r])));

  doctor(id: string | null | undefined): Doctor | undefined {
    return id ? this.doctorById().get(id) : undefined;
  }

  chair(id: string | null | undefined): Chair | undefined {
    return id ? this.chairById().get(id) : undefined;
  }

  loadCore(): void {
    this.backend
      .listDoctors()
      .subscribe({ next: (d) => this.doctors.set(d), error: (e) => this.notify.failure(e) });
    this.backend.listChairs().subscribe({
      next: (c) => {
        this.chairs.set(c);
        this.loaded.set(true);
      },
      error: (e) => this.notify.failure(e),
    });
  }

  loadRolesAndUsers(): void {
    this.backend
      .listRoles()
      .subscribe({ next: (r) => this.roles.set(r), error: (e) => this.notify.failure(e) });
    this.backend
      .listUsers()
      .subscribe({ next: (u) => this.users.set(u), error: (e) => this.notify.failure(e) });
  }

  saveDoctor(doctor: Omit<Doctor, 'id'> & { id?: string }, done?: () => void): void {
    this.saving.set(true);
    this.backend.saveDoctor(doctor).subscribe({
      next: (saved) => {
        this.doctors.update((list) => upsert(list, saved));
        this.saving.set(false);
        this.notify.success('notify.saved');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  saveChair(chair: Omit<Chair, 'id'> & { id?: string }, done?: () => void): void {
    this.saving.set(true);
    this.backend.saveChair(chair).subscribe({
      next: (saved) => {
        this.chairs.update((list) => upsert(list, saved).sort((a, b) => a.order - b.order));
        this.saving.set(false);
        this.notify.success('notify.saved');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  saveRole(role: Omit<Role, 'id'> & { id?: string }, done?: () => void): void {
    this.saving.set(true);
    this.backend.saveRole(role).subscribe({
      next: (saved) => {
        this.roles.update((list) => upsert(list, saved));
        this.saving.set(false);
        this.notify.success('notify.saved');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }

  saveUser(user: Omit<StaffUser, 'id'> & { id?: string }, done?: () => void): void {
    this.saving.set(true);
    this.backend.saveUser(user).subscribe({
      next: (saved) => {
        this.users.update((list) => upsert(list, saved));
        this.saving.set(false);
        this.notify.success('notify.saved');
        done?.();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.failure(e);
      },
    });
  }
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item];
}
