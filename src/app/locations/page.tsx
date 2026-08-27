import type { Metadata } from 'next';
import Link from 'next/link';
import { Landmark, Building2, CalendarClock } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { LOCATION_TYPE_LABEL } from '@/lib/constants';
import { Card, EmptyState, Badge } from '@/components/ui';
import { formatDay, startOfToday } from '@/lib/dates';

export const metadata: Metadata = { title: 'المحاكم والأماكن' };
export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  slug: string;
  name: string;
  type: string;
  subType: string | null;
  governorate: string | null;
  nextTaskDate: Date | null;
  upcoming: number;
};

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

  const rows: Row[] = locations.map((l) => ({
    id: l.id,
    slug: l.slug,
    name: l.name,
    type: l.type as string,
    subType: l.subType,
    governorate: l.governorate,
    nextTaskDate: l.tasks[0]?.scheduledDate ?? null,
    upcoming: l.tasks.length,
  }));

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

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-navy-950">المحاكم والأماكن</h1>
        <p className="mt-1 text-[13px] font-medium text-navy-400">
          القسم الأول: الأماكن التي بها مهام أو جلسات قادمة — مرتبة حسب أقرب تاريخ. عند انتهاء المهام ينتقل المكان تلقائياً إلى القسم الثاني (ترتيب أبجدي حسب النوع).
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-navy-800">
          <CalendarClock size={17} className="text-gold-600" />
          أنشطة قادمة — حسب أقرب تاريخ
          <span className="text-[11px] font-bold text-navy-300">({active.length})</span>
        </h2>
        {active.length === 0 ? (
          <EmptyState title="لا توجد مهام قادمة حالياً." hint="بمجرد جدولة مهمة سيظهر مكانها هنا في مقدمة القائمة." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {active.map((l) => (
              <LocationCard key={l.id} row={l} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-navy-800">
          <Building2 size={17} className="text-gold-600" />
          كل الأماكن — ترتيب أبجدي حسب النوع
          <span className="text-[11px] font-bold text-navy-300">({rest.length})</span>
        </h2>
        {rest.length === 0 ? (
          <EmptyState title="لا أماكن أخرى بعد." hint="المحاكم، النيابات، الشهر العقاري، الضرائب، السجل التجاري…" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rest.map((l) => (
              <LocationCard key={l.id} row={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LocationCard({ row }: { row: Row }) {
  const isCourt = row.type === 'COURT';
  return (
    <Link href={`/locations/${row.slug}`}>
      <Card className="group h-full p-4 transition hover:border-gold-500 hover:shadow-md">
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${isCourt ? 'bg-navy-950 text-gold-400' : 'bg-navy-800 text-ivory-200'}`}>
            {isCourt ? <Landmark size={20} /> : <Building2 size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-extrabold text-navy-950 group-hover:text-navy-800">{row.name}</p>
            <p className="mt-0.5 truncate text-[11px] font-bold text-navy-300">
              {LOCATION_TYPE_LABEL[row.type] ?? row.type}
              {row.governorate ? ` — ${row.governorate}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {row.nextTaskDate ? (
                <Badge tone="gold">
                  <CalendarClock size={11} />
                  أقرب موعد: {formatDay(row.nextTaskDate)}
                </Badge>
              ) : (
                <Badge tone="gray">لا نشاطات قادمة</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
