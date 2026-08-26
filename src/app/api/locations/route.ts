import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requireAdmin } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { slugify, uniqueSlug } from '@/lib/slug';

export async function GET() {
  const locations = await prisma.location.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    include: {
      tasks: {
        where: { scheduledDate: { gte: new Date() }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      },
    },
  });
  return json({
    locations: locations.map((l) => ({
      id: l.id, slug: l.slug, name: l.name, type: l.type, address: l.address, description: l.description,
      upcoming: l.tasks.length,
    })),
  });
}

const createSchema = z.object({
  name: z.string().min(2, 'اسم المكان مطلوب').max(150),
  type: z.enum(['COURT', 'INVESTMENT_AGENCY', 'EXPERTS_OFFICE', 'REAL_ESTATE_REGISTRATION', 'GOVERNMENT_AGENCY', 'OTHER'], {
    message: 'اختر نوع المكان',
  }),
  address: z.string().max(300).optional(),
  description: z.string().max(1000).optional(),
});

/** Only admin. A dedicated page is created automatically at /locations/<slug>. */
export const POST = handle(async (req: Request) => {
  const session = await requireAdmin();
  const data = await readJson(req as never, createSchema);

  const name = data.name.trim();
  const exists = await prisma.location.findFirst({
    where: { OR: [{ name }, { slug: slugify(name) }] },
  });
  if (exists) return json({ error: 'يوجد مكان بهذا الاسم بالفعل' }, { status: 409 });

  const slug = await uniqueSlug(slugify(name));
  const location = await prisma.location.create({
    data: {
      name,
      slug,
      type: data.type,
      address: data.address?.trim() || null,
      description: data.description?.trim() || null,
    },
  });

  await logActivity({
    action: 'LOCATION_ADDED',
    summary: `أضاف مكاناً جديداً: ${name}`,
    locationId: location.id,
    byUserId: session.userId,
  });

  return json({ ok: true, location: { id: location.id, slug: location.slug } }, { status: 201 });
});
