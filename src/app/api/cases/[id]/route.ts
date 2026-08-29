import { z } from 'zod';
import { handle, json, readJson, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ name: z.string().min(1).max(200).optional(), number: z.string().min(1).max(120).optional(), clientName: z.string().max(200).nullable().optional(), description: z.string().max(4000).nullable().optional() });

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const data = await readJson(req as never, schema);
  const existing = await prisma.caseRecord.findUnique({ where: { id } });
  if (!existing) return json({ error: 'القضية غير موجودة' }, { status: 404 });
  const updated = await prisma.caseRecord.update({ where: { id }, data });
  await prisma.caseEvent.create({ data: { caseId: id, description: 'تم تعديل بيانات القضية من الإدارة.', type: 'edit', authorName: session.name } });
  await logActivity({ action: 'CASE_UPDATED', summary: `عدّل بيانات القضية: ${updated.name} (${updated.number})`, byUserId: session.userId });
  return json({ ok: true, case: updated });
});
