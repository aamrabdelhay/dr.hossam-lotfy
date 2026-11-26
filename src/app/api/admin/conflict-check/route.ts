import { ApiError, actorOf, handle, json, readJson } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { logAuditEvent } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const body = z.object({ name: z.string().trim().min(3).max(200), phone: z.string().trim().max(30).optional() });
/** Conflict check (item 129). Senior management only, because the answer includes walled and confidential cases (a partial answer would reveal that a hidden case exists). It lists possible matches by name text and phone; a person decides. It never decides a conflict. Each check is audited. */
export const POST = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'كشف تعارض المصالح للإدارة العليا فقط');
  const b = await readJson(req, body); const like = '%' + b.name.replace(/[%_\\]/g, '\\$&') + '%';
  const [clients, cases] = await Promise.all([
    prisma.$queryRawUnsafe<{ id: string; name: string; phone: string | null; status: string }[]>(`SELECT "id","name","phone","status"::text AS status FROM "clients" WHERE "name" ILIKE $1 OR ($2::text IS NOT NULL AND "phone" = $2) LIMIT 50`, like, b.phone ?? null),
    prisma.$queryRawUnsafe<{ id: string; name: string; number: string; client_name: string | null; protected: boolean }[]>(
      `SELECT c."id", c."name", c."number", c."clientName" AS client_name, COALESCE(s."ethical_wall_enabled" OR s."classification" IN ('HIGHLY_CONFIDENTIAL','CONFIDENTIAL'), false) AS protected
         FROM "case_records" c LEFT JOIN "office_case_security" s ON s."case_id"=c."id"
        WHERE c."name" ILIKE $1 OR c."clientName" ILIKE $1 OR c."description" ILIKE $1 LIMIT 50`, like),
  ]);
  await logAuditEvent({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null, action: 'CONFLICT_CHECK', resourceType: 'conflict_check', resourceId: null, summary: 'كشف تعارض مصالح', metadata: { clients: clients.length, cases: cases.length } });
  return json({ clients, cases, notice: 'تطابق نصي محتمل فقط. القرار بوجود تعارض للإدارة العليا.' });
});
