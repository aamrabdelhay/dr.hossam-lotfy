import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSessionCookie } from '@/lib/auth';
import { handle, json, readJson } from '@/lib/api';

const FALLBACK_ADMIN_EMAIL = 'admin@hossam-lotfy.local';

const loginSchema = z.object({ code: z.string().min(1).max(128) });

function matchesAdminCode(supplied: string, configured: string): boolean {
  const suppliedDigest = createHash('sha256').update(supplied, 'utf8').digest();
  const configuredDigest = createHash('sha256').update(configured, 'utf8').digest();
  return timingSafeEqual(suppliedDigest, configuredDigest);
}

/**
 * Admin sign-in code is a sensitive deployment secret, never a source-code
 * constant. Fail closed if the environment is not configured.
 */
export const POST = handle(async (req: Request) => {
  const configuredCode = process.env.ADMIN_ACCESS_CODE?.trim();
  if (!configuredCode) {
    return json({ error: 'تسجيل دخول الإدارة غير مهيأ. اضبط ADMIN_ACCESS_CODE في إعدادات الإنتاج.' }, { status: 503 });
  }

  const { code } = await readJson(req, loginSchema);
  if (!matchesAdminCode(code, configuredCode)) {
    return json({ error: 'رمز الدخول غير صحيح' }, { status: 401 });
  }

  let admin = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'OFFICE_MANAGER', 'SECRETARY'] } },
    orderBy: { createdAt: 'asc' },
  });

  // Create a minimal code-only admin account only after the configured secret
  // has been verified. This never creates an account for an unauthenticated caller.
  if (!admin) {
    admin = await prisma.user.upsert({
      where: { email: FALLBACK_ADMIN_EMAIL },
      update: { role: 'SUPER_ADMIN' },
      create: {
        name: 'إدارة المكتب',
        email: FALLBACK_ADMIN_EMAIL,
        passwordHash: 'CODE_ONLY_ADMIN',
        role: 'SUPER_ADMIN',
      },
    });
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
