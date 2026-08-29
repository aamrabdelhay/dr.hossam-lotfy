'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { TaskCreator } from '@/components/admin/task-creator';
import { CalendarPlus } from 'lucide-react';
import type { NavLocation } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { URGENCY_EDGE } from '@/components/urgency';
import { formatMonthYear, formatFullDate } from '@/lib/dates';
import type { TaskVM } from '@/lib/queries';

type View = 'month' | 'week' | 'day';
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

export function CalendarClient({ isAdmin = false, locations = [], lawyers = [], cases = [] }: { isAdmin?: boolean; locations?: NavLocation[]; lawyers?: Array<{ id: string; name: string; isPrincipal?: boolean }>; cases?: Array<{ id: string; name: string; number: string }> }) {
  const [cursor, setCursor] = React.useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [view, setView] = React.useState<View>('month');
  const [tasks, setTasks] = React.useState<TaskVM[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creatorOpen, setCreatorOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const range = React.useMemo(() => {
    const from = new Date(cursor); const to = new Date(cursor);
    if (view === 'month') { from.setDate(1); to.setMonth(to.getMonth() + 1); to.setDate(0); }
    else if (view === 'week') { const day = cursor.getDay(); from.setDate(cursor.getDate() - day); to.setDate(cursor.getDate() - day + 6); }
    else to.setDate(cursor.getDate() + 1);
    return { from, to };
  }, [cursor, view]);

  const iso = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const refreshTasks = React.useCallback(() => setRefreshKey((k) => k + 1), []);

  React.useEffect(() => {
    let alive = true; setLoading(true);
    fetch(`/api/tasks?from=${iso(range.from)}&to=${iso(new Date(range.to.getTime() - 86400000))}&limit=500`)
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive) setTasks(d?.items ?? []); }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [range.from, range.to, view, refreshKey]);

  const shift = (dir: 1 | -1) => { const d = new Date(cursor); if (view === 'month') d.setMonth(d.getMonth() + dir); else if (view === 'week') d.setDate(d.getDate() + dir * 7); else d.setDate(d.getDate() + dir); setCursor(d); };
  const tasksOn = (day: Date) => tasks.filter((t) => t.scheduledDate === iso(day)).sort((a, b) => (a.scheduledTime ?? '99').localeCompare(b.scheduledTime ?? '99'));
  const todayIso = iso(new Date());
  const monthDays = React.useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const startOffset = first.getDay(); const cells: Date[] = []; const start = new Date(first); start.setDate(1 - startOffset);
    for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push(d); }
    return cells;
  }, [cursor]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-950"><CalendarDays size={20} className="text-gold-600" />التقويم</h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ms-auto sm:w-auto">
          <div className="flex rounded-lg border border-line-strong bg-surface p-0.5">{(['month', 'week', 'day'] as View[]).map((v) => <button key={v} onClick={() => setView(v)} className={cn('rounded-md px-3 py-1.5 text-[12px] font-extrabold transition', view === v ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink')}>{v === 'month' ? 'شهر' : v === 'week' ? 'أسبوع' : 'يوم'}</button>)}</div>
          <div className="flex items-center gap-1"><Button variant="outline" size="sm" onClick={() => shift(-1)} aria-label="السابق"><ChevronRight size={14} /></Button><button onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setCursor(d); }} className="rounded-md px-2 text-[12px] font-bold text-navy-500 hover:text-navy-900">اليوم</button><Button variant="outline" size="sm" onClick={() => shift(1)} aria-label="التالي"><ChevronLeft size={14} /></Button></div>
          <span className="min-w-0 flex-1 text-center text-[13px] font-extrabold text-navy-900 sm:min-w-32 sm:flex-none sm:text-[14px]">{view === 'day' ? formatFullDate(cursor) : formatMonthYear(cursor)}</span>
          {isAdmin && <Button variant="gold" size="sm" onClick={() => { const p = (n: number) => String(n).padStart(2, '0'); setSelectedDate(`${cursor.getFullYear()}-${p(cursor.getMonth() + 1)}-${p(cursor.getDate())}`); setCreatorOpen(true); }}><CalendarPlus size={14} />إضافة موعد</Button>}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-[10.5px] font-bold text-navy-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-600" /> اليوم / غداً</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> خلال 3 أيام</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> خلال أسبوعين</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold-500" /> خلال شهر</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-600" /> أبعد من ذلك</span>
      </div>

      {view === 'month' && <Card className="overflow-hidden"><div className="grid grid-cols-7 border-b border-navy-100 bg-ivory-50">{['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((d) => <div key={d} className="px-0.5 py-1.5 text-center text-[8px] font-extrabold text-navy-500 sm:px-2 sm:py-2 sm:text-[11px]">{d}</div>)}</div><div className="grid grid-cols-7">{monthDays.map((d, i) => { const dayTasks = tasksOn(d); const inMonth = d.getMonth() === cursor.getMonth(); const isToday = iso(d) === todayIso; return <div key={i} className={cn('min-h-[68px] border-b border-e border-navy-100 p-1 sm:min-h-[92px] sm:p-1.5 [&:nth-child(7n)]:border-e-0', !inMonth && 'bg-ivory-50/70')}><div className="mb-1 flex items-center justify-between"><button type="button" onClick={() => { if (!isAdmin) return; const p = (n: number) => String(n).padStart(2, '0'); setSelectedDate(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`); setCreatorOpen(true); }} title={isAdmin ? 'إضافة موعد في هذا اليوم' : undefined} className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-extrabold sm:h-6 sm:w-6 sm:text-[11px]', isAdmin && 'transition hover:ring-2 hover:ring-gold-500/40', isToday ? 'bg-gold-500 text-navy-950' : inMonth ? 'text-navy-800' : 'text-navy-200')}>{d.getDate()}</button>{dayTasks.length > 0 && <span className="text-[8px] font-bold text-navy-300 sm:text-[9px]">{dayTasks.length}</span>}</div><div className="space-y-0.5 sm:space-y-1">{dayTasks.slice(0, 2).map((t) => <Link key={t.id} href={`/sessions/${t.id}`} className={cn('block truncate rounded border-s-2 bg-white px-1 py-0.5 text-[8px] font-bold shadow-sm hover:shadow sm:px-1.5 sm:text-[10px]', URGENCY_EDGE[t.urgency])}>{t.scheduledTime && <span className="font-latin">{t.scheduledTime} </span>}{t.location.name}</Link>)}{dayTasks.length > 2 && <button onClick={() => { setCursor(new Date(d)); setView('day'); }} className="text-[8px] font-bold text-gold-700 hover:underline sm:text-[9.5px]">+{dayTasks.length - 2} أخرى</button>}</div></div>; })}</div></Card>}

      {(view === 'week' || view === 'day') && <WeekDayView view={view} range={range} tasksOn={tasksOn} loading={loading} />}
      {isAdmin && <TaskCreator open={creatorOpen} onClose={() => setCreatorOpen(false)} locations={locations} lawyers={lawyers} cases={cases} defaultDate={selectedDate} onCreated={refreshTasks} />}
    </div>
  );
}

