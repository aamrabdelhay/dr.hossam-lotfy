import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { DISTANCE_BUCKETS, LOCATION_TYPE_LABEL } from '@/lib/constants';
import { formatDay, startOfToday } from '@/lib/dates';
import { LocationsClient, type LocationRow } from './locations-client';

export const metadata: Metadata = { title: 'المحاكم والأماكن' };
export const dynamic = 'force-dynamic';

export default async function LocationsPage() {
  const today = startOfToday();
  const locations = await prisma.location.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
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
      subType: l.subType,
      governorate: l.governorate,
      city: l.city,
      distanceBucket: l.distanceBucket,
      nextTaskDate: next ? next.toISOString() : null,
      nextTaskLabel: next ? formatDay(next) : null,
      upcoming: l.tasks.length,
    };
  });

  // Section 1 — places with live tasks, ordered by the NEAREST task date.
  const active = rows
    .filter((r) => r.nextTaskDate)
    .sort((a, b) => (a.nextTaskDate! < b.nextTaskDate! ? -1 : a.nextTaskDate! > b.nextTaskDate! ? 1 : a.name.localeCompare(b.name, 'ar')));

  // Section 2 — everything else, alphabetical by type label (محكمة vs غيره) then name.
  const rest = rows
    .filter((r) => !r.nextTaskDate)
    .sort((a, b) => {
      const ta = LOCATION_TYPE_LABEL[a.type] ?? a.type;
      const tb = LOCATION_TYPE_LABEL[b.type] ?? b.type;
      const byType = ta.localeCompare(tb, 'ar');
      if (byType !== 0) return byType;
      return a.name.localeCompare(b.name, 'ar');
    });

  // Filter option sets — only values that actually exist in the directory.
  const governorates = Array.from(new Set(rows.map((r) => r.governorate).filter((g): g is string => !!g))).sort((a, b) =>
    a.localeCompare(b, 'ar'),
  );
  const types = Array.from(new Set(rows.map((r) => r.type))).sort((a, b) =>
    (LOCATION_TYPE_LABEL[a] ?? a).localeCompare(LOCATION_TYPE_LABEL[b] ?? b, 'ar'),
  );
  const presentBuckets = new Set(rows.map((r) => r.distanceBucket).filter(Boolean) as string[]);
  const buckets = DISTANCE_BUCKETS.filter((b) => presentBuckets.has(b));

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-navy-950">المحاكم والأماكن</h1>
        <p className="mt-1 text-[13px] font-medium text-navy-400">
          القسم الأول: الأماكن التي بها مهام أو جلسات قادمة — مرتبة حسب أقرب تاريخ. عند انتهاء المهام ينتقل المكان تلقائياً إلى القسم الثاني (ترتيب أبجدي حسب النوع).
        </p>
      </div>

      <LocationsClient
        rows={[...active, ...rest]}
        governorates={governorates}
        types={types}
        buckets={[...buckets]}
      />
    </div>
  );
}
