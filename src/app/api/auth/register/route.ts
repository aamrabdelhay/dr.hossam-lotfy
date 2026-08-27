import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson } from '@/lib/api';
import { slugify, uniqueSlug } from '@/lib/slug';
import { logActivity } from '@/lib/activity';
import { notifyNewRegistration } from '@/lib/mail';

const registerSchema = z.object({
  fullName: z.string().min(3, 'الاسم مطلوب').max(120),
  title: z.enum(['DOCTOR', 'ADVOCATE'], { message: 'اختر الصفة: دكتور أو محامي' }),
  phone: z.string().min(6, 'رقم التليفون مطلوب').max(20),
  email: z.string().email('بريد إلكتروني غير صالح').max(120),
  specialization: z.string().max(200).optional(),
});

/**
 * Self-registration for a lawyer (first time). Creates the profile in a
 * pending state (approvedAt = null) — it appears in the admin "المحامون"
 * section as "بانتظار الاعتماد" and the lawyer cannot act until approved.
 */
export const POST = handle(async (req: Request) => {
  const data = await readJson(req as never, registerSchema);
  const email = data.email.trim().toLowerCase();
  const fullName = data.fullName.trim();

  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length < 3) {
    return json({ error: 'الاسم يجب أن يكون ثلاثياً على الأقل: (أول، وسط، عائلة)' }, { status: 400 });
  }

  const clash = await prisma.lawyer.findFirst({ where: { OR: [{ googleEmail: email }, { email }] } });
  if (clash) {
    return json({ error: 'هذا البريد الإلكتروني مسجل بالفعل — سجّل الدخول بدلاً من ذلك.' }, { status: 409 });
  }

  const slug = await uniqueSlug(slugify(fullName));
  const lawyer = await prisma.lawyer.create({
    data: {
      slug,
      fullName,
      title: data.title,
      phone: data.phone.trim(),
      googleEmail: email,
      specialization: data.specialization?.trim() || null,
      approvedAt: null, // pending office approval
    },
  });

  await logActivity({
    action: 'LAWYER_REGISTERED',
    summary: `سجّل محامٍ نفسه وينتظر الاعتماد: ${lawyer.fullName}`,
    lawyerId: lawyer.id,
  });
  await notifyNewRegistration(lawyer.fullName, email, lawyer.phone);

  return json({ ok: true, pending: true, lawyer: { id: lawyer.id, slug: lawyer.slug } }, { status: 201 });
});
