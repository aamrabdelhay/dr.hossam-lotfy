import { ApiError, handle, json, readJson } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
const create = z.object({ role: z.enum(['CLIENT', 'OPPONENT', 'WITNESS', 'EXPERT', 'OTHER']), name: z.string().trim().min(2).max(200), phone: z.string().trim().max(40).optional(), note: z.string().trim().max(500).optional() });
const patch = z.object({ partyId: z.string().min(1), active: z.boolean() });
/** Case parties (items 127/135 data). Same case wall as the case files. Deactivate, never delete. */
export const GET = handle(async (_r: Request, ctx: Ctx) => {
  const { id } = await ctx.params; await requireCaseFileAccess(id);
  return json({ parties: await prisma.$queryRawUnsafe(`SELECT "id","role","name","phone","note","active","created_at" FROM "office_case_parties" WHERE "case_id"=$1 AND "active" ORDER BY "role","name"`, id) });
});
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await requireCaseFileAccess(id);
  if (!a.canRequestChanges) throw new ApiError(403, 'لا تملك صلاحية التعديل على هذه القضية');
  const b = await readJson(req, create); const pid = 'cp_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_case_parties"("id","case_id","role","name","phone","note","created_by") VALUES ($1,$2,$3,$4,$5,$6,$7)`, pid, id, b.role, b.name, b.phone ?? null, b.note ?? null, a.session.role === 'admin' ? a.session.userId : a.session.lawyerId);
  return json({ id: pid }, { status: 201 });
});
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await requireCaseFileAccess(id);
  if (!a.canRequestChanges) throw new ApiError(403, 'لا تملك صلاحية التعديل على هذه القضية');
  const b = await readJson(req, patch);
  const n = await prisma.$executeRawUnsafe(`UPDATE "office_case_parties" SET "active"=$1 WHERE "id"=$2 AND "case_id"=$3`, b.active, b.partyId, id);
  if (!n) throw new ApiError(404, 'الطرف غير موجود');
  return json({ ok: true });
});
