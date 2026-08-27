import { NextResponse } from 'next/server';
import { clearAllSessionCookies, revokeCurrentSession } from '@/lib/auth';

export async function POST() {
  // Revoke server-side first, then clear all possible cookie names
  await revokeCurrentSession().catch(() => undefined);
  const cookies = clearAllSessionCookies();
  const res = NextResponse.json({ ok: true });
  for (const c of cookies) {
    res.cookies.set(c.name, c.value, c.options as never);
  }
  return res;
}
