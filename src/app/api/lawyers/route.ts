import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requirePermission, user } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { slugify, uniqueSlug } from '@/lib/slug';
import { prisma as db } from '@/lib/prisma';

export async function GET() {
  const session = await user();
  const lawyers = await prisma.lawyer.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { fullName: 'asc' }],
    select: {
      id: true, slug: true, fullName: true, title: true, phone: true, email: true,
      specialization: true, profilePhotoUrl: true, isPrincipal: true,
    },
  });
  const counts = await db.$queryRaw<{ lawyerId: string; upcoming: number }[]>`
    SELECT "lawyerId", COUNT(*)::int AS "upcoming"
    FROM "task_assignments" ta
    JOIN "tasks" t ON t.id = ta."taskId"
    WHERE ta."completedAt" IS NULL AND t."status" NOT IN ('CANCELLED')
      AND (t."scheduledDate" >= CURRENT_DATE OR t."scheduledDate" IS NULL)
    GROUP BY "lawyerId"`;
  const countMap = new Map(counts.map((c) => [c.lawyerId, c.upcoming]));
  void session;
  return json({ lawyers: lawyers.map((l) => ({ ...l, upcoming: countMap.get(l.id) ?? 0 })) });
}

const createSchema = z.object({
  fullName: z.string().min(3, 'الاسم مطلوب').max(120),
  title: z.enum(['DOCTOR', 'ADVOCATE'], { message: 'اختر الصفة: دكتور أو محامي' }),
  phone: z.string().min(6, 'رقم التليفون مطلوب').max(20),
  email: z.string().email('بريد إلكتروني غير صالح').max(120).optional().or(z.literal('').transform(() => undefined)),
  specialization: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  position: z.string().max(120).optional(),
});

/** Only the admin can add lawyers. A profile page is created automatically. */
export const POST = handle(async (req: Request) => {
  const session = await requirePermission('manageLawyers');
  const data = await readJson(req as never, createSchema);

  // three-part name check (Arabic or Latin)
  const parts = data.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3) {
    return json({ error: 'الاسم يجب أن يكون ثلاثياً على الأقل: (أول، وسط، عائلة)' }, { status: 400 });
  }

  const slug = await uniqueSlug(slugify(data.fullName));
  const lawyer = await prisma.lawyer.create({
    data: {
      slug,
      fullName: data.fullName.trim(),
      title: data.title,
      phone: data.phone.trim(),
      email: data.email,
      specialization: data.specialization?.trim() || null,
      bio: data.bio?.trim() || null,
      position: data.position?.trim() || null,
    },
  });

  await logActivity({
    action: 'LAWYER_ADDED',
    summary: `أضاف محامياً جديداً: ${lawyer.fullName}`,
    lawyerId: lawyer.id,
    byUserId: session.userId,
  });

  return json({ ok: true, lawyer: { id: lawyer.id, slug: lawyer.slug } }, { status: 201 });
});
