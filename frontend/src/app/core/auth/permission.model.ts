import type { StaffUser } from '../../domain/staff/staff.model';

/**
 * The fixed permission vocabulary. Roles are named bundles of these; the code checks permissions,
 * never role names. Adding a permission means shipping a feature, so this list only changes with
 * the code. Translation labels live under `permissions.<code with dots replaced by underscores>`.
 */
export const PERMISSIONS = [
  'patient.read',
  'patient.write',
  'patient.archive',
  'appointment.read',
  'appointment.write',
  'appointment.cancel',
  'appointment.block',
  'chart.read',
  'chart.write',
  'chart.manage',
  'plan.read',
  'plan.write',
  'plan.accept',
  'note.read',
  'note.write',
  'document.read',
  'document.write',
  'attachment.read',
  'attachment.write',
  'task.read',
  'task.write',
  'task.complete',
  'procedure.read',
  'procedure.manage',
  'invoice.read',
  'invoice.write',
  'invoice.void',
  'payment.write',
  'payment.void',
  'report.production',
  'report.export',
  'settings.read',
  'settings.manage',
  'staff.read',
  'staff.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Groups used by the role editor; the prefix before the dot. */
export type PermissionGroup = Permission extends `${infer G}.${string}` ? G : never;

export function permissionGroup(p: Permission): PermissionGroup {
  return p.split('.')[0] as PermissionGroup;
}

export function permissionLabelKey(p: Permission): string {
  return `permissions.${p.replace('.', '_')}`;
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export interface Role {
  id: string;
  /** Translation key for built-in roles (`roles.owner`), free text for custom ones. */
  name: string;
  builtIn: boolean;
  /** The Owner role cannot be edited or deleted. */
  locked: boolean;
  permissions: Permission[];
}

export interface AuthSession {
  user: StaffUser;
  role: Role;
  permissions: Permission[];
  /** Set when the user is also a doctor: used for ownership rules and defaults. */
  doctorId: string | null;
}

/** What the sign-in page lists under the mock backend. */
export interface DemoUser {
  id: string;
  displayName: string;
  username: string;
  roleId: string;
  roleName: string;
  doctorId: string | null;
}
