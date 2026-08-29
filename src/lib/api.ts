import { NextResponse, type NextRequest } from 'next/server';
import type { ZodType } from 'zod';
import { getCurrentUser, type SessionUser } from './auth';
import { can, permissionsOf, type Permissions } from './rbac';
import { prisma } from './prisma';

export function json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(data, init);
}

export function httpError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function user(): Promise<SessionUser | null> {
  try { return await getCurrentUser(); } catch { return null; }
}

type AdminSession = Extract<SessionUser, { role: 'admin' }>;

async function asAdminSession(u: SessionUser | null): Promise<AdminSession | null> {
  if (!u) return null;
  if (u.role === 'admin') return u;
  if (!u.isAdmin) return null;
  const lawyer = await prisma.lawyer.findUnique({ where: { id: u.lawyerId }, select: { email: true, googleEmail: true } });
  const email = (lawyer?.googleEmail || lawyer?.email || '').trim().toLowerCase();
  if (!email) return null;
  const account = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, role: true } });
  if (!account || (account.role !== 'SUPER_ADMIN' && account.role !== 'ADMIN')) return null;
  return { role: 'admin', userId: account.id, name: account.name, userRole: account.role === 'ADMIN' ? 'ADMIN' : 'SUPER_ADMIN' };
}

export async function requireStaff(): Promise<AdminSession> {
  const u = await asAdminSession(await user());
  if (!u) throw new ApiError(403, 'هذا الإجراء يتطلب صلاحية إدارية');
  return u;
}

export async function requirePermission(permission: keyof Permissions): Promise<AdminSession> {
  const u = await requireStaff();
  if (!can(u.userRole, permission)) throw new ApiError(403, 'لا تملك صلاحية تنفيذ هذا الإجراء');
  return u;
}

export async function requireAdmin(): Promise<AdminSession> {
  const u = await requireStaff();
  if (u.userRole !== 'SUPER_ADMIN' && u.userRole !== 'ADMIN') throw new ApiError(403, 'هذا الإجراء يتطلب صلاحية المدير العام');
  return u;
}

export async function requireLawyer(): Promise<Extract<SessionUser, { role: 'lawyer' }>> {
  const u = await user();
  if (!u || u.role !== 'lawyer') throw new ApiError(401, 'يجب تسجيل الدخول كمحامي لإتمام هذا الإجراء');
  return u;
}

export function permissionsFor(role: string | null | undefined): Permissions { return permissionsOf(role); }

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try { raw = await req.json(); } catch { throw new ApiError(400, 'طلب غير صالح: تعذر قراءة البيانات'); }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = (first?.path ?? []).map(String).join('.');
    const msg = (first?.message ?? 'بيانات غير صالحة').replace(/"([a-zA-Z_]+)"/g, '$1');
    throw new ApiError(400, `خطأ في المدخلات${path ? ` (${path})` : ''}: ${msg}`);
  }
  return result.data;
}

type RouteHandler = (req: NextRequest, context?: unknown) => Promise<NextResponse>;
export function handle(fn: RouteHandler) {
  return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
    try { return await fn(req, context); }
    catch (e) {
      if (e instanceof ApiError) return httpError(e.status, e.message);
      console.error('[api]', e);
      return httpError(500, 'حدث خطأ غير متوقع. حاول مرة أخرى.');
    }
  };
}
