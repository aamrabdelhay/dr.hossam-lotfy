import 'server-only';
import type { StaffRole } from './constants';

/**
 * Server-side RBAC. The client never decides permissions — every API route
 * and server component validates through these helpers.
 *
 * ADMIN is a legacy alias of SUPER_ADMIN.
 */

export type Permissions = {
  manageUsers: boolean; // create/edit staff accounts & roles
  manageLawyers: boolean; // lawyer profiles & access tokens
  manageLocations: boolean; // create/edit/delete locations
  writeTasks: boolean; // create/edit/assign tasks & sessions
  comment: boolean;
  viewAdmin: boolean; // enter the admin area at all
};

const MATRIX: Record<string, Permissions> = {
  ADMIN: {
    manageUsers: true, manageLawyers: true, manageLocations: true,
    writeTasks: true, comment: true, viewAdmin: true,
  },
  SUPER_ADMIN: {
    manageUsers: true, manageLawyers: true, manageLocations: true,
    writeTasks: true, comment: true, viewAdmin: true,
  },
  OFFICE_MANAGER: {
    manageUsers: false, manageLawyers: true, manageLocations: true,
    writeTasks: true, comment: true, viewAdmin: true,
  },
  SECRETARY: {
    manageUsers: false, manageLawyers: false, manageLocations: true,
    writeTasks: true, comment: true, viewAdmin: true,
  },
  LAWYER: {
    manageUsers: false, manageLawyers: false, manageLocations: false,
    writeTasks: true, comment: true, viewAdmin: true,
  },
  VIEWER: {
    manageUsers: false, manageLawyers: false, manageLocations: false,
    writeTasks: false, comment: false, viewAdmin: true,
  },
};

export function permissionsOf(role: string | null | undefined): Permissions {
  if (!role) {
    return {
      manageUsers: false, manageLawyers: false, manageLocations: false,
      writeTasks: false, comment: false, viewAdmin: false,
    };
  }
  return MATRIX[role] ?? MATRIX.VIEWER;
}

export function isStaffRole(role: string | null | undefined): boolean {
  return !!role && role in MATRIX;
}

export function can(role: string | null | undefined, action: keyof Permissions): boolean {
  return permissionsOf(role)[action];
}
