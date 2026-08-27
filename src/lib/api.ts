import { NextResponse, type NextRequest } from 'next/server';
import type { ZodType } from 'zod';
import { getCurrentUser, type SessionUser } from './auth';
import { can, permissionsOf, type Permissions } from './rbac';

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

/** Get the current session user in a route handler (safe, no cookies → null). */
export async function user(): Promise<SessionUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

type AdminSession = Extract<SessionUser, { role: 'admin' }>;

/** Any authenticated staff session (admin area users — any role). */
export async function requireStaff(): Promise<AdminSession> {
  const u = await user();
  if (!u || u.role !== 'admin') throw new ApiError(403, 'هذا الإجراء يتطلب صلاحية إدارية');
  return u;
}

/**
 * Staff session holding a specific permission — the server-side RBAC gate.
 * e.g. `await requirePermission('writeTasks')` before creating a task.
 */
export async function requirePermission(permission: keyof Permissions): Promise<AdminSession> {
  const u = await requireStaff();
  if (!can(u.userRole, permission)) {
    throw new ApiError(403, 'لا تملك صلاحية تنفيذ هذا الإجراء');
  }
  return u;
}

/** Legacy alias — full admin (SUPER_ADMIN/ADMIN only). */
export async function requireAdmin(): Promise<AdminSession> {
  const u = await requireStaff();
  if (u.userRole !== 'SUPER_ADMIN' && u.userRole !== 'ADMIN') {
    throw new ApiError(403, 'هذا الإجراء يتطلب صلاحية المدير العام');
  }
  return u;
}

export async function requireLawyer(): Promise<Extract<SessionUser, { role: 'lawyer' }>> {
  const u = await user();
  if (!u || u.role !== 'lawyer') throw new ApiError(401, 'يجب تسجيل الدخول كمحامي لإتمام هذا الإجراء');
  return u;
}

export function permissionsFor(role: string | null | undefined): Permissions {
  return permissionsOf(role);
}

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, 'طلب غير صالح: تعذر قراءة البيانات');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = (first?.path ?? []).map(String).join('.');
    const msg = (first?.message ?? 'بيانات غير صالحة').replace(/"([a-zA-Z_]+)"/g, '$1');
    throw new ApiError(400, `خطأ في المدخلات${path ? ` (${path})` : ''}: ${msg}`);
  }
  return result.data;
}

/** Wrap a route handler body with unified error handling (supports (req) or (req, ctx)). */
export function handle<A>(fn: (arg: A) => Promise<NextResponse>): (arg: A) => Promise<NextResponse>;
export function handle<A, B>(fn: (arg: A, ctx: B) => Promise<NextResponse>): (arg: A, ctx: B) => Promise<NextResponse>;
export function handle(fn: (...args: unknown[]) => Promise<NextResponse>) {
  return async (...args: unknown[]) => {
    try {
      return await (fn as (...a: unknown[]) => Promise<NextResponse>)(...args);
    } catch (e) {
      if (e instanceof ApiError) return httpError(e.status, e.message);
      console.error('[api]', e);
      return httpError(500, 'حدث خطأ غير متوقع. حاول مرة أخرى.');
    }
  };
}
