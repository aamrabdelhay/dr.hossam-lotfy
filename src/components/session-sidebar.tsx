'use client';

import * as React from 'react';
import { CalendarClock, CalendarPlus, X, Archive, BriefcaseBusiness } from 'lucide-react';
import { Card, Collapsible, EmptyState } from './ui';
import { SessionCard } from './session-card';
import type { SidebarData } from '@/lib/queries';
import { startOfToday, formatDay } from '@/lib/dates';

function TomorrowDate() {
  const d = new Date(startOfToday());
  d.setDate(d.getDate() + 1);
  return formatDay(d);
}

type UpcomingArchivedCase = {
  id: string;
  name: string;
  number: string;
  clientName: string | null;
  tasks: Array<{ id: string; scheduledDate: string | null; scheduledTime: string | null; status: string; location: { name: string } }>;
};

function UpcomingCases() {
  const [cases, setCases] = React.useState<UpcomingArchivedCase[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/cases', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('cases unavailable'))))
      .then((data) => {
        if (cancelled) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const rows = (data.cases ?? []) as UpcomingArchivedCase[];
        const result = rows
          .map((c) => {
            const dated = c.tasks.filter((t) => t.scheduledDate);
            const hasPast = dated.some((t) => new Date(`${t.scheduledDate}T00:00:00`) < today);
            const next = dated
              .filter((t) => new Date(`${t.scheduledDate}T00:00:00`) >= today && t.status !== 'CANCELLED')
              .sort((a, b) => `${a.scheduledDate}T${a.scheduledTime ?? '23:59'}`.localeCompare(`${b.scheduledDate}T${b.scheduledTime ?? '23:59'}`))[0];
            return hasPast && next ? { ...c, tasks: [next] } : null;
          })
          .filter((c): c is UpcomingArchivedCase => !!c)
          .sort((a, b) => `${a.tasks[0].scheduledDate}T${a.tasks[0].scheduledTime ?? '23:59'}`.localeCompare(`${b.tasks[0].scheduledDate}T${b.tasks[0].scheduledTime ?? '23:59'}`));
        setCases(result);
      })
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading || cases.length === 0) return null;
  return (
    <section className="mx-3 my-2 overflow-hidden rounded-2xl border border-gold-500/25 bg-gold-500/[0.035]">
      <div className="flex items-center gap-2 border-b border-gold-500/15 px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-500/10 text-gold-700"><BriefcaseBusiness size={14} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[12px] font-extrabold text-navy-900">قضايا لها مواعيد قادمة</h3>
          <p className="text-[9.5px] font-semibold text-navy-400">من الأرشيف إلى جدول المتابعة</p>
        </div>
        <span className="rounded-full bg-gold-500/10 px-2 py-1 text-[9px] font-bold text-gold-700">{cases.length}</span>
      </div>
      <div className="divide-y divide-gold-500/10">
        {cases.slice(0, 12).map((c) => {
          const next = c.tasks[0];
          return (
            <a key={c.id} href={`/cases/archive?q=${encodeURIComponent(c.name)}`} className="block px-3 py-2.5 transition hover:bg-white/70">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] font-extrabold text-navy-800">{c.name}</p>
                  <p className="font-latin text-[9.5px] font-bold text-navy-400" dir="ltr">{c.number}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-600/10 px-2 py-1 text-[9px] font-extrabold text-emerald-700">موعد قادم</span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-navy-500">
                <CalendarClock size={11} className="text-gold-600" />
                {next.scheduledDate && formatDay(new Date(`${next.scheduledDate}T12:00:00`))}
                {next.scheduledTime && <span dir="ltr" className="font-latin text-navy-400">{next.scheduledTime}</span>}
                <span className="text-navy-300">•</span>{next.location.name}
              </p>
              {c.clientName && <p className="mt-0.5 truncate text-[9.5px] font-semibold text-navy-400">العميل: {c.clientName}</p>}
            </a>
          );
        })}
      </div>
    </section>
  );
}

