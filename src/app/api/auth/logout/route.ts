import { NextResponse } from 'next/server';
import { clearSessionCookie, getCurrentUser, revokeCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Log out: revoke the server-side session row first (so a stolen cookie is
 * useless immediately), then expire the cookie with the *same* attributes it
 * was written with. The response is explicitly uncacheable — otherwise an
 * intermediate cache could replay a stale "still signed in" document.
 */
function buildLogoutResponse(body: unknown, init?: { status?: number }) {
  const res = NextResponse.json(body, init);
  const c = clearSessionCookie();
  res.cookies.set(c.name, c.value, c.options as never);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.headers.set('Clear-Site-Data', '"cache"');
  return res;
}

async function closeOfficeLoginLog() {
  const session = await getCurrentUser().catch(() => null);
  if (!session) return;
  const userId = session.role === 'admin' ? session.userId : null;
  const lawyerId = session.role === 'lawyer' ? session.lawyerId : null;
  await prisma.$executeRawUnsafe(
    `UPDATE "office_login_logs"
     SET "logout_at"=NOW(),"last_seen_at"=NOW(),"duration_seconds"=GREATEST(0,EXTRACT(EPOCH FROM (NOW()-"login_at"))::int)
     WHERE "id"=(
       SELECT "id" FROM "office_login_logs"
       WHERE (($1::text IS NOT NULL AND "user_id"=$1) OR ($2::text IS NOT NULL AND "lawyer_id"=$2))
         AND "logout_at" IS NULL
       ORDER BY "login_at" DESC LIMIT 1
     )`,
    userId, lawyerId,
  );
}

export async function POST() {
  await closeOfficeLoginLog().catch(() => undefined);
  await revokeCurrentSession().catch(() => undefined);
  return buildLogoutResponse({ ok: true });
}

/**
 * GET is supported as a no-JS / hard-navigation fallback: hitting
 * `/api/auth/logout` directly signs out and lands on the home page.
 */
export async function GET(req: Request) {
  await closeOfficeLoginLog().catch(() => undefined);
  await revokeCurrentSession().catch(() => undefined);
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(`${origin}/`, { status: 303 });
  const c = clearSessionCookie();
  res.cookies.set(c.name, c.value, c.options as never);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}
