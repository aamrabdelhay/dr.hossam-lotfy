import 'server-only';

import type { SessionUser } from '@/lib/auth';
import { hasEffectivePermission } from '@/lib/permission-access';
import { permissionsOf } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { isFinanceManagement, isOfficeManager, isSeniorManagement } from '@/lib/office-workflow';
import { FEATURES, type Feature } from '@/lib/feature-directory';
import { filterFeaturesByAccess, type FeatureAccessContext } from '@/lib/feature-access-core';

type AdminSession = Extract<SessionUser, { role: 'admin' }>;
const PERMISSION_KEYS = ['manageUsers', 'manageLawyers', 'manageLocations', 'writeTasks'] as const;

async function permissionSession(session: SessionUser, officeManager: boolean): Promise<AdminSession | null> {
  if (session.role === 'admin') return session;
  if (!session.isAdmin) return null;

  // Mirror the existing API actor conversion for branch managers: a lawyer
  // must have a linked office user account before staff permissions are exposed.
  const lawyer = await prisma.lawyer.findUnique({
    where: { id: session.lawyerId },
    select: { email: true, googleEmail: true },
  });
  const email = (lawyer?.googleEmail || lawyer?.email || '').trim().toLowerCase();
  if (!email) return null;

  const account = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true },
  });
  if (!account) return null;

  if (account.role === 'SUPER_ADMIN' || account.role === 'ADMIN') {
    return {
      role: 'admin',
      userId: account.id,
      name: account.name,
      userRole: account.role === 'ADMIN' ? 'ADMIN' : 'SUPER_ADMIN',
    };
  }

  if (officeManager) {
    return { role: 'admin', userId: account.id, name: account.name, userRole: 'OFFICE_MANAGER' };
  }
  return null;
}

export async function featuresFor(session: SessionUser | null): Promise<Feature[]> {
  if (!session) return [];

  const [senior, officeManager, finance] = await Promise.all([
    isSeniorManagement(session),
    isOfficeManager(session),
    isFinanceManagement(session),
  ]);

  const permissionActor = await permissionSession(session, officeManager);
  const basePermissions = permissionActor ? permissionsOf(permissionActor.userRole) : null;
  const permissions: FeatureAccessContext['permissions'] = basePermissions ? {
    manageUsers: basePermissions.manageUsers,
    manageLawyers: basePermissions.manageLawyers,
    manageLocations: basePermissions.manageLocations,
    writeTasks: basePermissions.writeTasks,
  } : {};

  if (permissionActor) {
    await Promise.all(PERMISSION_KEYS.map(async (key) => {
      permissions[key] = await hasEffectivePermission(permissionActor, key);
    }));
  }

  const isStaff = session.role === 'admin'
    || senior
    || officeManager
    || finance
    || (session.role === 'lawyer' && session.isAdmin);

  const allowedByPermission = filterFeaturesByAccess(FEATURES, {
    isLawyer: session.role === 'lawyer',
    isStaff,
    isSenior: senior,
    isOfficeManager: officeManager,
    isFinance: finance,
    permissions,
  });

  // A few legacy pages have narrower guards than their underlying API permissions.
  // Match the page-level guard as well, so the directory never advertises a dead end.
  return allowedByPermission.filter((feature) => {
    if (feature.id === 'admin-clients') return session.role === 'admin' || officeManager;
    if (feature.id === 'admin-lawyer-guide') return session.role === 'admin';
    if (feature.id === 'admin-lawyers' && session.role === 'lawyer') {
      return permissionActor?.userRole === 'ADMIN' || permissionActor?.userRole === 'SUPER_ADMIN';
    }
    if (feature.id === 'office' || feature.id === 'office-control') {
      return senior || officeManager || finance;
    }
    return true;
  });
}
