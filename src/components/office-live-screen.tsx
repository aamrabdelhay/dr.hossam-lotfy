'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Radio } from 'lucide-react';
import type { OfficeLivePayload, LiveState } from '@/lib/office-live-core';

const POLL_MS = 15_000;
const TONE: Record<LiveState, string> = {
  AT_PLACE: 'border-emerald-500/60 bg-emerald-500/10',
  IN_TRANSIT: 'border-amber-500/60 bg-amber-500/10',
  IN_OFFICE: 'border-sky-500/60 bg-sky-500/10',
  LEFT: 'border-white/15 bg-white/[.04] opacity-70',
  NOT_CHECKED_IN: 'border-white/15 bg-white/[.04] opacity-60',
  UNKNOWN: 'border-white/15 bg-white/[.04]',
};
const clock = (iso: string) => new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', second: '2-digit',
}).format(new Date(iso));
const shortTime = (iso: string | null) => iso ? new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit',
}).format(new Date(iso)) : '';

export function OfficeLiveScreen({ initial }: { initial: OfficeLivePayload }) {
  const [data, setData] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [full, setFull] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current || document.visibilityState !== 'visible') return;
    busy.current = true;
    try {
      const response = await fetch('/api/office/live', { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      setData(await response.json() as OfficeLivePayload);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    const start = () => {
      if (!timer && document.visibilityState === 'visible') timer = setInterval(() => { void load(); }, POLL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') { void load(); start(); }
      else stop();
    };
    if (document.visibilityState === 'visible') { void load(); start(); }
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [load]);

  useEffect(() => {
    const onFullscreenChange = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#07101d] px-4 py-6 text-white sm:px-7 lg:px-9">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Radio className={failed ? 'text-red-400' : 'text-emerald-400'} />
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">شاشة المكتب الحية</h1>
            <p className="mt-1 text-xs text-white/50">بيانات الحضور وتسجيلات الوصول والمهام المسندة لهذا اليوم</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
          <span role="status" aria-live="polite">
            {failed ? 'تعذر التحديث — المعروض آخر بيانات ناجحة' : 'تحديث تلقائي كل 15 ثانية'}
            {' · '}آخر تحديث {clock(data.generatedAt)}
          </span>
          <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/10">
            {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {full ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
          </button>
        </div>
      </header>
      {data.rows.length === 0 ? (
        <p className="rounded-2xl border border-white/10 p-8 text-center text-lg text-white/60">لا يوجد محامون ضمن نطاق العرض.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {data.rows.map((row) => (
            <section key={row.lawyerId} className={`rounded-3xl border p-5 shadow-lg shadow-black/10 ${TONE[row.status.state]}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold sm:text-2xl">{row.name}</h2>
                  {row.position && <p className="mt-1 text-sm text-white/55">{row.position}</p>}
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-extrabold">{row.status.label}</span>
              </div>
              {(row.status.placeName || row.status.activity) && (
                <p className="mt-4 text-base font-semibold leading-7 sm:text-lg">
                  {[row.status.placeName, row.status.activity].filter(Boolean).join(' · ')}
                </p>
              )}
              {row.status.since && (
                <p className="mt-1 text-xs text-white/50">منذ {shortTime(row.status.since)}
                  {row.status.transitMinutes !== null && ` · زمن الانتقال المتوقع ${row.status.transitMinutes} دقيقة`}
                </p>
              )}
              <div className="mt-4 border-t border-white/10 pt-3">
                <h3 className="mb-2 text-xs font-black text-white/65">مهام اليوم</h3>
                {row.tasks.length === 0 ? (
                  <p className="text-sm text-white/40">لا توجد مهام مفتوحة اليوم</p>
                ) : (
                  <ul className="space-y-2">
                    {row.tasks.map((task) => (
                      <li key={task.id} className="rounded-xl bg-black/20 px-3 py-2.5 text-sm">
                        <span className="font-bold">{task.time ? task.time + ' · ' : ''}{task.locationName}</span>
                        <span className="mt-0.5 block leading-6 text-white/75">{task.description}</span>
                        {task.caseLabel && <span className="mt-0.5 block text-xs text-white/45">{task.caseLabel}</span>}
                      </li>
                    ))}
                    {row.moreTasks > 0 && <li className="text-xs text-white/50">و {row.moreTasks} مهام أخرى</li>}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
