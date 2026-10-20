import 'server-only';

import { ApiError, requirePermission, user } from '@/lib/api';
import { getBranchScope } from '@/lib/branch-access';
import { prisma } from '@/lib/prisma';

export async function requireClientFileAccess(clientId: string) {
  const session = await user();
  if (!session) throw new ApiError(401, 'يجب تسجيل الدخول');
  await requirePermission('viewAdmin');

  const clients = await prisma.$queryRawUnsafe<Array<{ id: string; branch_id: string | null }>>(
    `SELECT "id", COALESCE("branch_id", 'branch_main') AS "branch_id"
     FROM "clients" WHERE "id" = $1 LIMIT 1`,
    clientId,
  );
  const client = clients[0];
  if (!client) throw new ApiError(404, 'العميل غير موجود');

  const scope = await getBranchScope(session);
  const clientBranchId = client.branch_id || 'branch_main';
  if (!scope.allBranches && scope.officeManager && !scope.officeManagerBranchIds.includes(clientBranchId)) {
    throw new ApiError(403, 'ليس لديك صلاحية الوصول إلى ملفات هذا العميل');
  }
  return client;
}

export function isPrivateBlobUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.private.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

export function clientFileContentUrl(clientId: string, fileId: string, storedUrl: string | null) {
  if (!isPrivateBlobUrl(storedUrl)) return storedUrl;
  return `/api/clients/${encodeURIComponent(clientId)}/files/${encodeURIComponent(fileId)}/content`;
}