function WeekDayView({ view, range, tasksOn, loading }: { view: 'week' | 'day'; range: { from: Date; to: Date }; tasksOn: (d: Date) => TaskVM[]; loading: boolean }) {
  const days = React.useMemo(() => { const out: Date[] = []; const d = new Date(range.from); while (d < range.to) { out.push(new Date(d)); d.setDate(d.getDate() + 1); } return out; }, [range]);
  return <>
    <div className="space-y-3 sm:hidden">{loading ? <Card className="flex h-40 items-center justify-center text-[13px] font-bold text-navy-300">جارٍ التحميل…</Card> : days.map((d) => { const dayTasks = tasksOn(d); return <Card key={d.toISOString()} className="overflow-hidden"><div className="flex items-center justify-between border-b border-navy-100 bg-ivory-50 px-4 py-3"><div><p className="text-[10px] font-bold text-navy-400">{formatFullDate(d).split('،')[0]}</p><p className="text-[15px] font-extrabold text-navy-900">{formatFullDate(d)}</p></div><span className="rounded-full bg-navy-900/[0.06] px-2 py-1 text-[10px] font-bold text-navy-400">{dayTasks.length} موعد</span></div><div className="space-y-2 p-3">{dayTasks.length === 0 ? <p className="py-3 text-center text-[11px] font-semibold text-navy-300">لا توجد مواعيد</p> : dayTasks.map((t) => <Link key={t.id} href={`/sessions/${t.id}`} className={cn('block rounded-xl border-s-4 bg-white p-3 shadow-soft', URGENCY_EDGE[t.urgency])}><div className="flex items-center justify-between gap-3"><span className="font-latin text-[11px] font-extrabold text-gold-700">{t.scheduledTime ?? 'بدون وقت'}</span><span className="min-w-0 truncate text-[12px] font-extrabold text-navy-900">{t.location.name}</span></div><p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-5 text-navy-400">{t.description}</p></Link>)}</div></Card>; })}</div>
    <Card className="hidden overflow-x-auto sm:block">{loading ? <div className="flex h-40 items-center justify-center text-[13px] font-bold text-navy-300">جارٍ التحميل…</div> : <div className="grid min-w-[560px]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}><div />{days.map((d, i) => <div key={i} className="border-b border-e border-navy-100 bg-ivory-50 px-2 py-2 text-center last:border-e-0"><p className="text-[10px] font-bold text-navy-400">{formatFullDate(d).split('،')[0]}</p><p className="text-[14px] font-extrabold text-navy-900">{d.getDate()}</p></div>)}{HOURS.map((h) => <React.Fragment key={h}><div className="border-b border-navy-100 px-1 py-1 text-end text-[10px] font-bold text-navy-300">{String(h).padStart(2, '0')}:00</div>{days.map((d, i) => { const hourTasks = tasksOn(d).filter((t) => t.scheduledTime && parseInt(t.scheduledTime, 10) === h); return <div key={i} className="min-h-[44px] border-b border-e border-navy-100 p-1 last:border-e-0"><div className="space-y-1">{hourTasks.map((t) => <Link key={t.id} href={`/sessions/${t.id}`} className={cn('block rounded border-s-2 bg-white px-1.5 py-1 shadow-sm hover:shadow', URGENCY_EDGE[t.urgency])}><p className="truncate text-[10.5px] font-extrabold text-navy-900">{t.location.name}</p><p className="truncate text-[9.5px] font-semibold text-navy-400">{t.description}</p></Link>)}</div></div>; })}</React.Fragment>)}</div>}</Card>
  </>;
}
