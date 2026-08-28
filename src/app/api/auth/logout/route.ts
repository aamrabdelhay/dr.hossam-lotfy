import { NextResponse } from 'next/server';
import { clearSessionCookie, revokeCurrentSession } from '@/lib/auth';

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

export async function POST() {
  await revokeCurrentSession().catch(() => undefined);
  return buildLogoutResponse({ ok: true });
}

/**
 * GET is supported as a no-JS / hard-navigation fallback: hitting
 * `/api/auth/logout` directly signs out and lands on the home page.
 */
export async function GET(req: Request) {
  await revokeCurrentSession().catch(() => undefined);
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(`${origin}/`, { status: 303 });
  const c = clearSessionCookie();
  res.cookies.set(c.name, c.value, c.options as never);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}
