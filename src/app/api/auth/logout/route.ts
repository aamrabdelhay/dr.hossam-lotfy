import { NextResponse } from 'next/server';
import { clearSessionCookie, revokeCurrentSession } from '@/lib/auth';

export async function POST() {
  // Revoke server-side first, then clear the cookie
  await revokeCurrentSession().catch(() => undefined);
  const c = clearSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(c.name, c.value, c.options as never);
  return res;
}
