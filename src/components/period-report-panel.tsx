'use client';
import { useState } from 'react';
type Row = { month: string; branch: string; tasksCreated: number; tasksCompleted: number; filesUploaded: number; invoiced: number | null; received: number | null; tasksCompletedDelta: number | null; filesUploadedDelta: number | null };
type Rep = { months: string[]; rows: Row[]; notes: string[]; branchNames?: Record<string, string> };
const box = 'rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-xs';
const nf = new Intl.NumberFormat('ar-EG');
const mf = new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthLabel = (m: string) => new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(m + '-01T00:00:00Z'));
const delta = (d: number | null) => d === null ? <span className="text-navy-400">لا توجد مقارنة (أول شهر)</span> : d === 0 ? <span>بدون تغيير</span> : <span className={d > 0 ? 'font-bold text-green-700' : 'font-bold text-red-700'} dir="ltr">{d > 0 ? '+' : '-'}{nf.format(Math.abs(d))}</span>;
/** Items 212/213 UI: readable branch-by-month table. Generated on request only, nothing is sent. Senior management; the API enforces it. */
export function PeriodReportPanel() {
  const m = new Date().toISOString().slice(0, 7);
  const [from, setFrom] = useState(m); const [to, setTo] = useState(m);
  const [data, setData] = useState<Rep | null>(null); const [msg, setMsg] = useState(''); const [raw, setRaw] = useState(false);
  async function run() { setMsg(''); const r = await fetch(`/api/admin/reports/period?from=${from}&to=${to}`); const j = await r.json().catch(() => ({})); if (r.ok) setData(j); else { setData(null); setMsg(j.error ?? 'تعذر إنشاء التقرير'); } }
  const href = `/api/admin/reports/period?from=${from}&to=${to}&format=xlsx`;
  const fin = !!data?.rows.some((r) => r.invoiced !== null);
  const rows = data ? [...data.rows].sort((a, b) => (a.month === b.month ? (a.branch < b.branch ? -1 : 1) : a.month < b.month ? -1 : 1)) : [];
  const tot = rows.reduce((t, r) => ({ c: t.c + r.tasksCreated, d: t.d + r.tasksCompleted, f: t.f + r.filesUploaded, i: t.i + (r.invoiced ?? 0), p: t.p + (r.received ?? 0) }), { c: 0, d: 0, f: 0, i: 0, p: 0 });
  const th = 'px-2 py-1.5 text-start font-extrabold'; const td = 'px-2 py-1.5';
  return (
    <section aria-label="تقرير الفترة" className="mt-4 rounded-2xl border border-navy-100 bg-white p-4 text-xs">
      <h2 className="mb-1 text-sm font-extrabold text-navy-950">تقرير الفترة والمقارنة بين الفروع</h2>
      <p className="mb-2 text-navy-400">أرقام فقط، يتم إنشاؤه عند الطلب ولا يُرسل لأحد.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="flex items-center gap-1">من <input aria-label="من شهر" type="month" value={from} onChange={(e) => setFrom(e.target.value)} className={box} /></label>
        <label className="flex items-center gap-1">إلى <input aria-label="إلى شهر" type="month" value={to} onChange={(e) => setTo(e.target.value)} className={box} /></label>
        <button type="button" onClick={run} className="rounded-lg bg-navy-950 px-3 py-1.5 font-extrabold text-white">إنشاء التقرير</button>
        <a className="self-center font-bold underline" href={href}>تحميل Excel</a>
      </div>
      {msg && <p role="alert" className="font-bold text-red-700">{msg}</p>}
      {data && rows.length === 0 && <p role="status" className="rounded-lg bg-navy-50 p-3 font-bold">لا توجد بيانات في الفترة من {monthLabel(data.months[0])} إلى {monthLabel(data.months[data.months.length - 1])}.</p>}
      {data && rows.length > 0 && (
        <>
          <div className="mb-2 flex flex-wrap gap-2">
            {[['مهام جديدة', tot.c], ['مهام منتهية', tot.d], ['ملفات مرفوعة', tot.f]].map(([l, v]) => <div key={String(l)} className="min-w-[8rem] rounded-lg border border-navy-100 px-3 py-2"><div className="text-lg font-extrabold">{nf.format(Number(v))}</div><div>{l}</div></div>)}
            {fin && <><div className="min-w-[8rem] rounded-lg border border-navy-100 px-3 py-2"><div className="text-lg font-extrabold">{mf.format(tot.i)}</div><div>مفوتر</div></div><div className="min-w-[8rem] rounded-lg border border-navy-100 px-3 py-2"><div className="text-lg font-extrabold">{mf.format(tot.p)}</div><div>محصل</div></div></>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-start">
              <thead className="bg-navy-50"><tr><th className={th}>الشهر</th><th className={th}>الفرع</th><th className={th}>مهام جديدة</th><th className={th}>مهام منتهية</th><th className={th}>التغير عن الشهر السابق</th><th className={th}>ملفات مرفوعة</th><th className={th}>التغير عن الشهر السابق</th>{fin && <><th className={th}>مفوتر</th><th className={th}>محصل</th></>}</tr></thead>
              <tbody className="divide-y divide-navy-100">{rows.map((r) => <tr key={r.month + r.branch}><td className={td}>{monthLabel(r.month)}</td><td className={td}>{r.branch === '-' ? 'بدون فرع' : data.branchNames?.[r.branch] ?? r.branch}</td><td className={td}>{nf.format(r.tasksCreated)}</td><td className={td}>{nf.format(r.tasksCompleted)}</td><td className={td}>{delta(r.tasksCompletedDelta)}</td><td className={td}>{nf.format(r.filesUploaded)}</td><td className={td}>{delta(r.filesUploadedDelta)}</td>{fin && <><td className={td}>{mf.format(r.invoiced ?? 0)}</td><td className={td}>{mf.format(r.received ?? 0)}</td></>}</tr>)}</tbody>
            </table>
          </div>
        </>
      )}
      {data && <ul className="mt-2 list-disc pr-5 text-navy-500">{data.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      {data && <button type="button" onClick={() => setRaw(!raw)} className="mt-2 text-[10px] underline">{raw ? 'إخفاء البيانات الخام' : 'عرض البيانات الخام (للفحص فقط)'}</button>}
      {data && raw && <pre dir="ltr" className="mt-1 max-h-48 overflow-auto rounded bg-navy-50 p-2">{JSON.stringify(data, null, 1)}</pre>}
    </section>
  );
}
