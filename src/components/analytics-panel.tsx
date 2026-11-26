'use client';
import { useState } from 'react';

type W = { id: string; name: string; open: number; overdue: number; next30: number; done30: number; loadPercent: number; overCapacity: boolean };
type D = { workload: W[]; health: Record<string, number>; bottlenecks: { staleDays: number; byStatus: { status: string; cases: number; stale: number }[] }; branches: { id: string; name: string; cases: number; overdue_tasks: number; open_register: number }[]; simulation: { extraTasks: number; result: { id: string; before: number; added: number; after: number; loadPercent: number; overCapacity: boolean }[] } | null; notice: string };
const H: Record<string, string> = { open_cases: 'قضايا مفتوحة', overdue_tasks: 'مهام متأخرة', open_deadlines: 'مهل مفتوحة', overdue_deadlines: 'مهل متأخرة', open_register: 'بنود سجل مفتوحة' };

/** Items 166/167/168/169/171/189: workload, stale cases, health, branch comparison and a simple load simulation. Senior management only (the API refuses others). */
export function AnalyticsPanel() {
  const [cap, setCap] = useState('10'); const [extra, setExtra] = useState('0'); const [d, setD] = useState<D | null>(null); const [err, setErr] = useState('');
  async function run() {
    setErr(''); const r = await fetch(`/api/admin/analytics?capacity=${encodeURIComponent(cap)}&extra=${encodeURIComponent(extra)}`);
    if (!r.ok) { setErr((await r.json().catch(() => ({}))).error ?? 'تعذر التحميل'); return; } setD(await r.json());
  }
  const names = new Map(d?.workload.map((w) => [w.id, w.name]));
  return (
    <section aria-label="تقارير المكتب" className="mt-6 rounded-2xl border border-navy-100 bg-white p-4">
      <h2 className="mb-2 text-base font-extrabold text-navy-950">تقارير المكتب والطاقة الاستيعابية</h2>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <label>الطاقة الاستيعابية (مهام مفتوحة لكل محامٍ) <input aria-label="الطاقة الاستيعابية" value={cap} onChange={(e) => setCap(e.target.value)} className="w-16 rounded border p-1" inputMode="numeric" /></label>
        <label>محاكاة مهام إضافية <input aria-label="مهام إضافية" value={extra} onChange={(e) => setExtra(e.target.value)} className="w-16 rounded border p-1" inputMode="numeric" /></label>
        <button type="button" onClick={run} className="rounded bg-navy-950 px-3 py-1 font-bold text-white">عرض التقرير</button>
      </div>
      {err && <p role="alert" className="text-xs text-red-700">{err}</p>}
      {d && (<div className="space-y-4 text-xs">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">{Object.entries(d.health).map(([k, v]) => <div key={k} className="rounded-lg bg-ivory-50 p-2"><dt className="text-[10px] text-navy-400">{H[k] ?? k}</dt><dd className="font-extrabold">{v}</dd></div>)}</dl>
        <table className="w-full text-start"><caption className="mb-1 text-start font-bold">حمل العمل لكل محامٍ</caption><thead><tr className="text-navy-400"><th className="text-start">المحامي</th><th>مفتوحة</th><th>متأخرة</th><th>30 يوم</th><th>الحمل</th></tr></thead>
          <tbody>{d.workload.map((w) => <tr key={w.id} className="border-t border-navy-100"><td>{w.name}</td><td>{w.open}</td><td>{w.overdue}</td><td>{w.next30}</td><td className={w.overCapacity ? 'font-extrabold text-red-700' : ''}>{w.loadPercent}%{w.overCapacity ? ' (فوق الطاقة)' : ''}</td></tr>)}</tbody></table>
        <table className="w-full text-start"><caption className="mb-1 text-start font-bold">القضايا الراكدة ({d.bottlenecks.staleDays} يوم بدون نشاط)</caption><tbody>{d.bottlenecks.byStatus.map((s) => <tr key={s.status} className="border-t border-navy-100"><td>{s.status}</td><td>{s.cases} قضية</td><td>{s.stale} راكدة</td></tr>)}</tbody></table>
        <table className="w-full text-start"><caption className="mb-1 text-start font-bold">مقارنة الفروع</caption><tbody>{d.branches.map((b) => <tr key={b.id} className="border-t border-navy-100"><td>{b.name}</td><td>{b.cases} قضية</td><td>{b.overdue_tasks} متأخرة</td><td>{b.open_register} بند سجل</td></tr>)}</tbody></table>
        {d.simulation && <table className="w-full text-start"><caption className="mb-1 text-start font-bold">محاكاة {d.simulation.extraTasks} مهمة إضافية</caption><tbody>{d.simulation.result.map((r) => <tr key={r.id} className="border-t border-navy-100"><td>{names.get(r.id)}</td><td>{r.before} ← {r.after}</td><td className={r.overCapacity ? 'font-extrabold text-red-700' : ''}>{r.loadPercent}%</td></tr>)}</tbody></table>}
        <p className="text-navy-400">{d.notice}</p>
      </div>)}
    </section>
  );
}
