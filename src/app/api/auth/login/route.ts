import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { UserRole } from '@/generated/prisma/client';
import { createSessionCookie, safeComparePassword } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';
import { isStaffRole } from '@/lib/rbac';
import { rateLimit, rateLimitReset, loginRateKey } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح').optional(),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

/**
 * Staff login. Password is compared (timing-safe) against the bcrypt hash in
 * the database. Rate-limited to 5 attempts / 15 minutes per IP+email.
 * The session cookie is an opaque random token (HMAC-signed, httpOnly).
 */
export const POST = handle(async (req: Request) => {
  const { email, password } = await readJson(req as never, schema);

  const key = loginRateKey(req, email ?? 'admin');
  const rl = rateLimit(key, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `محاولات كثيرة — أعد المحاولة بعد ${Math.ceil(rl.retryAfterSec / 60)} دقيقة.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const staffRoles: UserRole[] = ['ADMIN', 'SUPER_ADMIN', 'OFFICE_MANAGER', 'SECRETARY', 'LAWYER', 'VIEWER'];
  const admin = email
    ? await prisma.user.findFirst({ where: { email: email.toLowerCase().trim(), role: { in: staffRoles } } })
    : await prisma.user.findFirst({ where: { role: { in: staffRoles } }, orderBy: { createdAt: 'asc' } });

  if (!admin || !safeComparePassword(password, admin.passwordHash)) {
    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة.' }, { status: 401 });
  }

  rateLimitReset(key);

  const cookie = await createSessionCookie({
    role: 'admin',
    userId: admin.id,
    userRole: isStaffRole(admin.role) ? admin.role : 'SUPER_ADMIN',
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: req.headers.get('user-agent') ?? undefined,
  });
  const res = NextResponse.json({ ok: true, name: admin.name, role: admin.role });
  res.cookies.set(cookie.name, cookie.value, cookie.options as never);
  return res;
});
