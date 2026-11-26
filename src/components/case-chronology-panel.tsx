'use client';
import { useEffect, useState } from 'react';

type Ev = { at: string; source: string; title: string; detail?: string | null };
type P = { name: string; number: string; clientName: string | null; workflowStatus: string | null; upcomingSessions: number; pastSessions: number; nextSession: string | null; files: number; openRegisterItems: number; openDeadlines: number; nextDeadline: string | null };
const SRC: Record<string, string> = { EVENT: 'سجل القضية', SESSION: 'جلسة', REGISTER: 'سجل', DEADLINE: 'مهلة', FILE: 'ملف' };

/** Items 125/126: case passport (one card) and chronology (everything dated, newest first). */
export function CaseChronologyPanel({ caseId }: { caseId: string }) {
  const [d, setD] = useState<{ passport: P; events: Ev[] } | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => { fetch(`/api/cases/${caseId}/chronology`).then((r) => (r.ok ? r.json() : null)).then(setD); }, [caseId]);
  if (!d) return null;
  const p = d.passport; const shown = all ? d.events : d.events.slice(0, 10);
  return (
    <section aria-label="البطاقة الموحدة والتسلسل الزمني" className="mt-6 rounded-2xl border border-navy-100 bg-white p-4">
      <h2 className="mb-2 text-base font-extrabold text-navy-950">البطاقة الموحدة للقضية</h2>
      <dl className="mb-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[['الجلسات القادمة', p.upcomingSessions], ['الجلسة التالية', p.nextSession ?? '-'], ['الجلسات السابقة', p.pastSessions], ['الملفات', p.files], ['بنود السجل المفتوحة', p.openRegisterItems], ['المهل المفتوحة', p.openDeadlines], ['أقرب مهلة', p.nextDeadline ?? '-'], ['الحالة', p.workflowStatus ?? '-']].map(([k, v]) => <div key={String(k)} className="rounded-lg bg-ivory-50 p-2"><dt className="text-[10px] text-navy-400">{k}</dt><dd className="font-extrabold">{String(v)}</dd></div>)}
      </dl>
      <h3 className="mb-2 text-sm font-extrabold">التسلسل الزمني</h3>
      {d.events.length === 0 ? <p className="text-xs text-navy-400">لا توجد أحداث مسجلة.</p> : <ol className="divide-y divide-navy-100 text-xs">{shown.map((e, i) => <li key={i} className="flex gap-3 py-1.5"><span className="w-24 shrink-0 text-navy-400">{e.at.slice(0, 10)}</span><span className="w-20 shrink-0 font-bold">{SRC[e.source]}</span><span>{e.title}{e.detail ? <span className="text-navy-400"> · {e.detail}</span> : null}</span></li>)}</ol>}
      {d.events.length > 10 && <button type="button" onClick={() => setAll(!all)} className="mt-2 text-xs font-bold underline">{all ? 'عرض أقل' : 'عرض الكل (' + d.events.length + ')'}</button>}
    </section>
  );
}
