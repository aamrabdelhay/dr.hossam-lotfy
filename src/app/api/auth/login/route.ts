import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildSessionCookie, safeComparePassword } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';

const schema = z.object({ password: z.string().min(1, 'كلمة المرور مطلوبة') });

/**
 * Admin login. The password is compared (timing-safe) against the hash stored
 * in the database — nothing is hardcoded in frontend code.
 */
export const POST = handle(async (req: Request) => {
  const { password } = await readJson(req as never, schema);
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin || !safeComparePassword(password, admin.passwordHash)) {
    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة.' }, { status: 401 });
  }
  const cookie = buildSessionCookie({ role: 'admin', id: admin.id });
  const res = NextResponse.json({ ok: true, name: admin.name });
  res.cookies.set(cookie.name, cookie.value, cookie.options as never);
  return res;
});
