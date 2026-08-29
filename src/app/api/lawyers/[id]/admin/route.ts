import { z } from 'zod';
import { handle, json, readJson, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ isAdmin: z.boolean() });

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const data = await readJson(req as never, schema);
  const lawyer = await prisma.lawyer.findUnique({ where: { id } });
  if (!lawyer) return json({ error: 'المحامي غير موجود' }, { status: 404 });
  const email = (lawyer.googleEmail || lawyer.email || '').trim().toLowerCase();
  if (!email) return json({ error: 'يجب إضافة بريد إلكتروني للمحامي قبل منحه صلاحية الادمن.' }, { status: 400 });

  if (data.isAdmin) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { name: lawyer.fullName, role: 'SUPER_ADMIN' } });
    } else {
      const passwordHash = bcrypt.hashSync(crypto.randomBytes(32).toString('base64url'), 10);
      await prisma.user.create({ data: { name: lawyer.fullName, email, passwordHash, role: 'SUPER_ADMIN' } });
    }
  } else {
    await prisma.user.deleteMany({ where: { email, role: { in: ['SUPER_ADMIN', 'ADMIN'] } } });
  }

  await logActivity({ action: data.isAdmin ? 'LAWYER_ADMIN_GRANTED' : 'LAWYER_ADMIN_REVOKED', summary: `${data.isAdmin ? 'منح' : 'أزال'} صلاحية الادمن للمحامي: ${lawyer.fullName}`, lawyerId: lawyer.id, byUserId: session.userId });
  return json({ ok: true, isAdmin: data.isAdmin });
});
