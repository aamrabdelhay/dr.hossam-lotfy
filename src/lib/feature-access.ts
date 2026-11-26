import 'server-only';

import type { SessionUser } from '@/lib/auth';
import { hasEffectivePermission } from '@/lib/permission-access';
import { permissionsOf } from '@/lib/rbac';
import { isFinanceManagement, isOfficeManager, isSeniorManagement } from '@/lib/office-workflow';
import { FEATURES, type Feature } from '@/lib/feature-directory';
import { filterFeaturesByAccess, type FeatureAccessContext } from '@/lib/feature-access-core';

const PERMISSION_KEYS = ['manageUsers', 'manageLawyers', 'manageLocations', 'writeTasks'] as const;

export async function featuresFor(session: SessionUser | null): Promise<Feature[]> {
  if (!session) return [];

  const [senior, officeManager, finance] = await Promise.all([
    isSeniorManagement(session),
    isOfficeManager(session),
    isFinanceManagement(session),
  ]);

  const basePermissions = session.role === 'admin' ? permissionsOf(session.userRole) : null;
  const permissions: FeatureAccessContext['permissions'] = basePermissions ? {
    manageUsers: basePermissions.manageUsers,
    manageLawyers: basePermissions.manageLawyers,
    manageLocations: basePermissions.manageLocations,
    writeTasks: basePermissions.writeTasks,
  } : {};

  if (session.role === 'admin') {
    await Promise.all(PERMISSION_KEYS.map(async (key) => {
      // The effective permission check applies active overrides and delegations.
      permissions[key] = await hasEffectivePermission(session, key);
    }));
  }

  const isStaff = session.role === 'admin'
    || senior
    || officeManager
    || finance
    || (session.role === 'lawyer' && session.isAdmin);

  return filterFeaturesByAccess(FEATURES, {
    isLawyer: session.role === 'lawyer',
    isStaff,
    isSenior: senior,
    isOfficeManager: officeManager,
    isFinance: finance,
    permissions,
  });
}
