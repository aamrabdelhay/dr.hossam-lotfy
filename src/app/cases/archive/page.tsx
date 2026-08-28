import type { Metadata } from 'next';
import Link from 'next/link';
import { Archive, CalendarClock, MapPin, Search, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getCaseArchive } from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { Card, Badge, EmptyState } from '@/components/ui';
import { formatDay } from '@/lib/dates';

export const metadata: Metadata = { title: 'أرشيف القضايا' };
export const dynamic = 'force-dynamic';

function day(iso: string): string {
  return formatDay(new Date(`${iso}T12:00:00`));
}

export default async function CaseArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await getCurrentUser();
  const term = (q ?? '').trim();
  const cases = await getCaseArchive({ q: term || undefined });

  const needFollowUp = cases.filter((c) => !c.nextSession);
  const relisted = cases.filter((c) => c.nextSession);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-950">
            <Archive size={20} className="text-gold-600" />
            أرشيف القضايا
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] font-medium text-navy-400">
            كل قضية عدَّى موعد جلستها — لمتابعة ما حدث بعدها: استئناف، نقض، أو تأجيل لموعد جديد.
          </p>
        </div>
        {session?.role === 'admin' && (
          <Link
            href="/admin?tab=cases"
            className="rounded-full border border-navy-200 px-4 py-2 text-[12px] font-bold text-navy-600 transition hover:border-gold-500 hover:text-gold-700"
          >
            إدارة ملفات القضايا
          </Link>
        )}
      </div>

      {/* Search by client name */}
      <Card className="mb-5 p-4">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              name="q"
              defaultValue={term}
              placeholder="ابحث باسم العميل أو اسم/رقم القضية…"
              aria-label="ابحث باسم العميل أو اسم أو رقم القضية"
              className="h-10 w-full rounded-full border border-navy-200/80 bg-white ps-9 pe-3.5 text-[13px] text-navy-900 shadow-soft transition-all placeholder:text-navy-300 focus:border-gold-500/60 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
            />
          </div>
          <button
            type="submit"
            className="h-10 shrink-0 rounded-full bg-gradient-to-b from-gold-400 to-gold-500 px-5 text-[12px] font-extrabold text-[#0A101D] transition-opacity hover:opacity-90"
          >
            بحث
          </button>
          {term && (
            <Link
              href="/cases/archive"
              className="h-10 shrink-0 rounded-full border border-navy-200 px-4 text-[12px] font-bold leading-10 text-navy-500 transition hover:border-navy-300"
            >
              مسح
            </Link>
          )}
        </form>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="rounded-full bg-navy-900/5 px-3 py-1 text-navy-500">{cases.length} قضية في الأرشيف</span>
          <span className="rounded-full bg-red-600/10 px-3 py-1 text-red-700">{needFollowUp.length} بانتظار موعد جديد</span>
          <span className="rounded-full bg-emerald-600/10 px-3 py-1 text-emerald-700">{relisted.length} لها موعد قادم</span>
        </div>
      </Card>

      {cases.length === 0 ? (
        <EmptyState
          title={term ? 'لا توجد قضايا مطابقة للبحث' : 'لا توجد قضايا في الأرشيف بعد'}
          hint={
            term
              ? 'جرّب اسم عميل أو رقم قضية مختلف.'
              : 'تظهر القضية هنا تلقائياً بمجرد أن يمرّ موعد إحدى جلساتها.'
          }
        />
      ) : (
        <div className="space-y-6">
          {needFollowUp.length > 0 && (
            <Section
              title="تحتاج متابعة — لا يوجد موعد قادم"
              hint="عدَّى موعد الجلسة ولم يُسجَّل لها موعد جديد بعد."
              tone="danger"
              cases={needFollowUp}
            />
          )}
          {relisted.length > 0 && (
            <Section
              title="تأجّلت / لها موعد قادم"
              hint="عدَّى موعد سابق وتم تحديد جلسة جديدة."
              tone="ok"
              cases={relisted}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  tone,
  cases,
}: {
  title: string;
  hint: string;
  tone: 'danger' | 'ok';
  cases: Awaited<ReturnType<typeof getCaseArchive>>;
}) {
  return (
    <section>
      <h2 className="mb-1 flex items-center gap-2 text-[14px] font-extrabold text-navy-800">
        {tone === 'danger' ? (
          <AlertTriangle size={16} className="text-red-600" />
        ) : (
          <CheckCircle2 size={16} className="text-emerald-600" />
        )}
        {title}
        <span className="text-[11px] font-bold text-navy-300">({cases.length})</span>
      </h2>
      <p className="mb-3 text-[11.5px] font-semibold text-navy-300">{hint}</p>
      <div className="space-y-3">
        {cases.map((c) => (
          <Card key={c.id} className="overflow-hidden p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold text-navy-900">{c.name}</p>
                <p className="mt-0.5 font-latin text-[11.5px] font-bold text-navy-400" dir="ltr">
                  {c.number}
                </p>
                {c.clientName && (
                  <p className="mt-1 text-[12px] font-semibold text-navy-600">
                    <span className="text-navy-300">اسم العميل:</span> {c.clientName}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.pendingCount > 0 && <Badge tone="red">{c.pendingCount} جلسة لم تُنفَّذ</Badge>}
                <Badge tone="gray">{c.totalSessions} جلسة إجمالاً</Badge>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {c.lastSession && (
                <Link
                  href={`/sessions/${c.lastSession.id}`}
                  className="rounded-xl border border-navy-100 bg-ivory-50/70 px-3.5 py-3 transition hover:border-gold-500"
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-navy-300">آخر جلسة عدَّت</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] font-extrabold text-navy-800">
                    <CalendarClock size={13} className="text-gold-600" />
                    {day(c.lastSession.date)}
                    {c.lastSession.time && <span className="font-latin text-[11px] text-navy-400">{c.lastSession.time}</span>}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-navy-500">
                    <MapPin size={12} className="text-navy-300" />
                    {c.lastSession.locationName}
                  </p>
                  {c.lastSession.description && (
                    <p className="mt-1 truncate text-[11.5px] font-medium text-navy-400">{c.lastSession.description}</p>
                  )}
                </Link>
              )}
              {c.nextSession ? (
                <Link
                  href={`/sessions/${c.nextSession.id}`}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-3.5 py-3 transition hover:border-emerald-500"
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">الموعد الجديد</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] font-extrabold text-navy-800">
                    <CalendarClock size={13} className="text-emerald-600" />
                    {day(c.nextSession.date)}
                    {c.nextSession.time && <span className="font-latin text-[11px] text-navy-400">{c.nextSession.time}</span>}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-navy-500">
                    <MapPin size={12} className="text-navy-300" />
                    {c.nextSession.locationName}
                  </p>
                </Link>
              ) : (
                <div className="rounded-xl border border-dashed border-red-500/40 bg-red-600/[0.04] px-3.5 py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-red-700">لا يوجد موعد قادم</p>
                  <p className="mt-1 text-[11.5px] font-semibold text-navy-500">
                    راجع القضية: هل حصل استئناف أو نقض أو تأجيل؟ سجّل الموعد الجديد من منطقة الإدارة.
                  </p>
                </div>
              )}
            </div>

            {c.lawyers.length > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px] font-semibold text-navy-400">
                <Users size={12} className="text-navy-300" />
                {c.lawyers.join('، ')}
              </p>
            )}

            {c.events.length > 0 && (
              <details className="mt-3 rounded-xl border border-navy-100 bg-ivory-50/60 p-3">
                <summary className="cursor-pointer text-[11.5px] font-extrabold text-gold-700">
                  سجل القضية ({c.events.length})
                </summary>
                <ol className="mt-3 space-y-2 border-s-2 border-navy-100 ps-4">
                  {c.events.map((e) => (
                    <li key={e.id}>
                      <p className="text-[12.5px] font-semibold leading-6 text-navy-800">{e.description}</p>
                      <p className="text-[11px] font-semibold text-navy-300">
                        {new Date(e.createdAt).toLocaleDateString('ar-EG')}
                        {e.authorName ? ` — ${e.authorName}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