function Section({ id, title, tone, tasks, defaultOpen = false, admin }: { id: string; title: string; tone: string; tasks: SidebarData['sections']['all']; defaultOpen?: boolean; admin?: boolean }) {
  return (
    <Collapsible title={title} count={tasks.length} tone={tone} defaultOpen={defaultOpen}>
      <div id={`session-section-${id}`} className="px-3 pb-3">
        {tasks.length === 0 ? (
          <p className="px-1 py-2 text-[11px] font-semibold text-navy-300">لا توجد جلسات خلال هذه الفترة.</p>
        ) : (
          <div className="space-y-2">{tasks.map((t) => <SessionCard key={t.id} task={t} />)}</div>
        )}
        {admin && <a href="/admin?tab=tasks" className="btn-bubble mt-2 flex items-center justify-center gap-1 rounded-full border border-dashed border-navy-200 px-2 py-1.5 text-[11px] font-bold text-navy-400 hover:border-gold-500 hover:text-gold-700"><CalendarPlus size={12} />إضافة موعد (للمسؤول)</a>}
      </div>
    </Collapsible>
  );
}

function ArchiveLink() {
  return (
    <a href="/cases/archive" className="btn-bubble mx-3 my-2 flex items-center justify-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/[0.07] px-3 py-2.5 text-[12px] font-extrabold text-gold-700 shadow-soft hover:bg-gold-500/15">
      <Archive size={14} />
      أرشيف القضايا
    </a>
  );
}

export function SessionSidebar({ data, isAdmin }: { data: SidebarData; isAdmin: boolean }) {
  return (
    <Card className="flex h-[calc(100vh-104px)] max-h-[calc(100vh-104px)] min-h-0 flex-col overflow-hidden overscroll-contain">
      <div className="mesh-gold flex shrink-0 items-center gap-2 border-b border-navy-800 bg-gradient-to-l from-navy-950 via-navy-900 to-navy-850 px-4 py-3.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-500/15 ring-1 ring-gold-500/30"><CalendarClock size={15} className="text-gold-400" /></span>
        <h2 className="text-[14px] font-extrabold text-ivory-50">الجلسات والمواعيد</h2>
        <span className="ms-auto rounded-full bg-gold-500/20 px-2.5 py-1 text-[10px] font-bold text-gold-300 ring-1 ring-inset ring-gold-500/30">{data.sections.all.length} جلسة قادمة</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
        <ArchiveLink />
        <UpcomingCases />
        <Section id="tomorrow" title={`غداً — ${TomorrowDate()}`} tone="bg-red-600" tasks={data.sections.tomorrow} defaultOpen admin={isAdmin} />
        <Section id="d3" title="خلال 3 أيام" tone="bg-orange-500" tasks={data.sections.within3} defaultOpen admin={isAdmin} />
        <Section id="d14" title="خلال أسبوعين" tone="bg-amber-500" tasks={data.sections.within14} admin={isAdmin} />
        <Section id="d30" title="خلال شهر" tone="bg-gold-500" tasks={data.sections.within30} admin={isAdmin} />
        <Section id="all" title="كل الجلسات" tone="bg-emerald-600" tasks={data.sections.all} admin={isAdmin} />
        {data.sections.all.length === 0 && <div className="p-4"><EmptyState title="لا توجد جلسات قادمة" hint="سيظهر هنا جدول الجلسات المرتبة زمنياً بمجرد إضافتها." /></div>}
      </div>
    </Card>
  );
}

export function SessionsDrawer({ open, onClose, data, isAdmin }: { open: boolean; onClose: () => void; data: SidebarData; isAdmin: boolean }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="absolute inset-y-0 start-0 flex w-full max-w-md flex-col overflow-hidden bg-ivory-100 p-3 shadow-2xl animate-slide-in-start">
        <div className="mb-3 flex shrink-0 items-center justify-between"><h2 className="text-[15px] font-extrabold text-navy-900">الجلسات القادمة</h2><button onClick={onClose} className="btn-bubble rounded-full p-2 text-navy-400 hover:bg-navy-900/5" aria-label="إغلاق"><X size={18} /></button></div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <SessionSidebar data={data} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
}

export function SessionsDrawerButton({ onOpen }: { onOpen: () => void }) {
  return <button onClick={onOpen} className="btn-bubble fixed bottom-5 end-5 z-[75] flex items-center gap-2 rounded-full border border-gold-500/40 bg-gradient-to-b from-navy-800 to-navy-950 px-5 py-3 text-[13px] font-extrabold text-[#F4F6F9] shadow-lift transition-transform hover:-translate-y-0.5 lg:hidden"><CalendarClock size={17} />الجلسات القادمة</button>;
}
