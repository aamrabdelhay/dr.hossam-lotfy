import 'server-only';

import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { del } from '@vercel/blob';
import type { SessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { officeId, notifySenior } from '@/lib/office-workflow';
import { getS3Client, parsePrivateS3Url, parsePrivateS3UrlForPrefix } from '@/lib/client-file-s3';
import { isPrivateBlobUrl } from '@/lib/client-file-access';

export type DeletableFileType = 'client' | 'case';

export async function createFileDeletionRequest(input: {
  session: SessionUser;
  fileType: DeletableFileType;
  fileId: string;
  resourceId: string;
  fileName: string;
  fileKind: string;
  mimeType: string | null;
  sizeBytes: number | null;
  storageUrl: string;
  textContent?: string | null;
  reason: string;
}) {
  const id = officeId('filedel');
  const userId = input.session.role === 'admin' ? input.session.userId : null;
  const lawyerId = input.session.role === 'lawyer' ? input.session.lawyerId : null;
  const inserted = await prisma.$queryRawUnsafe<Array<{id:string}>>(
    `INSERT INTO "office_file_deletion_requests"
      ("id","file_type","file_id","resource_id","file_name","file_kind","mime_type","size_bytes","storage_url","text_content","reason","requested_by_user_id","requested_by_lawyer_id")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT DO NOTHING RETURNING "id"`,
    id,input.fileType,input.fileId,input.resourceId,input.fileName,input.fileKind,
    input.mimeType,input.sizeBytes,input.storageUrl,input.textContent ?? null,input.reason,userId,lawyerId,
  );
  if (!inserted.length) {
    const existing = await prisma.$queryRawUnsafe<Array<{id:string}>>(
      `SELECT "id" FROM "office_file_deletion_requests"
       WHERE "file_type"=$1 AND "file_id"=$2 AND "status"='PENDING'
       ORDER BY "requested_at" DESC LIMIT 1`,
      input.fileType,input.fileId,
    );
    return { id: existing[0]?.id ?? null, duplicate: true };
  }
  const notice = 'طلب ' + input.session.name + ' حذف الملف «' + input.fileName + '». السبب: ' + input.reason;
  await notifySenior('طلب حذف ملف يحتاج إلى موافقة',notice,'/admin/office/control')
    .catch((error) => console.error('[file-deletion] Senior notification failed:',error));
  return { id, duplicate: false };
}

export async function purgeExpiredApprovedFiles() {
  const rows = await prisma.$queryRawUnsafe<Array<{
    id:string; file_type:'client'|'case'; file_id:string; resource_id:string;
    storage_url:string; archive_id:string|null;
  }>>(
    `SELECT "id","file_type","file_id","resource_id","storage_url","archive_id"
     FROM "office_file_deletion_requests"
     WHERE "status"='APPROVED' AND "purged_at" IS NULL
       AND "archive_expires_at" IS NOT NULL AND "archive_expires_at" <= NOW()
     ORDER BY "archive_expires_at" ASC LIMIT 100`,
  );
  let purged = 0;
  let failed = 0;
  for (const row of rows) {
    const claimed = await prisma.$executeRawUnsafe(
      `UPDATE "office_file_deletion_requests"
       SET "status"='PURGED',"purged_at"=NOW()
       WHERE "id"=$1 AND "status"='APPROVED' AND "purged_at" IS NULL
         AND "archive_expires_at" IS NOT NULL AND "archive_expires_at" <= NOW()`,
      row.id,
    ).catch(() => 0);
    if (!claimed) continue;
    try {
      const s3Object = row.file_type === 'case'
        ? parsePrivateS3UrlForPrefix(row.storage_url,'cases/' + row.resource_id + '/')
        : parsePrivateS3Url(row.storage_url,row.resource_id);
      if (s3Object) {
        await getS3Client().send(new DeleteObjectCommand({Bucket:s3Object.bucket,Key:s3Object.key}));
      } else if (row.file_type === 'client' && isPrivateBlobUrl(row.storage_url,row.resource_id)) {
        await del(row.storage_url);
      } else {
        throw new Error('Stored file URL is not owned by the configured private storage.');
      }
      await prisma.$transaction(async (tx) => {
        if (row.file_type === 'case') {
          await tx.$executeRawUnsafe(
            `DELETE FROM "case_files" WHERE "id"=$1 AND "case_id"=$2 AND "deleted_at" IS NOT NULL`,
            row.file_id,row.resource_id,
          );
        } else {
          await tx.$executeRawUnsafe(
            `DELETE FROM "client_files" WHERE "id"=$1 AND "client_id"=$2 AND "deleted_at" IS NOT NULL`,
            row.file_id,row.resource_id,
          );
        }
        if (row.archive_id) {
          await tx.$executeRawUnsafe(`DELETE FROM "office_archive" WHERE "id"=$1 AND "expires_at" <= NOW()`,row.archive_id);
        }
      });
      purged += 1;
    } catch (error) {
      failed += 1;
      await prisma.$executeRawUnsafe(
        `UPDATE "office_file_deletion_requests" SET "status"='APPROVED',"purged_at"=NULL
         WHERE "id"=$1 AND "status"='PURGED'`,
        row.id,
      ).catch(() => undefined);
      console.error('[file-deletion] Expired approved file purge failed:',row.id,error);
    }
  }
  return {checked:rows.length,purged,failed};
}
