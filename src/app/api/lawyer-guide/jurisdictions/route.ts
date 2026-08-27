import { prisma } from '@/lib/prisma';
import { json } from '@/lib/api';

/** GET: list jurisdictions with optional filters. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const governorate = url.searchParams.get('governorate') || '';
  const type = url.searchParams.get('type') || '';
  const q = url.searchParams.get('q')?.trim() || '';

  const where: Record<string, unknown> = {};
  if (governorate) where.governorate = { contains: governorate, mode: 'insensitive' };
  if (type) where.type = type;
  if (q) {
    where.OR = [
      { nameAr: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const jurisdictions = await prisma.jurisdiction.findMany({
    where,
    orderBy: { nameAr: 'asc' },
    take: 100,
    include: {
      _count: { select: { locations: true } },
    },
  });

  return json({
    jurisdictions: jurisdictions.map((j) => ({
      id: j.id,
      nameAr: j.nameAr,
      nameEn: j.nameEn,
      type: j.type,
      governorate: j.governorate,
      city: j.city,
      district: j.district,
      description: j.description,
      locationCount: j._count.locations,
    })),
  });
}
