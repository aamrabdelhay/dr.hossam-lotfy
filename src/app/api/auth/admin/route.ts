import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSessionCookie } from '@/lib/auth';
import { handle, json, readJson } from '@/lib/api';

/** The office administration access code. Only this exact value is accepted. */
const ADMIN_CODE = 'hl';

const loginSchema = z.object({ code: z.string().min(1).max(64) });

/**
 * Admin sign-in by code only. Any code other than the configured one is
 * rejected with 401 — there is no e-mail/password admin login anymore.
 */
export const POST = handle(async (req: Request) => {
  const { code } = await readJson(req, loginSchema);

  if (code !== ADMIN_CODE) {
    return json({ error: 'رمز الدخول غير صحيح' }, { status: 401 });
  }

  const admin = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'OFFICE_MANAGER', 'SECRETARY'] } },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) {
    return json({ error: 'لا يوجد مستخدم إدارة مهيأ في قاعدة البيانات.' }, { status: 503 });
  }

  const cookie = await createSessionCookie({
    role: 'admin',
    userId: admin.id,
    userRole: admin.role,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: req.headers.get('user-agent') ?? undefined,
  });

  const res = NextResponse.json({ ok: true, name: admin.name, role: admin.role });
  res.cookies.set(cookie.name, cookie.value, cookie.options as never);
  return res;
});
