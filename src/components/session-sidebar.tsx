'use client';

import * as React from 'react';
import { CalendarClock, CalendarPlus, X, Archive } from 'lucide-react';
import { Card, Collapsible, EmptyState } from './ui';
import { SessionCard } from './session-card';
import type { SidebarData } from '@/lib/queries';
import { startOfToday, formatDay } from '@/lib/dates';

function TomorrowDate() {
  const d = new Date(startOfToday());
  d.setDate(d.getDate() + 1);
  return formatDay(d);
}

function Section({ id, title, tone, tasks, defaultOpen = false, admin }: { id: string; title: string; tone: string; tasks: SidebarData['sections']['all']; defaultOpen?: boolean; admin?: boolean }) {
  return (
    <Collapsible title={title} count={tasks.length} tone={tone} defaultOpen={defaultOpen}>
      <div id={`session-section-${id}`} className="max-h-[46vh] overflow-y-auto overscroll-contain px-3 pb-3 [scrollbar-gutter:stable]">
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
    <a
      href="/cases/archive"
      className="btn-bubble mx-3 my-2 flex items-center justify-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/[0.07] px-3 py-2.5 text-[12px] font-extrabold text-gold-700 shadow-soft hover:bg-gold-500/15"
    >
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
      <div className="absolute inset-y-0 start-0 w-full max-w-md overflow-y-auto overscroll-contain bg-ivory-100 p-3 shadow-2xl animate-slide-in-start [scrollbar-gutter:stable]">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-extrabold text-navy-900">الجلسات القادمة</h2><button onClick={onClose} className="btn-bubble rounded-full p-2 text-navy-400 hover:bg-navy-900/5" aria-label="إغلاق"><X size={18} /></button></div>
        <SessionSidebar data={data} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

export function SessionsDrawerButton({ onOpen }: { onOpen: () => void }) {
  return <button onClick={onOpen} className="btn-bubble fixed bottom-5 end-5 z-[75] flex items-center gap-2 rounded-full border border-gold-500/40 bg-gradient-to-b from-navy-800 to-navy-950 px-5 py-3 text-[13px] font-extrabold text-[#F4F6F9] shadow-lift transition-transform hover:-translate-y-0.5 lg:hidden"><CalendarClock size={17} />الجلسات القادمة</button>;
}
