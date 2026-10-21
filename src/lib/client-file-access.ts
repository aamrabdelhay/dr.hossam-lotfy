import 'server-only';

import { ApiError, requirePermission, user } from '@/lib/api';
import { getBranchScope } from '@/lib/branch-access';
import { prisma } from '@/lib/prisma';
import { parsePrivateS3Url } from '@/lib/client-file-s3';

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
  if (
    !scope.allBranches &&
    (scope.officeManager || scope.financeManager) &&
    !scope.branchIds.includes(clientBranchId)
  ) {
    throw new ApiError(403, 'ليس لديك صلاحية الوصول إلى ملفات هذا العميل');
  }
  return client;
}

export function isPrivateBlobUrl(value: string | null | undefined, clientId?: string): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;

    const storeId = process.env.BLOB_STORE_ID?.trim().toLowerCase();
    const storeIds = storeId ? new Set([storeId, storeId.replace(/^store_/, '')]) : new Set<string>();
    const isExpectedStore = storeIds.size
      ? Array.from(storeIds).some((id) => id && url.hostname.toLowerCase() === `${id}.private.blob.vercel-storage.com`)
      : process.env.NODE_ENV !== 'production' &&
        url.hostname.toLowerCase().endsWith('.private.blob.vercel-storage.com');

    if (!isExpectedStore) return false;
    if (clientId && !url.pathname.startsWith(`/clients/${clientId}/`)) return false;
    return true;
  } catch {
    return false;
  }
}

export function clientFileContentUrl(clientId: string, fileId: string, storedUrl: string | null) {
  if (!storedUrl) return storedUrl;

  // S3 objects are stored privately in the database using an s3:// URI.
  // Never expose that internal URI to the browser. Route reads/downloads
  // through our authenticated endpoint so branch/client access is enforced.
  if (storedUrl.startsWith('s3://')) {
    if (!parsePrivateS3Url(storedUrl, clientId)) return null;
    return `/api/clients/${encodeURIComponent(clientId)}/files/${encodeURIComponent(fileId)}/content`;
  }

  if (storedUrl.includes('.private.blob.vercel-storage.com')) {
    if (!isPrivateBlobUrl(storedUrl, clientId)) return null;
    return `/api/clients/${encodeURIComponent(clientId)}/files/${encodeURIComponent(fileId)}/content`;
  }
  return storedUrl;
}
