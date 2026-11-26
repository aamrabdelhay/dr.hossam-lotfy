import { ApiError, handle, json, readJson } from '@/lib/api';
import { filterAccessibleCases, requireCaseFileAccess } from '@/lib/case-file-access';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
const create = z.object({ relatedCaseId: z.string().min(1), relation: z.enum(['PARENT', 'APPEAL', 'RELATED', 'CONSOLIDATED']), note: z.string().trim().max(500).optional() });
const patch = z.object({ linkId: z.string().min(1), active: z.boolean() });
type Row = { id: string; other_id: string; other_name: string; other_number: string; relation: string; direction: string; note: string | null };
/** Linked cases tree (item 127). A link is visible only if the viewer may open BOTH cases, so a walled case is never revealed by a link. */
export const GET = handle(async (_r: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await requireCaseFileAccess(id);
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT l."id", c."id" AS other_id, c."name" AS other_name, c."number" AS other_number, l."relation", CASE WHEN l."case_id"=$1 THEN 'OUT' ELSE 'IN' END AS direction, l."note"
       FROM "office_case_links" l JOIN "case_records" c ON c."id" = CASE WHEN l."case_id"=$1 THEN l."related_case_id" ELSE l."case_id" END
      WHERE (l."case_id"=$1 OR l."related_case_id"=$1) AND l."active" ORDER BY l."created_at"`, id);
  const ok = (await filterAccessibleCases(a.session, rows.map((r) => ({ id: r.other_id })))).map((r) => r.id);
  return json({ links: rows.filter((r) => ok.includes(r.other_id)).map((r) => ({ id: r.id, caseId: r.other_id, name: r.other_name, number: r.other_number, relation: r.relation, direction: r.direction, note: r.note })) });
});
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await requireCaseFileAccess(id);
  if (!a.canRequestChanges) throw new ApiError(403, 'لا تملك صلاحية التعديل على هذه القضية');
  const b = await readJson(req, create);
  if (b.relatedCaseId === id) throw new ApiError(400, 'لا يمكن ربط القضية بنفسها');
  const other = await requireCaseFileAccess(b.relatedCaseId);
  if (!other.canRequestChanges) throw new ApiError(403, 'لا تملك صلاحية التعديل على القضية الأخرى');
  const dup = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT "id" FROM "office_case_links" WHERE "active" AND (("case_id"=$1 AND "related_case_id"=$2) OR ("case_id"=$2 AND "related_case_id"=$1)) LIMIT 1`, id, b.relatedCaseId);
  if (dup.length) throw new ApiError(409, 'الربط موجود بالفعل');
  const lid = 'cl_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_case_links"("id","case_id","related_case_id","relation","note","created_by") VALUES ($1,$2,$3,$4,$5,$6)`, lid, id, b.relatedCaseId, b.relation, b.note ?? null, a.session.role === 'admin' ? a.session.userId : a.session.lawyerId);
  return json({ id: lid }, { status: 201 });
});
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await requireCaseFileAccess(id);
  if (!a.canRequestChanges) throw new ApiError(403, 'لا تملك صلاحية التعديل على هذه القضية');
  const b = await readJson(req, patch);
  const n = await prisma.$executeRawUnsafe(`UPDATE "office_case_links" SET "active"=$1 WHERE "id"=$2 AND ("case_id"=$3 OR "related_case_id"=$3)`, b.active, b.linkId, id);
  if (!n) throw new ApiError(404, 'الربط غير موجود');
  return json({ ok: true });
});
