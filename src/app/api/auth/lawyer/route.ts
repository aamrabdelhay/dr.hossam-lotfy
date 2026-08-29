import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionCookie } from '@/lib/auth';
import { handle, json, readJson } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

const loginSchema = z.object({ name: z.string().min(2, 'الاسم مطلوب').max(120), email: z.string().email('بريد إلكتروني غير صالح').max(120) });
function normName(s: string): string { return s.trim().toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/\s+/g, ' '); }

export const POST = handle(async (req: Request) => {
  const { name, email } = await readJson(req, loginSchema);
  const emailNorm = email.trim().toLowerCase();
  const providedParts = name.trim().split(/\s+/).filter(Boolean);
  if (providedParts.length < 2) return json({ error: 'أدخل الاسمين الأولين على الأقل (مثال: أحمد محمد).' }, { status: 400 });

  const lawyer = await prisma.lawyer.findFirst({ where: { OR: [{ googleEmail: emailNorm }, { email: emailNorm }] } });
  if (!lawyer) return json({ error: 'لا يوجد محامٍ بهذا البريد الإلكتروني. تأكد من البيانات أو سجّل لأول مرة.' }, { status: 401 });
  const lawyerParts = lawyer.fullName.trim().split(/\s+/).filter(Boolean);
  if (providedParts.slice(0, 2).map(normName).join(' ') !== lawyerParts.slice(0, 2).map(normName).join(' ')) return json({ error: 'الاسم لا يطابق الحساب المرتبط بهذا البريد.' }, { status: 401 });
  if (!lawyer.approvedAt || !lawyer.active) return json({ error: 'حسابك بانتظار اعتماد الإدارة — ستتمكن من الدخول فور اعتماده.' }, { status: 403 });

  const firstLogin = !(await prisma.activityLog.findFirst({ where: { lawyerId: lawyer.id, action: 'LAWYER_LOGIN' }, select: { id: true } }));
  const loginAt = new Date();
  if (firstLogin) {
    await logActivity({ action: 'LAWYER_LOGIN', summary: `أول تسجيل دخول للمحامي ${lawyer.fullName} — ${loginAt.toLocaleString('ar-EG')}`, lawyerId: lawyer.id });
    const admins = await prisma.user.findMany({ select: { id: true } });
    if (admins.length) await prisma.notification.createMany({ data: admins.map((admin) => ({ userId: admin.id, type: 'LAWYER_FIRST_LOGIN', title: 'أول تسجيل دخول لمحامٍ', body: `${lawyer.fullName} سجّل دخوله لأول مرة بتاريخ ${loginAt.toLocaleDateString('ar-EG')} الساعة ${loginAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`, link: `/lawyers/${lawyer.slug}` })) });
  } else {
    await logActivity({ action: 'LAWYER_LOGIN', summary: `سجّل المحامي دخوله: ${lawyer.fullName}`, lawyerId: lawyer.id }).catch(() => undefined);
  }

  const cookie = await createSessionCookie({ role: 'lawyer', lawyerId: lawyer.id, ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(), userAgent: req.headers.get('user-agent') ?? undefined });
  const res = NextResponse.json({ ok: true, slug: lawyer.slug, name: lawyer.fullName });
  res.cookies.set(cookie.name, cookie.value, cookie.options as never);
  return res;
});
