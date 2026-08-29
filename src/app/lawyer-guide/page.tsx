import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { LawyerGuideClient, type LawyerGuideLocation } from './lawyer-guide-client';

export const metadata: Metadata = {
  title: 'المحاكم والجهات الحكومية',
  description: 'المحاكم والجهات الحكومية',
};

export const dynamic = 'force-dynamic';

export default async function LawyerGuidePage() {
  const [categories, governorates, locations] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
      select: { id: true, nameAr: true, nameEn: true, slug: true, sortOrder: true },
    }),
    prisma.location.findMany({
      where: { verificationStatus: { not: 'ARCHIVED' }, governorate: { not: null } },
      select: { governorate: true },
      distinct: ['governorate'],
    }),
    prisma.location.findMany({
      where: { verificationStatus: { not: 'ARCHIVED' } },
      orderBy: [{ distanceFromDokki: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
      take: 200,
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true, slug: true } },
        locationServices: {
          take: 4,
          include: { service: { select: { id: true, nameAr: true, nameEn: true, slug: true, onlineAvailable: true } } },
        },
      },
    }),
  ]);

  const govList = Array.from(new Set(governorates.map((g) => g.governorate).filter(Boolean))).sort((a, b) => a!.localeCompare(b!, 'ar')) as string[];
  const rows: LawyerGuideLocation[] = locations.map((l) => ({ id: l.id, slug: l.slug, name: l.name, nameEn: l.nameEn, type: l.type as string, subType: l.subType, governorate: l.governorate, city: l.city, district: l.district, lat: l.lat, lng: l.lng, workingHours: l.workingHours, requiresPersonal: l.requiresPersonal, hasOnlineService: l.hasOnlineService, confidence: l.confidence, confidenceLevel: l.confidenceLevel as string, verificationStatus: l.verificationStatus as string, lastVerified: l.lastVerified?.toISOString() ?? null, distanceFromDokki: l.distanceFromDokki, distanceBucket: l.distanceBucket, category: l.category, services: l.locationServices.map((ls) => ls.service) }));
  const totalCount = await prisma.location.count({ where: { verificationStatus: { not: 'ARCHIVED' } } });

  return <LawyerGuideClient locations={rows} categories={categories} governorates={govList} totalCount={totalCount} />;
}
