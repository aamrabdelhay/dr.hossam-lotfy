import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MapPin, Clock3, ChevronDown, CalendarClock } from 'lucide-react';
import { getFeed } from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { getSiteNav } from '@/lib/site-data';
import { Card, Badge, EmptyState } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { UrgencyBadge } from '@/components/urgency';
import { EditTrigger } from '@/components/session-edit-trigger';
import { formatDay, formatTimeOfDay, formatMonthYear, formatShortDate } from '@/lib/dates';
import { LOCATION_TYPE_LABEL, type NavLawyer, type NavLocation } from '@/lib/constants';
import type { TaskVM } from '@/lib/queries';

export const metadata: Metadata = { title: 'الجلسات والمواعيد' };
export const dynamic = 'force-dynamic';

type Group = {
  date: string | null; // ISO yyyy-mm-dd or null (unscheduled)
  items: TaskVM[];
};

function groupByDate(items: TaskVM[]): Group[] {
  const map = new Map<string | null, TaskVM[]>();
  for (const t of items) {
    const key = t.scheduledDate ?? null;
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return [...map.entries()].map(([date, list]) => ({
    date,
    items: [...list].sort((a, b) => (a.scheduledTime ?? '99').localeCompare(b.scheduledTime ?? '99')),
  }));
}

export default async function SessionsPage() {
  const session = await getCurrentUser();
  if (!session) redirect('/api/auth/login');

  const [upcoming, past, nav] = await Promise.all([
    getFeed({ from: new Date().toISOString().slice(0, 10), limit: 80 }),
    getFeed({ to: new Date(Date.now() - 86400000).toISOString().slice(0, 10), limit: 25 }),
    getSiteNav(),
  ]);

  const groups = groupByDate(upcoming.items);
  const unscheduled = groups.find((g) => g.date === null);
  const dated = groups.filter((g) => g.date !== null);

  const monoDay = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()} ${d.getFullYear()}`;
  };

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-8 sm:px-6">
      {/* Page header */}
      <div className="mb-8">
        <p className="font-mono text-[10px] font-semibold tracking-[0.3em] text-gold-500">02 — SESSIONS</p>
        <h1 className="mt-1.5 text-xl font-extrabold text-ivory-50">الجلسات والمواعيد</h1>
        <p className="mt-1.5 text-[13px] font-medium leading-6 text-navy-300">
          خط زمني تحريري لكل الجلسات القادمة — يليه سجل الجلسات السابقة. اضغط أي جلسة لفتح تفاصيلها،
          {session.role === 'admin' && ' أو عدّلها مباشرة من الخط الزمني.'}
        </p>
      </div>

      {/* Upcoming timeline */}
      {dated.length === 0 && !unscheduled ? (
        <EmptyState title="لا توجد جلسات قادمة." hint="سيظهر هنا جدول الجلسات مرتباً على خط زمني بمجرد إضافتها." />
      ) : (
        <div className="relative">
          {/* The timeline spine */}
          <span
            aria-hidden
            className="absolute bottom-4 start-[7px] top-2 w-px bg-gradient-to-b from-gold-500/50 via-white/10 to-transparent"
          />

          {dated.map((group) => (
            <section key={group.date ?? 'none'} className="relative mb-7 ps-8">
              {/* Node */}
              <span className="absolute start-0 top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-gold-500/50 bg-navy-900">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
              </span>
              {/* Date heading */}
              <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-gold-500">{monoDay(group.date!)}</span>
                <span className="text-[12.5px] font-extrabold text-ivory-100">{formatDay(new Date(`${group.date}T12:00:00`))}</span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-navy-300">
                  {group.items.length} {group.items.length === 1 ? 'جلسة' : 'جلسات'}
                </span>
              </div>

              {/* Session rows */}
              <div className="space-y-2">
                {group.items.map((t) => (
                  <TimelineRow key={t.id} task={t} isAdmin={session.role === 'admin'} navLocations={nav.locations} navLawyers={nav.lawyers} />
                ))}
              </div>
            </section>
          ))}

          {/* Unscheduled */}
          {unscheduled && (
            <section className="relative mb-7 ps-8">
              <span className="absolute start-0 top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-navy-800">
                <span className="h-1.5 w-1.5 rounded-full bg-navy-400" />
              </span>
              <div className="mb-2.5">
                <span className="text-[12.5px] font-extrabold text-ivory-100">بالتنسيق — بدون تاريخ محدد</span>
                <span className="ms-2 rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-navy-300">
                  {unscheduled.items.length}
                </span>
              </div>
              <div className="space-y-2">
                {unscheduled.items.map((t) => (
                  <TimelineRow key={t.id} task={t} isAdmin={session.role === 'admin'} navLocations={nav.locations} navLawyers={nav.lawyers} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Past sessions */}
      {past.items.length > 0 && (
        <details className="group mt-10 rounded-2xl border border-white/[0.08] bg-navy-900/60">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 text-[13px] font-extrabold text-ivory-200 transition-colors hover:text-gold-500 [&::-webkit-details-marker]:hidden">
            <CalendarClock size={15} className="text-gold-500" />
            سجل الجلسات السابقة
            <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-navy-300">{past.total}</span>
            <ChevronDown size={14} className="ms-auto text-navy-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="divide-y divide-white/[0.05] border-t border-white/[0.06]">
            {past.items.map((t) => (
              <Link key={t.id} href={`/sessions/${t.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-white/[0.03]">
                <span className="font-mono text-[10.5px] font-semibold text-navy-400">
                  {t.scheduledDate ? formatShortDate(new Date(`${t.scheduledDate}T12:00:00`)) : '—'}
                </span>
                <span className="text-[12.5px] font-bold text-ivory-200">{t.location.name}</span>
                {t.description && <span className="w-full truncate text-[11.5px] font-medium text-navy-400">{t.description}</span>}
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TimelineRow({
  task,
  isAdmin,
  navLocations,
  navLawyers,
}: {
  task: TaskVM;
  isAdmin: boolean;
  navLocations: NavLocation[];
  navLawyers: NavLawyer[];
}) {
  const time = formatTimeOfDay(task.scheduledTime);
  return (
    <Card className="group p-3.5 transition-all duration-200 hover:border-gold-500/30 hover:shadow-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-gold-500/30 bg-gold-500/[0.06] px-2 py-1 font-mono text-[11px] font-bold text-gold-500">
          <Clock3 size={11} />
          {time ?? '—'}
        </span>
        <Link href={`/locations/${task.location.slug}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ivory-200 transition-colors hover:text-gold-500">
          <MapPin size={12} className="text-navy-400" />
          {task.location.name}
        </Link>
        <Badge tone="gray">{LOCATION_TYPE_LABEL[task.location.type] ?? task.location.type}</Badge>
        {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
          <UrgencyBadge urgency={task.urgency} className="ms-auto" />
        )}
      </div>

      <Link href={`/sessions/${task.id}`} className="mt-2 block">
        <p className="text-[13.5px] font-semibold leading-6 text-ivory-100 transition-colors group-hover:text-gold-500">
          {task.description}
        </p>
      </Link>

      <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-white/[0.05] pt-2.5">
        {task.lawyers.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="flex -space-x-1.5 rtl:space-x-reverse">
              {task.lawyers.slice(0, 4).map((l) => (
                <Link key={l.id} href={`/lawyers/${l.slug}`} className="rounded-full ring-2 ring-navy-900 transition-transform hover:z-10 hover:-translate-y-0.5">
                  <Avatar name={l.name} src={l.photo} size={16} />
                </Link>
              ))}
            </span>
            <span className="text-[10.5px] font-semibold text-navy-300">
              {task.lawyers.map((l) => l.name).join('، ')}
            </span>
          </span>
        )}
        <span className="ms-auto flex items-center gap-2">
          <Link href={`/sessions/${task.id}`} className="rounded-md px-2 py-1 text-[10.5px] font-bold text-navy-300 transition-colors hover:text-gold-500">
            التفاصيل
          </Link>
          {isAdmin && (
            <EditTrigger
              task={{
                id: task.id,
                description: task.description,
                notes: task.notes,
                locationId: task.location.id,
                caseName: task.caseName,
                caseNumber: task.caseNumber,
                scheduledDate: task.scheduledDate,
                scheduledTime: task.scheduledTime,
                status: task.status,
                lawyerIds: task.lawyers.map((l) => l.id),
              }}
              locations={navLocations}
              lawyers={navLawyers.map((l) => ({ id: l.id, name: l.name }))}
            />
          )}
        </span>
      </div>
    </Card>
  );
}
