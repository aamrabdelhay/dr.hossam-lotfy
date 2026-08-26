import type { Metadata } from 'next';
import Link from 'next/link';
import { Landmark, Building2 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { LOCATION_TYPE_LABEL } from '@/lib/constants';
import { Card, EmptyState, Badge } from '@/components/ui';

export const metadata: Metadata = { title: 'المحاكم والأماكن' };

export default async function LocationsPage() {
  const locations = await prisma.location.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    include: {
      tasks: {
        where: { scheduledDate: { gte: new Date() }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      },
    },
  });

  const courts = locations.filter((l) => l.type === 'COURT');
  const others = locations.filter((l) => l.type !== 'COURT');

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-navy-950">المحاكم والأماكن</h1>
        <p className="mt-1 text-[13px] font-medium text-navy-400">
          كل محكمة وجهة قانونية لها صفحة مستقلة بها سجل زياراتها وجلساتها الزمني الكامل.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-navy-800">
          <Landmark size={17} className="text-gold-600" />
          المحاكم
          <span className="text-[11px] font-bold text-navy-300">({courts.length})</span>
        </h2>
        {courts.length === 0 ? (
          <EmptyState title="لم يتم إضافة محاكم بعد." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courts.map((l) => (
              <LocationCard key={l.id} id={l.id} slug={l.slug} name={l.name} type={l.type} upcoming={l.tasks.length} isCourt />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-navy-800">
          <Building2 size={17} className="text-gold-600" />
          الأماكن القانونية الأخرى
          <span className="text-[11px] font-bold text-navy-300">({others.length})</span>
        </h2>
        {others.length === 0 ? (
          <EmptyState title="لم يتم إضافة أماكن أخرى بعد." hint="النيابات، هيئة الاستثمار، الشهر العقاري، مكاتب الخبراء…" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {others.map((l) => (
              <LocationCard key={l.id} id={l.id} slug={l.slug} name={l.name} type={l.type} upcoming={l.tasks.length} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LocationCard({ id, slug, name, type, upcoming, isCourt }: { id: string; slug: string; name: string; type: string; upcoming: number; isCourt?: boolean }) {
  return (
    <Link href={`/locations/${slug}`}>
      <Card className="group h-full p-4 transition hover:border-gold-500 hover:shadow-md">
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${isCourt ? 'bg-navy-950 text-gold-400' : 'bg-navy-800 text-ivory-200'}`}>
            {isCourt ? <Landmark size={20} /> : <Building2 size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-extrabold text-navy-950 group-hover:text-navy-800">{name}</p>
            <p className="mt-0.5 text-[11px] font-bold text-navy-300">{LOCATION_TYPE_LABEL[type] ?? type}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {upcoming > 0 ? <Badge tone="gold">{upcoming} نشاط قادم</Badge> : <Badge tone="gray">لا نشاطات قادمة</Badge>}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
