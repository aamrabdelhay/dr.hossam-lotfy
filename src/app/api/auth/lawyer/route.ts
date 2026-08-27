import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSessionCookie } from '@/lib/auth';
import { handle, json, readJson } from '@/lib/api';

const loginSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب').max(120),
  email: z.string().email('بريد إلكتروني غير صالح').max(120),
});

/** Normalise a name for comparison: lowercase, collapse whitespace, drop diacritics. */
function normName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Lawyer sign-in WITHOUT Google OAuth. The lawyer enters their first two names
 * plus their Gmail address; the backend finds the matching APPROVED lawyer and,
 * on success, opens an authenticated lawyer session. The client then redirects
 * to the lawyer's own profile.
 *
 * This is a demo / internal-office flow, so no password or OTP is required —
 * but the account must exist AND be approved server-side (never trust the
 * frontend). Pending lawyers are rejected with 403.
 */
export const POST = handle(async (req: NextRequest) => {
  const { name, email } = await readJson(req, loginSchema);
  const emailNorm = email.trim().toLowerCase();
  const providedParts = name.trim().split(/\s+/).filter(Boolean);
  if (providedParts.length < 2) {
    return json({ error: 'أدخل الاسمين الأولين على الأقل (مثال: أحمد محمد).' }, { status: 400 });
  }

  const lawyer = await prisma.lawyer.findFirst({
    where: { OR: [{ googleEmail: emailNorm }, { email: emailNorm }] },
  });
  if (!lawyer) {
    return json({ error: 'لا يوجد محامٍ بهذا البريد الإلكتروني. تأكد من البيانات أو سجّل لأول مرة.' }, { status: 401 });
  }

  // Compare the first two names only (الاسمين الأولين).
  const lawyerParts = lawyer.fullName.trim().split(/\s+/).filter(Boolean);
  const providedFirst = providedParts.slice(0, 2).map(normName).join(' ');
  const lawyerFirst = lawyerParts.slice(0, 2).map(normName).join(' ');
  if (providedFirst !== lawyerFirst) {
    return json({ error: 'الاسم لا يطابق الحساب المرتبط بهذا البريد.' }, { status: 401 });
  }

  if (!lawyer.approvedAt || !lawyer.active) {
    return json({ error: 'حسابك بانتظار اعتماد الإدارة — ستتمكن من الدخول فور اعتماده.' }, { status: 403 });
  }

  const cookie = await createSessionCookie({
    role: 'lawyer',
    lawyerId: lawyer.id,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: req.headers.get('user-agent') ?? undefined,
  });

  const res = NextResponse.json({ ok: true, slug: lawyer.slug, name: lawyer.fullName });
  res.cookies.set(cookie.name, cookie.value, cookie.options as never);
  return res;
});
