import 'server-only';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const COOKIE = 'hlsession';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type SessionUser =
  | { role: 'admin'; userId: string; name: string }
  | { role: 'lawyer'; lawyerId: string; name: string; slug: string };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set');
  return s;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

export function signSession(payload: Record<string, unknown>): string {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined | null): Record<string, unknown> | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp === 'number' && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const payload = verifySession(store.get(COOKIE)?.value);
  if (!payload || typeof payload.role !== 'string') return null;
  if (payload.role === 'admin') {
    const user = await prisma.user.findUnique({ where: { id: String(payload.id) } });
    if (!user) return null;
    return { role: 'admin', userId: user.id, name: user.name };
  }
  if (payload.role === 'lawyer') {
    const lawyer = await prisma.lawyer.findUnique({ where: { id: String(payload.id) } });
    if (!lawyer || !lawyer.active) return null;
    return { role: 'lawyer', lawyerId: lawyer.id, name: lawyer.fullName, slug: lawyer.slug };
  }
  return null;
}

export async function isAdmin(): Promise<boolean> {
  const u = await getCurrentUser();
  return u?.role === 'admin';
}

export async function isLawyer(lawyerId: string): Promise<boolean> {
  const u = await getCurrentUser();
  return u?.role === 'lawyer' && u.lawyerId === lawyerId;
}

/** Create (or refresh) the session cookie. Route handlers only. */
export function buildSessionCookie(payload: Omit<Record<string, unknown>, 'exp'>): {
  name: string;
  value: string;
  options: Record<string, unknown>;
} {
  const value = signSession({ ...payload, exp: Date.now() + SESSION_TTL_MS });
  return {
    name: COOKIE,
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_TTL_MS / 1000,
    },
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE,
    value: '',
    options: { httpOnly: true, path: '/', maxAge: 0 } as Record<string, unknown>,
  };
}

export function safeComparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}
