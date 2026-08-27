import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionCookie } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';
import { rateLimit, rateLimitReset } from '@/lib/rate-limit';

const DEMO_ADMIN_CODE = 'hl';

/** Demo-office gate: the public site does not require an account. */
export const POST = handle(async (req: Request) => {
  const { code } = await readJson(req as never, {
    parse: (input: unknown) => {
      if (!input || typeof input !== 'object' || !('code' in input) || typeof (input as { code?: unknown }).code !== 'string') {
        throw new Error('كود الدخول مطلوب.');
      }
      return { code: (input as { code: string }).code.trim() };
    },
  } as never);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rateKey = `demo-admin:${ip}`;
  const rl = rateLimit(rateKey, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `محاولات كثيرة — أعد المحاولة بعد ${Math.ceil(rl.retryAfterSec / 60)} دقيقة.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  if (code !== DEMO_ADMIN_CODE) {
    return NextResponse.json({ error: 'كود الدخول غير صحيح.' }, { status: 401 });
  }

  const admin = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'OFFICE_MANAGER', 'SECRETARY'] } },
    orderBy: { createdAt: 'asc' },
  });

  if (!admin) {
    return NextResponse.json({ error: 'لا يوجد مستخدم إدارة مهيأ في قاعدة البيانات.' }, { status: 503 });
  }

  rateLimitReset(rateKey);

  const cookie = await createSessionCookie({
    role: 'admin',
    userId: admin.id,
    userRole: admin.role,
    ip,
    userAgent: req.headers.get('user-agent') ?? undefined,
  });

  const res = NextResponse.json({ ok: true, name: admin.name, role: admin.role });
  res.cookies.set(cookie.name, cookie.value, cookie.options as never);
  return res;
});
