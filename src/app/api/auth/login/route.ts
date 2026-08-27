import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionCookie } from '@/lib/auth';
import { handle } from '@/lib/api';

/**
 * Demo-office gate: the site has no accounts at all — no e-mail, no password,
 * no access code. Hitting this endpoint (the key button in the header) opens
 * the office administration area directly.
 */
async function enter(req: NextRequest): Promise<{ cookie: Awaited<ReturnType<typeof createSessionCookie>>; name: string; role: string } | { error: string }> {
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'OFFICE_MANAGER', 'SECRETARY'] } },
    orderBy: { createdAt: 'asc' },
  });

  if (!admin) return { error: 'لا يوجد مستخدم إدارة مهيأ في قاعدة البيانات.' };

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const cookie = await createSessionCookie({
    role: 'admin',
    userId: admin.id,
    userRole: admin.role,
    ip,
    userAgent: req.headers.get('user-agent') ?? undefined,
  });

  return { cookie, name: admin.name, role: admin.role };
}

/** Key button in the header: sets the session then lands on /admin. */
export const GET = handle(async (req: NextRequest) => {
  const result = await enter(req);
  if ('error' in result) {
    // No configured staff account (never happens with a seeded production
    // database) — return a small page instead of redirecting (a redirect
    // here would loop against the auth-gated routes).
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  const res = NextResponse.redirect(new URL('/admin', req.url));
  res.cookies.set(result.cookie.name, result.cookie.value, result.cookie.options as never);
  return res;
});

/** Same thing for fetch()-based callers. */
export const POST = handle(async (req: NextRequest) => {
  const result = await enter(req);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  const res = NextResponse.json({ ok: true, name: result.name, role: result.role });
  res.cookies.set(result.cookie.name, result.cookie.value, result.cookie.options as never);
  return res;
});
