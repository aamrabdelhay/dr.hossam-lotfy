import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

type RetentionPolicy = { resource_type: 'case_file' | 'client_file'; retention_days: number; enabled: boolean };

export async function recordRetentionReviewCandidates() {
  const policies = await prisma.$queryRawUnsafe<RetentionPolicy[]>(
    'SELECT "resource_type","retention_days","enabled" FROM "office_retention_policies" WHERE "enabled"=TRUE',
  );
  let queued = 0;
  let checked = 0;

  for (const policy of policies) {
    const rows = policy.resource_type === 'case_file'
      ? await prisma.$queryRawUnsafe<Array<{ file_id: string; resource_id: string; file_name: string; file_created_at: Date }>>(
          `SELECT f."id" AS "file_id",f."case_id" AS "resource_id",f."name" AS "file_name",f."created_at" AS "file_created_at"
             FROM "case_files" f
            WHERE f."deleted_at" IS NULL
              AND f."created_at" <= NOW() - make_interval(days => $1)
              AND NOT EXISTS (SELECT 1 FROM "office_retention_reviews" r WHERE r."resource_type"='case_file' AND r."file_id"=f."id')
            ORDER BY f."created_at" ASC LIMIT 500`,
          policy.retention_days,
        )
      : await prisma.$queryRawUnsafe<Array<{ file_id: string; resource_id: string; file_name: string; file_created_at: Date }>>(
          `SELECT f."id" AS "file_id",f."client_id" AS "resource_id",f."name" AS "file_name",f."created_at" AS "file_created_at"
             FROM "client_files" f
            WHERE f."deleted_at" IS NULL
              AND f."created_at" <= NOW() - make_interval(days => $1)
              AND NOT EXISTS (SELECT 1 FROM "office_retention_reviews" r WHERE r."resource_type"='client_file' AND r."file_id"=f."id')
            ORDER BY f."created_at" ASC LIMIT 500`,
          policy.retention_days,
        );

    checked += rows.length;
    for (const row of rows) {
      const result = await prisma.$executeRawUnsafe(
        `INSERT INTO "office_retention_reviews"
          ("id","resource_type","file_id","resource_id","file_name","file_created_at")
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("resource_type","file_id") DO NOTHING`,
        'retention_' + crypto.randomUUID().replaceAll('-', ''),
        policy.resource_type,
        row.file_id,
        row.resource_id,
        row.file_name,
        row.file_created_at,
      );
      queued += Number(result || 0);
    }
  }

  if (checked || queued) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "office_audit_events" ("id","action","resource_type","summary","metadata")
       VALUES ($1,'RETENTION_REVIEW_SCAN','retention_policy',$2,$3::jsonb)`,
      'audit_' + crypto.randomUUID().replaceAll('-', ''),
      'تم فحص سياسات الاحتفاظ وإضافة الملفات المستحقة للمراجعة دون حذفها.',
      JSON.stringify({ checked, queued }),
    ).catch((error) => console.error('[retention] Audit insert failed:', error));
  }
  return { checked, queued, enabledPolicies: policies.length };
}
