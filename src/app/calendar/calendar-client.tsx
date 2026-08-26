'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import {Button, Card, EmptyState} from '@/components/ui';
import { cn } from '@/lib/cn';
import { URGENCY_EDGE } from '@/components/urgency';
import { formatMonthYear, formatFullDate } from '@/lib/dates';
import type { TaskVM } from '@/lib/queries';

type View = 'month' | 'week' | 'day';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 → 23:00

export function CalendarClient() {
  const [cursor, setCursor] = React.useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [view, setView] = React.useState<View>('month');
  const [tasks, setTasks] = React.useState<TaskVM[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Date range for the current view
  const range = React.useMemo(() => {
    const from = new Date(cursor);
    const to = new Date(cursor);
    if (view === 'month') {
      from.setDate(1);
      to.setMonth(to.getMonth() + 1);
      to.setDate(0);
    } else if (view === 'week') {
      const day = cursor.getDay(); // 0=Sun
      from.setDate(cursor.getDate() - day);
      to.setDate(cursor.getDate() - day + 6);
    } else {
      to.setDate(cursor.getDate() + 1);
    }
    return { from, to };
  }, [cursor, view]);

  const iso = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/tasks?from=${iso(range.from)}&to=${iso(new Date(range.to.getTime() - 86400000))}&limit=500`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setTasks(d?.items ?? []);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [range.from, range.to, view]);

  const shift = (dir: 1 | -1) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  };

  const tasksOn = (day: Date) =>
    tasks
      .filter((t) => t.scheduledDate === iso(day))
      .sort((a, b) => (a.scheduledTime ?? '99') .localeCompare(b.scheduledTime ?? '99'));

  const todayIso = iso(new Date());

  /* ── Month grid ── */
  const monthDays = React.useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = first.getDay(); // Sunday start
    const cells: Date[] = [];
    const start = new Date(first);
    start.setDate(1 - startOffset);
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [cursor]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-950">
          <CalendarDays size={20} className="text-gold-600" />
          التقويم
        </h1>
        <div className="ms-auto flex items-center gap-2">
          <div className="flex rounded-lg border border-navy-200 bg-white p-0.5">
            {(['month', 'week', 'day'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[12px] font-extrabold transition',
                  view === v ? 'bg-navy-950 text-gold-300' : 'text-navy-400 hover:text-navy-800',
                )}
              >
                {v === 'month' ? 'شهر' : v === 'week' ? 'أسبوع' : 'يوم'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => shift(-1)} aria-label="السابق">
              <ChevronRight size={14} />
            </Button>
            <button
              onClick={() => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                setCursor(d);
              }}
              className="rounded-md px-2 text-[12px] font-bold text-navy-500 hover:text-navy-900"
            >
              اليوم
            </button>
            <Button variant="outline" size="sm" onClick={() => shift(1)} aria-label="التالي">
              <ChevronLeft size={14} />
            </Button>
          </div>
          <span className="min-w-32 text-center text-[14px] font-extrabold text-navy-900">
            {view === 'day' ? formatFullDate(cursor) : formatMonthYear(cursor)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[10.5px] font-bold text-navy-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-600" /> اليوم / غداً</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> خلال 3 أيام</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> خلال أسبوعين</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold-500" /> خلال شهر</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-600" /> أبعد من ذلك</span>
      </div>

      {view === 'month' && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-navy-100 bg-ivory-50">
            {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((d) => (
              <div key={d} className="px-2 py-2 text-center text-[11px] font-extrabold text-navy-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((d, i) => {
              const dayTasks = tasksOn(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = iso(d) === todayIso;
              return (
                <div key={i} className={cn('min-h-[92px] border-b border-e border-navy-100 p-1.5 [&:nth-child(7n)]:border-e-0', !inMonth && 'bg-ivory-50/70')}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold',
                      isToday ? 'bg-gold-500 text-navy-950' : inMonth ? 'text-navy-800' : 'text-navy-200',
                    )}>
                      {d.getDate()}
                    </span>
                    {dayTasks.length > 0 && <span className="text-[9px] font-bold text-navy-300">{dayTasks.length}</span>}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((t) => (
                      <Link
                        key={t.id}
                        href={`/sessions/${t.id}`}
                        className={cn('block truncate rounded border-s-2 bg-white px-1.5 py-0.5 text-[10px] font-bold shadow-sm hover:shadow', URGENCY_EDGE[t.urgency])}
                      >
                        {t.scheduledTime && <span className="font-latin">{t.scheduledTime} </span>}
                        {t.location.name}
                      </Link>
                    ))}
                    {dayTasks.length > 3 && (
                      <button onClick={() => { setCursor(new Date(d)); setView('day'); }} className="text-[9.5px] font-bold text-gold-700 hover:underline">
                        +{dayTasks.length - 3} أخرى
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {(view === 'week' || view === 'day') && (
        <WeekDayView view={view} cursor={cursor} range={range} tasksOn={tasksOn} loading={loading} />
      )}
    </div>
  );
}

function WeekDayView({ view, cursor, range, tasksOn, loading }: {
  view: 'week' | 'day';
  cursor: Date;
  range: { from: Date; to: Date };
  tasksOn: (d: Date) => TaskVM[];
  loading: boolean;
}) {
  const days = React.useMemo(() => {
    const out: Date[] = [];
    const d = new Date(range.from);
    while (d < range.to) {
      out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [range]);


  return (
    <Card className="overflow-x-auto">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-[13px] font-bold text-navy-300">جارٍ التحميل…</div>
      ) : (
        <div className="grid min-w-[560px]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
          {/* header row */}
          <div />
          {days.map((d, i) => (
            <div key={i} className="border-b border-e border-navy-100 bg-ivory-50 px-2 py-2 text-center last:border-e-0">
              <p className="text-[10px] font-bold text-navy-400">{formatFullDate(d).split('،')[0]}</p>
              <p className="text-[14px] font-extrabold text-navy-900">{d.getDate()}</p>
            </div>
          ))}
          {/* hour rows */}
          {HOURS.map((h) => (
            <React.Fragment key={h}>
              <div className="border-b border-navy-100 px-1 py-1 text-end text-[10px] font-bold text-navy-300">
                {String(h).padStart(2, '0')}:00
              </div>
              {days.map((d, i) => {
                const hourTasks = tasksOn(d).filter((t) => t.scheduledTime && parseInt(t.scheduledTime, 10) === h);
                return (
                  <div key={i} className="min-h-[44px] border-b border-e border-navy-100 p-1 last:border-e-0">
                    <div className="space-y-1">
                      {hourTasks.map((t) => (
                        <Link
                          key={t.id}
                          href={`/sessions/${t.id}`}
                          className={cn('block rounded border-s-2 bg-white px-1.5 py-1 shadow-sm hover:shadow', URGENCY_EDGE[t.urgency])}
                        >
                          <p className="truncate text-[10.5px] font-extrabold text-navy-900">{t.location.name}</p>
                          <p className="truncate text-[9.5px] font-semibold text-navy-400">{t.description}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      )}
    </Card>
  );
}
