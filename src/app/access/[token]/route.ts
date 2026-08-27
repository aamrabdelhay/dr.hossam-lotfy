import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionCookie } from '@/lib/auth';

/**
 * Magic-link access: GET /access/<token> validates the one-time token and
 * opens a secure session for that lawyer (30 days), then redirects to the
 * lawyer profile. Route handlers (unlike pages) may set cookies.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const err = (reason: string) =>
    NextResponse.redirect(new URL(`/lawyers-access-error?reason=${encodeURIComponent(reason)}`, req.url), { status: 307 });

  const record = await prisma.accessToken.findUnique({ where: { token }, include: { lawyer: true } });
  if (!record) return err('الرابط غير صالح أو غير موجود');
  if (record.consumedAt) return err('هذا الرابط منتهي — اطلب رابطاً جديداً من إدارة المكتب');
  if (record.expiresAt && record.expiresAt < new Date()) return err('انتهت صلاحية هذا الرابط');
  if (!record.lawyer.active) return err('هذا الحساب غير مفعّل — تواصل مع إدارة المكتب');
  if (!record.lawyer.approvedAt) return err('حسابك بانتظار اعتماد الإدارة — ستتمكن من الدخول فور اعتماده');

  // Atomically consume the token. This prevents two concurrent requests from
  // both redeeming the same one-time link between the read and the write.
  const consumed = await prisma.accessToken.updateMany({
    where: { id: record.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count !== 1) return err('هذا الرابط منتهي — اطلب رابطاً جديداً من إدارة المكتب');

  const res = NextResponse.redirect(new URL(`/lawyers/${record.lawyer.slug}`, req.url), { status: 307 });
  const cookie = await createSessionCookie({
    role: 'lawyer',
    lawyerId: record.lawyer.id,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: req.headers.get('user-agent') ?? undefined,
  });
  res.cookies.set(cookie.name, cookie.value, cookie.options as never);
  return res;
}
