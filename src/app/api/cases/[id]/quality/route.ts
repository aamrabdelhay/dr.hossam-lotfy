import { handle, json } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { scoreCase } from '@/lib/case-quality-core';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
/** File completeness score (item 215). Same case wall as opening the case. A checklist of recorded facts, not a legal-quality judgment. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; await requireCaseFileAccess(id);
  const [r] = await prisma.$queryRawUnsafe<{ has_client: boolean; parties: number; files: number; dl: number; chron: number; next_task: number; stale: number; poa: number }[]>(
    `SELECT (c."clientId" IS NOT NULL) AS has_client,
      (SELECT count(*)::int FROM "office_case_parties" p WHERE p."case_id"=c."id") AS parties,
      (SELECT count(*)::int FROM "case_files" f WHERE f."case_id"=c."id" AND f."deleted_at" IS NULL) AS files,
      (SELECT count(*)::int FROM "office_case_deadlines" d WHERE d."case_id"=c."id" AND d."status"<>'CANCELLED') AS dl,
      (SELECT count(*)::int FROM "case_events" e WHERE e."caseId"=c."id") AS chron,
      (SELECT count(*)::int FROM "tasks" t WHERE t."caseId"=c."id" AND t."status" IN ('PENDING','IN_PROGRESS') AND t."scheduledDate" >= CURRENT_DATE) AS next_task,
      (SELECT count(*)::int FROM "case_files" f WHERE f."case_id"=c."id" AND f."deleted_at" IS NULL AND f."review_status"='IN_REVIEW' AND f."created_at" < NOW() - INTERVAL '7 days') AS stale,
      (SELECT count(*)::int FROM "office_case_register" g WHERE g."case_id"=c."id" AND g."kind"='POA') AS poa
     FROM "case_records" c WHERE c."id"=$1`, id);
  return json({ ...scoreCase({ hasClient: r.has_client, parties: r.parties, files: r.files, hasDeadline: r.dl > 0, hasChronology: r.chron > 0, hasUpcomingTask: r.next_task > 0, staleReviewFiles: r.stale, hasPowerOfAttorney: r.poa > 0 }), notice: 'قائمة اكتمال الملف فقط. ليست تقييمًا قانونيًا لموضوع القضية.' });
});
