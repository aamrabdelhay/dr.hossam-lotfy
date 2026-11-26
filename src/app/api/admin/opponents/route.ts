import { ApiError, actorOf, handle, json } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
/** Repeat opponents (item 135). Senior management only, because the list spans every case including walled ones. Matches by exact name (case-insensitive) as text; a person confirms identity. */
export const GET = handle(async () => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'قاعدة الخصوم المتكررين للإدارة العليا فقط');
  const rows = await prisma.$queryRawUnsafe<{ name: string; cases: number; case_ids: string[]; numbers: string[] }[]>(
    `SELECT min(p."name") AS name, count(DISTINCT p."case_id")::int AS cases, array_agg(DISTINCT p."case_id") AS case_ids, array_agg(DISTINCT c."number") AS numbers
       FROM "office_case_parties" p JOIN "case_records" c ON c."id"=p."case_id"
      WHERE p."role"='OPPONENT' AND p."active" GROUP BY lower(trim(p."name")) HAVING count(DISTINCT p."case_id") > 1 ORDER BY cases DESC, name LIMIT 200`);
  return json({ opponents: rows, notice: 'تطابق نصي بالاسم فقط. التأكد من هوية الخصم للإدارة العليا.' });
});
