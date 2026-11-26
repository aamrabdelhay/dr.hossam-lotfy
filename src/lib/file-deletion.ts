import 'server-only';

import type { SessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { officeId, notifySenior } from '@/lib/office-workflow';

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

/**
 * Files are NEVER deleted automatically. When the 31-day archive period ends,
 * the item is only marked ARCHIVE_EXPIRED, stays stored, and senior management
 * is notified once. Restoring, extending or any permanent action needs a new
 * explicit senior decision (permanent deletion is not implemented here).
 */
export async function markExpiredArchives() {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; file_name: string }>>(
    `UPDATE "office_file_deletion_requests"
        SET "status"='ARCHIVE_EXPIRED',"archive_expired_at"=NOW()
      WHERE "status"='APPROVED' AND "archive_expires_at" IS NOT NULL AND "archive_expires_at" <= NOW()
      RETURNING "id","file_name"`,
  );
  for (const row of rows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "office_audit_events" ("id","action","resource_type","resource_id","summary","metadata")
       VALUES ($1,'ARCHIVE_PERIOD_ENDED','file_deletion_request',$2,$3,$4::jsonb)`,
      officeId('audit'), row.id,
      'انتهت مدة أرشفة الملف البالغة 31 يومًا. الملف ما زال محفوظًا ولم يُحذف.',
      JSON.stringify({ autoDeleted: false }),
    ).catch((error) => console.error('[file-deletion] Audit insert failed:', error));
    await notifySenior(
      'انتهت مدة أرشفة ملف',
      'انتهت مدة 31 يومًا للملف «' + row.file_name + '». الملف ما زال محفوظًا ولن يُحذف تلقائيًا. القرار بيد الإدارة العليا.',
      '/admin/office/control',
    ).catch((error) => console.error('[file-deletion] Senior notification failed:', error));
  }
  return { expired: rows.length, autoDeleted: 0 };
}
