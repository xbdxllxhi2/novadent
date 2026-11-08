import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AuthStore } from '../../core/auth/auth.store';
import {
  PERMISSIONS,
  Permission,
  PermissionGroup,
  Role,
  permissionGroup,
  permissionLabelKey,
} from '../../core/auth/permission.model';
import type { StaffUser } from '../../domain/staff/staff.model';
import { StaffStore } from '../../domain/staff/staff.store';
import { StatusTag } from '../../shared/ui/status-tag';

type UserDraft = Omit<StaffUser, 'id'> & { id?: string };
type RoleDraft = Omit<Role, 'id'> & { id?: string };

interface PermissionGroupView {
  group: PermissionGroup;
  permissions: Permission[];
}

const GROUPS: PermissionGroupView[] = (() => {
  const map = new Map<PermissionGroup, Permission[]>();
  for (const p of PERMISSIONS) {
    const g = permissionGroup(p);
    map.set(g, [...(map.get(g) ?? []), p]);
  }
  return [...map.entries()].map(([group, permissions]) => ({ group, permissions }));
})();

@Component({
  selector: 'app-staff-roles-settings',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    Checkbox,
    Dialog,
    InputText,
    Select,
    TableModule,
    ToggleSwitch,
    StatusTag,
  ],
  templateUrl: './staff-roles-settings.html',
  host: { class: 'flex flex-col gap-4' },
})
export class StaffRolesSettings implements OnInit {
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);
  private readonly transloco = inject(TranslocoService);

  protected readonly canManage = computed(() => this.auth.can('staff.manage'));
  protected readonly groups = GROUPS;
  protected readonly labelKey = permissionLabelKey;

  protected readonly userOpen = signal(false);
  protected readonly user = signal<UserDraft>(emptyUser());
  protected readonly roleOpen = signal(false);
  protected readonly role = signal<RoleDraft>(emptyRole());

  protected readonly roleOptions = computed(() =>
    this.staff.roles().map((r) => ({ id: r.id, label: this.roleName(r) })),
  );
  protected readonly doctorOptions = computed(() => [
    { id: null as string | null, nameLatin: this.transloco.translate('staff.noDoctor') },
    ...this.staff
      .activeDoctors()
      .map((d) => ({ id: d.id as string | null, nameLatin: d.nameLatin })),
  ]);

  ngOnInit(): void {
    this.staff.loadRolesAndUsers();
  }

  protected roleName(role: Role | undefined): string {
    if (!role) return '';
    return role.name.startsWith('roles.') ? this.transloco.translate(role.name) : role.name;
  }

  protected editUser(u?: StaffUser): void {
    this.user.set(u ? { ...u } : { ...emptyUser(), roleId: this.staff.roles()[0]?.id ?? '' });
    this.userOpen.set(true);
  }

  protected patchUser(patch: Partial<UserDraft>): void {
    this.user.update((u) => ({ ...u, ...patch }));
  }

  protected saveUser(): void {
    const u = this.user();
    if (!u.displayName.trim() || !u.username.trim() || !u.roleId) return;
    this.staff.saveUser(
      { ...u, displayName: u.displayName.trim(), username: u.username.trim().toLowerCase() },
      () => this.userOpen.set(false),
    );
  }

  protected editRole(r?: Role): void {
    this.role.set(
      r ? { ...r, permissions: [...r.permissions], name: this.roleName(r) } : emptyRole(),
    );
    this.roleOpen.set(true);
  }

  protected hasPermission(p: Permission): boolean {
    return this.role().permissions.includes(p);
  }

  protected togglePermission(p: Permission, checked: boolean): void {
    this.role.update((r) => ({
      ...r,
      permissions: checked
        ? [...new Set([...r.permissions, p])]
        : r.permissions.filter((x) => x !== p),
    }));
  }

  protected saveRole(): void {
    const r = this.role();
    if (!r.name.trim() || r.locked) return;
    // Built-in roles keep their translation key as name unless renamed.
    const original = r.id ? this.staff.roles().find((x) => x.id === r.id) : undefined;
    const name =
      original && original.name.startsWith('roles.') && this.roleName(original) === r.name.trim()
        ? original.name
        : r.name.trim();
    this.staff.saveRole({ ...r, name }, () => this.roleOpen.set(false));
  }
}

function emptyUser(): UserDraft {
  return { username: '', displayName: '', roleId: '', doctorId: null, active: true };
}

function emptyRole(): RoleDraft {
  return {
    name: '',
    builtIn: false,
    locked: false,
    permissions: ['patient.read', 'appointment.read'],
  };
}
