import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AdminLawyerGuideClient } from './admin-lawyer-guide-client';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'إدارة دليل المحامي' };

export default async function AdminLawyerGuidePage() {
  const session = await getCurrentUser();
  if (!session || session.role !== 'admin') {
    redirect('/admin/login');
  }

  const [categories, locations, verificationPending] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
    }),
    prisma.location.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      take: 100,
      include: {
        category: { select: { id: true, nameAr: true } },
      },
    }),
    prisma.location.count({ where: { verificationStatus: { in: ['DRAFT', 'PENDING', 'NEEDS_REVIEW'] } } }),
  ]);

  return (
    <AdminLawyerGuideClient
      session={{ userId: session.userId, name: session.name, role: session.userRole }}
      categories={categories}
      locations={locations.map((l) => ({
        id: l.id,
        slug: l.slug,
        name: l.name,
        nameEn: l.nameEn,
        type: l.type as string,
        subType: l.subType,
        governorate: l.governorate,
        city: l.city,
        district: l.district,
        confidence: l.confidence,
        confidenceLevel: l.confidenceLevel as string,
        verificationStatus: l.verificationStatus as string,
        lastVerified: l.lastVerified?.toISOString() ?? null,
        categoryId: l.categoryId,
        categoryName: l.category?.nameAr ?? null,
      }))}
      verificationPending={verificationPending}
    />
  );
}
