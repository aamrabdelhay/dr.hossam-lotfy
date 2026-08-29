import 'server-only';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { StaffRole } from './constants';
import { isStaffRole } from './rbac';

const COOKIE = 'hlsession';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 180;

export type SessionUser =
  | { role: 'admin'; userId: string; name: string; userRole: StaffRole }
  | { role: 'lawyer'; lawyerId: string; name: string; slug: string; isAdmin: boolean };

function secret(): string { const s = process.env.SESSION_SECRET; if (!s) throw new Error('SESSION_SECRET is not set'); return s; }
function hmac(payload: string): string { return crypto.createHmac('sha256', secret()).update(payload).digest('base64url'); }

export async function createSessionCookie(input: { role: 'admin' | 'lawyer'; userId?: string; lawyerId?: string; userRole?: string; ip?: string; userAgent?: string }): Promise<{ name: string; value: string; options: Record<string, unknown> }> {
  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.authSession.create({ data: { tokenHash, role: input.role, userRole: input.userRole ?? null, userId: input.userId ?? null, lawyerId: input.lawyerId ?? null, ip: input.ip ?? null, userAgent: input.userAgent?.slice(0, 250) ?? null, expiresAt } });
  if (Math.random() < 0.1) prisma.authSession.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }] } }).catch(() => undefined);
  const body = `v1.${raw}`;
  return { name: COOKIE, value: `${body}.${hmac(body)}`, options: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: SESSION_TTL_MS / 1000 } };
}

function parseCookieValue(value: string | undefined | null): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf('.'); if (dot <= 0) return null;
  const body = value.slice(0, dot), sig = value.slice(dot + 1);
  if (!body.startsWith('v1.')) return null;
  const expected = hmac(body), a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return body.slice(3);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = parseCookieValue(store.get(COOKIE)?.value); if (!raw) return null;
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const session = await prisma.authSession.findUnique({ where: { tokenHash } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.role === 'admin' && session.userId) {
    const account = await prisma.user.findUnique({ where: { id: session.userId } }); if (!account) return null;
    const userRole: StaffRole = isStaffRole(session.userRole) ? (session.userRole as StaffRole) : account.role === 'ADMIN' ? 'SUPER_ADMIN' : (account.role as StaffRole);
    return { role: 'admin', userId: account.id, name: account.name, userRole };
  }
  if (session.role === 'lawyer' && session.lawyerId) {
    const lawyer = await prisma.lawyer.findUnique({ where: { id: session.lawyerId } });
    if (!lawyer || !lawyer.active) return null;
    const identityEmail = (lawyer.googleEmail || lawyer.email || '').trim().toLowerCase();
    let isAdmin = false;
    if (identityEmail) {
      const adminAccount = await prisma.user.findUnique({ where: { email: identityEmail }, select: { role: true } });
      isAdmin = adminAccount?.role === 'SUPER_ADMIN' || adminAccount?.role === 'ADMIN';
    }
    return { role: 'lawyer', lawyerId: lawyer.id, name: lawyer.fullName, slug: lawyer.slug, isAdmin };
  }
  return null;
}

export async function revokeCurrentSession(): Promise<void> {
  const store = await cookies(); const raw = parseCookieValue(store.get(COOKIE)?.value); if (!raw) return;
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  await prisma.authSession.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
}
export function clearSessionCookie() { return { name: COOKIE, value: '', options: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 0, expires: new Date(0) } as Record<string, unknown>; }
export const SESSION_COOKIE_NAME = COOKIE;
export async function isAdmin(): Promise<boolean> { const u = await getCurrentUser(); return !!u && (u.role === 'admin' || (u.role === 'lawyer' && u.isAdmin)); }
export async function isLawyer(lawyerId: string): Promise<boolean> { const u = await getCurrentUser(); return u?.role === 'lawyer' && u.lawyerId === lawyerId; }
export function safeComparePassword(password: string, hash: string): boolean { return bcrypt.compareSync(password, hash); }
export function createOAuthState(ttlMs = 10 * 60 * 1000): string { const raw = crypto.randomBytes(24).toString('base64url'); const exp = Date.now() + ttlMs; const body = `${raw}.${exp}`; return `${body}.${hmac(body)}`; }
export function verifyOAuthState(state: string | null | undefined): boolean { if (!state) return false; const parts = state.split('.'); if (parts.length !== 3) return false; const [raw, expStr, sig] = parts; const body = `${raw}.${expStr}`; const expected = hmac(body); const a = Buffer.from(sig), b = Buffer.from(expected); if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false; const exp = Number(expStr); return Number.isFinite(exp) && Date.now() <= exp; }
