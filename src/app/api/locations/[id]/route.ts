import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requireAdmin } from '@/lib/api';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  type: z.enum(['COURT', 'INVESTMENT_AGENCY', 'EXPERTS_OFFICE', 'REAL_ESTATE_REGISTRATION', 'GOVERNMENT_AGENCY', 'OTHER']).optional(),
  address: z.string().max(300).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requireAdmin();
  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) return json({ error: 'المكان غير موجود' }, { status: 404 });

  const data = await readJson(req as never, updateSchema);
  const updated = await prisma.location.update({ where: { id }, data });
  await logActivity({
    action: 'EDITED',
    summary: `عدّل بيانات مكان: ${updated.name}`,
    locationId: id,
    byUserId: session.userId,
  });
  return json({ ok: true, location: updated });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requireAdmin();
  const location = await prisma.location.findUnique({ where: { id }, include: { tasks: true } });
  if (!location) return json({ error: 'المكان غير موجود' }, { status: 404 });
  if (location.tasks.length > 0) {
    return json({ error: 'لا يمكن حذف مكان له جلسات أو مهام مسجلة. انقلها أولاً أو احذف المهام.' }, { status: 409 });
  }
  await prisma.location.delete({ where: { id } });
  await logActivity({ action: 'DELETED', summary: `حذف مكاناً: ${location.name}`, byUserId: session.userId });
  return json({ ok: true });
});
