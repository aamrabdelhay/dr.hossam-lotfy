import { prisma } from '@/lib/prisma';
import { json } from '@/lib/api';

/** GET: list all active services with optional category filter. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get('category') || '';

  const where: Record<string, unknown> = { active: true };
  if (categoryId) where.categoryId = categoryId;

  const services = await prisma.service.findMany({
    where,
    orderBy: { nameAr: 'asc' },
    include: {
      category: { select: { id: true, nameAr: true, nameEn: true, slug: true } },
    },
  });

  // Get location counts per service
  const locationCounts = await prisma.locationService.groupBy({
    by: ['serviceId'],
    _count: true,
  });
  const countMap = new Map(locationCounts.map((lc) => [lc.serviceId, lc._count]));

  return json({
    services: services.map((s) => ({
      id: s.id,
      nameAr: s.nameAr,
      nameEn: s.nameEn,
      slug: s.slug,
      categoryId: s.categoryId,
      category: s.category,
      description: s.description,
      onlineAvailable: s.onlineAvailable,
      locationCount: countMap.get(s.id) ?? 0,
    })),
  });
}
