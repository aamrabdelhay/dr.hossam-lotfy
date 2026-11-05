import 'server-only';
import { can, type Permissions } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';

type AdminSession = Extract<SessionUser, { role: 'admin' }>;

export async function hasEffectivePermission(session: AdminSession, permission: keyof Permissions): Promise<boolean> {
  // The super-admin role is a protected break-glass role and cannot be delegated away.
  if (session.userRole === 'SUPER_ADMIN' || session.userRole === 'ADMIN') return true;

  const overrides = await prisma.$queryRawUnsafe<Array<{ allowed: boolean }>>(
    `SELECT "allowed" FROM "office_user_permission_overrides"
      WHERE "user_id"=$1 AND "permission_key"=$2 AND "scope_key"='GLOBAL'
        AND "revoked_at" IS NULL
      LIMIT 1`,
    session.userId,
    permission,
  );
  if (overrides.length) return overrides[0].allowed;

  if (can(session.userRole, permission)) return true;

  const delegations = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "office_permission_delegations"
      WHERE "grantee_user_id"=$1 AND "permission_key"=$2
        AND "revoked_at" IS NULL AND "starts_at" <= NOW() AND "expires_at" > NOW()
      ORDER BY "expires_at" DESC LIMIT 1`,
    session.userId,
    permission,
  );
  return delegations.length > 0;
}
