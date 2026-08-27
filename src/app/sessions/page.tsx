import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarClock, MapPin, Clock3 } from 'lucide-react';
import { getFeed } from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { Card, Badge, EmptyState } from '@/components/ui';
import { formatDay } from '@/lib/dates';
import { LOCATION_TYPE_LABEL } from '@/lib/constants';

export const metadata: Metadata = { title: 'الجلسات والمواعيد' };
export const dynamic = 'force-dynamic';

export default async function SessionsPage() {
  const session = await getCurrentUser();
  if (!session) redirect('/admin/login');

  const [upcoming, past] = await Promise.all([
    getFeed({ from: new Date().toISOString().slice(0, 10), limit: 50 }),
    getFeed({ to: new Date(Date.now() - 86400000).toISOString().slice(0, 10), limit: 25 }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-navy-950">الجلسات والمواعيد</h1>
        <p className="mt-1 text-[13px] font-medium text-navy-400">جدول كل الجلسات القادمة مرتباً زمنياً، يليه سجل الجلسات السابقة.</p>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-navy-800"><CalendarClock size={17} className="text-gold-600" />القادمة <span className="text-[11px] font-bold text-navy-300">({upcoming.total})</span></h2>
        {upcoming.items.length === 0 ? <EmptyState title="لا توجد جلسات قادمة." /> : (
          <div className="space-y-2.5">
            {upcoming.items.map((t) => (
              <Link key={t.id} href={`/sessions/${t.id}`} className="block">
                <Card className="p-4 transition hover:border-gold-500 hover:shadow-md">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-navy-900"><CalendarClock size={14} className="text-gold-600" />{t.scheduledDate ?? 'بالتنسيق'}{t.scheduledTime && <span className="flex items-center gap-1 text-[12px] font-bold text-navy-400"><Clock3 size={12} /><span className="font-latin">{t.scheduledTime}</span></span>}</span>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold text-navy-700"><MapPin size={14} className="text-navy-300" />{t.location.name}</span>
                    <Badge tone="gray">{LOCATION_TYPE_LABEL[t.location.type] ?? t.location.type}</Badge>
                    {t.description && <span className="w-full truncate text-[12px] font-medium text-navy-400">{t.description}</span>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {past.items.length > 0 && (
        <section>
          <h2 className="mb-3 text-[14px] font-extrabold text-navy-800">سابقة <span className="ms-1.5 text-[11px] font-bold text-navy-300">({past.total})</span></h2>
          <div className="space-y-2">
            {past.items.map((t) => (
              <Link key={t.id} href={`/sessions/${t.id}`} className="block rounded-lg border border-navy-100 bg-white/60 px-4 py-2.5 transition hover:border-gold-500">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[12px] font-extrabold text-navy-400">{t.scheduledDate ? formatDay(new Date(`${t.scheduledDate}T12:00:00`)) : 'بالتنسيق'}</span>
                  <span className="text-[12.5px] font-bold text-navy-700">{t.location.name}</span>
                  {t.description && <span className="w-full truncate text-[11.5px] font-medium text-navy-300">{t.description}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
