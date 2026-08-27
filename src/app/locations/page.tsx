import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { DISTANCE_BUCKETS, LOCATION_TYPE_LABEL } from '@/lib/constants';
import { categoryForType } from '@/lib/legal-directory';
import { formatDay, startOfToday } from '@/lib/dates';
import { LocationsClient, type LocationRow } from './locations-client';

export const metadata: Metadata = { title: 'دليل المحامي في مصر' };
export const dynamic = 'force-dynamic';

export default async function LocationsPage() {
  const today = startOfToday();
  const locations = await prisma.location.findMany({
    orderBy: [{ distanceFromDokki: 'asc' }, { name: 'asc' }],
    include: {
      tasks: {
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, scheduledDate: { gte: today } },
        select: { scheduledDate: true },
        orderBy: { scheduledDate: 'asc' },
      },
    },
  });

  const rows: LocationRow[] = locations.map((l) => {
    const next = l.tasks[0]?.scheduledDate ?? null;
    return {
      id: l.id,
      slug: l.slug,
      name: l.name,
      nameEn: l.nameEn,
      type: l.type as string,
      category: categoryForType(l.type as string, l.name, l.subType ?? ''),
      subType: l.subType,
      governorate: l.governorate,
      city: l.city,
      district: l.district,
      lat: l.lat,
      lng: l.lng,
      workingHours: l.workingHours,
      services: l.services,
      jurisdiction: l.jurisdiction,
      requiresPersonal: l.requiresPersonal,
      hasOnlineService: l.hasOnlineService,
      source: l.source,
      lastVerified: l.lastVerified?.toISOString() ?? null,
      confidence: l.confidence,
      distanceFromDokki: l.distanceFromDokki,
      distanceBucket: l.distanceBucket,
      searchKeywords: l.searchKeywords,
      nextTaskDate: next ? next.toISOString() : null,
      nextTaskLabel: next ? formatDay(next) : null,
      upcoming: l.tasks.length,
    };
  });

  const governorates = Array.from(new Set(rows.map((r) => r.governorate).filter((g): g is string => !!g))).sort((a, b) => a.localeCompare(b, 'ar'));
  const types = Array.from(new Set(rows.map((r) => r.type))).sort((a, b) => (LOCATION_TYPE_LABEL[a] ?? a).localeCompare(LOCATION_TYPE_LABEL[b] ?? b, 'ar'));
  const categories = Array.from(new Set(rows.map((r) => r.category))).sort((a, b) => a.localeCompare(b, 'ar'));
  const presentBuckets = new Set(rows.map((r) => r.distanceBucket).filter(Boolean) as string[]);
  const buckets = DISTANCE_BUCKETS.filter((b) => presentBuckets.has(b));

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6">
      <div className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-navy-950">دليل المحامي في مصر</h1>
            <p className="mt-1 text-[13px] font-medium text-navy-400">محاكم، نيابات، جهات حكومية وخدمية — مع بحث وخدمات ومسافة من مكتب الدقي.</p>
          </div>
          <div className="rounded-lg border border-gold-500/20 bg-gold-500/5 px-3 py-2 text-[11px] font-bold text-navy-600">نقطة المرجع: الدقي – الجيزة</div>
        </div>
      </div>
      <LocationsClient rows={rows} governorates={governorates} types={types} categories={categories} buckets={[...buckets]} />
    </div>
  );
}
