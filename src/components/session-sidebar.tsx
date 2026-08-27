'use client';

import * as React from 'react';
import { CalendarClock, CalendarPlus, X } from 'lucide-react';
import { Card, Collapsible, EmptyState } from './ui';
import { SessionCard } from './session-card';
import type { SidebarData } from '@/lib/queries';
import { startOfToday } from '@/lib/dates';
import { formatDay } from '@/lib/dates';

function TomorrowDate() {
  const d = new Date(startOfToday());
  d.setDate(d.getDate() + 1);
  return formatDay(d);
}

function Section({ id, title, tone, tasks, defaultOpen = false, admin }: { id: string; title: string; tone: string; tasks: SidebarData['sections']['all']; defaultOpen?: boolean; admin?: boolean }) {
  return (
    <Collapsible title={title} count={tasks.length} tone={tone} defaultOpen={defaultOpen}>
      {tasks.length === 0 ? (
        <p className="px-1 py-2 text-[11px] font-semibold text-navy-300">لا توجد جلسات خلال هذه الفترة.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <SessionCard key={t.id} task={t} />
          ))}
        </div>
      )}
      {admin && (
        <a href="/admin?tab=tasks" className="mt-2 flex items-center justify-center gap-1 rounded-md border border-dashed border-navy-200 px-2 py-1.5 text-[11px] font-bold text-navy-400 hover:border-gold-500 hover:text-gold-700">
          <CalendarPlus size={12} />
          إضافة موعد (للمسؤول)
        </a>
      )}
    </Collapsible>
  );
}

export function SessionSidebar({ data, isAdmin }: { data: SidebarData; isAdmin: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-navy-100 bg-navy-950 px-4 py-3">
        <CalendarClock size={17} className="text-gold-400" />
        <h2 className="text-[14px] font-extrabold text-ivory-50">الجلسات والمواعيد</h2>
        <span className="ms-auto rounded-full bg-gold-500/20 px-2 py-0.5 text-[10px] font-bold text-gold-300">
          {data.sections.all.length} جلسة قادمة
        </span>
      </div>

      <Section id="tomorrow" title={`غداً — ${TomorrowDate()}`} tone="bg-red-600" tasks={data.sections.tomorrow} defaultOpen admin={isAdmin} />
      <Section id="d3" title="خلال 3 أيام" tone="bg-orange-500" tasks={data.sections.within3} defaultOpen admin={isAdmin} />
      <Section id="d14" title="خلال أسبوعين" tone="bg-amber-500" tasks={data.sections.within14} admin={isAdmin} />
      <Section id="d30" title="خلال شهر" tone="bg-gold-500" tasks={data.sections.within30} admin={isAdmin} />
      <Section id="all" title="كل الجلسات" tone="bg-emerald-600" tasks={data.sections.all} admin={isAdmin} />

      {data.sections.all.length === 0 && (
        <div className="p-4">
          <EmptyState title="لا توجد جلسات قادمة" hint="سيظهر هنا جدول الجلسات المرتبة زمنياً بمجرد إضافتها." />
        </div>
      )}
    </Card>
  );
}

/** Mobile drawer wrapper for the sidebar. */
export function SessionsDrawer({ open, onClose, data, isAdmin }: { open: boolean; onClose: () => void; data: SidebarData; isAdmin: boolean }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="absolute inset-y-0 start-0 w-full max-w-md overflow-y-auto bg-ivory-100 p-3 shadow-2xl animate-slide-in-start">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-navy-900">الجلسات القادمة</h2>
          <button onClick={onClose} className="rounded-md p-2 text-navy-400 hover:bg-navy-900/5" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <SessionSidebar data={data} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

/** Floating button that opens the drawer on mobile. */
export function SessionsDrawerButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-5 end-5 z-[75] flex items-center gap-2 rounded-full border border-[#101C2C] bg-[#101C2C] px-5 py-3 text-[13px] font-extrabold text-[#F7F5F0] shadow-xl ring-1 ring-[#8A6A3A]/40 hover:bg-[#18263A] lg:hidden"
    >
      <CalendarClock size={17} />
      الجلسات القادمة
    </button>
  );
}
