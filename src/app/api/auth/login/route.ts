import { NextResponse } from 'next/server';
import { handle, readJson } from '@/lib/api';
import { createSessionCookie } from '@/lib/auth';
import { rateLimit, rateLimitReset } from '@/lib/rate-limit';

const DEMO_ADMIN_CODE = 'hl';

/** Demo-only admin gate. The public site does not require an account. */
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
  const rl = rateLimit(`demo-admin:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `محاولات كثيرة — أعد المحاولة بعد ${Math.ceil(rl.retryAfterSec / 60)} دقيقة.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  if (code !== DEMO_ADMIN_CODE) {
    return NextResponse.json({ error: 'كود الدخول غير صحيح.' }, { status: 401 });
  }

  rateLimitReset(`demo-admin:${ip}`);

  const cookie = await createSessionCookie({
    role: 'admin',
    userId: 'demo-admin',
    userRole: 'SUPER_ADMIN',
    ip,
    userAgent: req.headers.get('user-agent') ?? undefined,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options as never);
  return res;
});
