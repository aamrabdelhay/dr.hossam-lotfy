import { NextResponse, type NextRequest } from 'next/server';
import type { ZodType } from 'zod';
import { getCurrentUser, type SessionUser } from './auth';

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

export async function requireAdmin(): Promise<Extract<SessionUser, { role: 'admin' }>> {
  const u = await user();
  if (!u || u.role !== 'admin') throw new ApiError(403, 'هذا الإجراء يتطلب صلاحية المسؤول');
  return u;
}

export async function requireLawyer(): Promise<Extract<SessionUser, { role: 'lawyer' }>> {
  const u = await user();
  if (!u || u.role !== 'lawyer') throw new ApiError(401, 'يجب تسجيل الدخول كمحامي لإتمام هذا الإجراء');
  return u;
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
