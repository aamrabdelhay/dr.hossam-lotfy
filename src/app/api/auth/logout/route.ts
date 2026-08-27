import { NextResponse } from 'next/server';
import { clearSessionCookie, revokeCurrentSession } from '@/lib/auth';

export async function POST() {
  // Revoke the server-side session first, then expire the browser cookie.
  await revokeCurrentSession().catch(() => undefined);
  const c = clearSessionCookie();
  const res = NextResponse.json({ ok: true }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
  res.cookies.set(c.name, c.value, {
    ...(c.options as Record<string, unknown>),
    expires: new Date(0),
  });
  return res;
}
