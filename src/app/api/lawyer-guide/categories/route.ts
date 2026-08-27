import { prisma } from '@/lib/prisma';
import { json } from '@/lib/api';

/** GET: list all active categories. */
export async function GET() {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
    include: {
      _count: {
        select: {
          locations: { where: { verificationStatus: { not: 'ARCHIVED' } } },
          services: { where: { active: true } },
        },
      },
    },
  });

  return json({
    categories: categories.map((c) => ({
      id: c.id,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      slug: c.slug,
      icon: c.icon,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
      locationCount: c._count.locations,
      serviceCount: c._count.services,
    })),
  });
}
