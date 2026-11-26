import type { Feature, FeatureAccess } from '@/lib/feature-directory';

export type FeatureAccessContext = {
  isLawyer: boolean;
  isStaff: boolean;
  isSenior: boolean;
  isOfficeManager: boolean;
  isFinance: boolean;
  permissions: Partial<Record<'manageUsers' | 'manageLawyers' | 'manageLocations' | 'writeTasks', boolean>>;
};

export function hasFeatureAccess(access: FeatureAccess, context: FeatureAccessContext): boolean {
  if (access === 'any') return true;
  if (access === 'lawyer') return context.isLawyer;
  if (access === 'staff') return context.isStaff;
  if (access === 'senior') return context.isSenior;
  if (access === 'officeManager') return context.isOfficeManager;
  if (access === 'finance') return context.isFinance;
  if (access.startsWith('permission:')) {
    const key = access.slice('permission:'.length) as keyof FeatureAccessContext['permissions'];
    return context.isSenior || context.permissions[key] === true;
  }
  return false;
}

export function filterFeaturesByAccess<T extends { access: FeatureAccess }>(
  features: T[],
  context: FeatureAccessContext,
): T[] {
  return features.filter((feature) => hasFeatureAccess(feature.access, context));
}
