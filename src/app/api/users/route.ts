import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requireAdmin } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { ASSIGNABLE_ROLES } from '@/lib/constants';

/**
 * Staff account management — SUPER_ADMIN only (requireAdmin).
 * The RBAC matrix grants manageUsers to SUPER_ADMIN/ADMIN exclusively.
 */

const createSchema = z.object({
  name: z.string().min(3, 'الاسم مطلوب').max(120),
  email: z.string().email('بريد إلكتروني غير صالح').max(160),
  password: z.string().min(8, 'كلمة المرور 8 أحرف على الأقل').max(200).optional(),
  role: z.enum(ASSIGNABLE_ROLES, { message: 'اختر دوراً صحيحاً' }),
});

export const GET = handle(async () => {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: [{ createdAt: 'asc' }], select: { id: true, name: true, email: true, role: true, createdAt: true } });
  return json({ users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })) });
});

export const POST = handle(async (req: Request) => {
  const session = await requireAdmin();
  const data = await readJson(req as never, createSchema);
  const email = data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return json({ error: 'يوجد حساب بهذا البريد الإلكتروني بالفعل' }, { status: 409 });

  // A staff identity created by selecting a lawyer does not require manual password entry.
  // Keep a random server-only password hash for schema compatibility; authentication remains
  // controlled by the application's approved login flows.
  const generatedPassword = data.password ?? crypto.randomBytes(32).toString('base64url');
  const created = await prisma.user.create({
    data: { name: data.name.trim(), email, passwordHash: bcrypt.hashSync(generatedPassword, 10), role: data.role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await logActivity({ action: 'USER_ADDED', summary: `أضاف حساب فريق: ${created.name} (${created.role})`, byUserId: session.userId });
  return json({ ok: true, user: { ...created, createdAt: created.createdAt.toISOString() } }, { status: 201 });
});
