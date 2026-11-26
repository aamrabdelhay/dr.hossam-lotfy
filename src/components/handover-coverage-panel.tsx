'use client';
import { useState } from 'react';

type Cov = { items: { id: string; description: string; d: string | null; t: string | null; case_number: string | null; needsSubstitute: boolean }[]; notice: string };
type Hand = { name: string; openTasks: { id: string; description: string; d: string | null; case_number: string | null }[]; cases: { id: string; number: string; name: string }[]; openRegisterItems: { id: string; kind: string; title: string }[]; filesUploaded: number; openDeadlinesCreated: { id: string; due: string }[]; notice: string };
const box = 'rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm';
/** Items 172 and 163: follow-up checklists for senior management. Read only. Nothing is reassigned automatically; a person picks the substitute and records the transfer in the office log. */
export function HandoverCoveragePanel({ lawyers }: { lawyers: { id: string; name: string }[] }) {
  const [lawyerId, setLawyerId] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [cov, setCov] = useState<Cov | null>(null); const [hand, setHand] = useState<Hand | null>(null); const [msg, setMsg] = useState('');
  async function getCov() { setMsg(''); setCov(null); const r = await fetch(`/api/admin/coverage?lawyerId=${encodeURIComponent(lawyerId)}&from=${from}&to=${to}`); const j = await r.json().catch(() => ({})); if (r.ok) setCov(j); else setMsg(j.error ?? 'تعذر التحميل'); }
  async function getHand() { setMsg(''); setHand(null); const r = await fetch(`/api/admin/handover?lawyerId=${encodeURIComponent(lawyerId)}`); const j = await r.json().catch(() => ({})); if (r.ok) setHand(j); else setMsg(j.error ?? 'تعذر التحميل'); }
  return (
    <section aria-label="تغطية الغياب وتسليم العمل" className="mb-4 rounded-2xl border border-navy-100 bg-white p-4 text-xs">
      <h2 className="mb-1 text-sm font-extrabold text-navy-950">تغطية الغياب وتسليم العمل</h2>
      <p className="mb-2 text-navy-400">قوائم متابعة للإدارة العليا فقط. لا يتم تغيير أو توزيع أي شيء تلقائيًا. اختيار البديل وتسجيل التسليم قرار بشري ويسجل في سجل المكتب.</p>
      <div className="mb-2 flex flex-wrap gap-2">
        <select aria-label="المحامي" value={lawyerId} onChange={(e) => setLawyerId(e.target.value)} className={box}><option value="">اختر المحامي</option>{lawyers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <input type="date" aria-label="من تاريخ" value={from} onChange={(e) => setFrom(e.target.value)} className={box} />
        <input type="date" aria-label="إلى تاريخ" value={to} onChange={(e) => setTo(e.target.value)} className={box} />
        <button type="button" disabled={!lawyerId || !from || !to} onClick={getCov} className="rounded-lg bg-navy-950 px-3 py-2 font-extrabold text-white disabled:opacity-40">قائمة تغطية الغياب</button>
        <button type="button" disabled={!lawyerId} onClick={getHand} className="rounded-lg border border-navy-300 px-3 py-2 font-extrabold disabled:opacity-40">قائمة تسليم العمل</button>
      </div>
      {msg && <p role="status" className="font-bold text-red-700">{msg}</p>}
      {cov && <div aria-label="نتيجة تغطية الغياب"><p className="font-bold">{cov.items.length} مهمة مفتوحة في الفترة</p><ul className="divide-y divide-navy-100">{cov.items.map((i) => <li key={i.id} className="py-1" dir="auto">{i.d} {i.t ?? ''} · {i.description}{i.case_number ? ' · قضية ' + i.case_number : ''}{i.needsSubstitute ? ' · يحتاج بديلًا' : ''}</li>)}</ul><p className="text-navy-400">{cov.notice}</p></div>}
      {hand && <div aria-label="نتيجة تسليم العمل"><p className="font-bold" dir="auto">{hand.name}: {hand.openTasks.length} مهمة مفتوحة · {hand.cases.length} قضية · {hand.openRegisterItems.length} بند في سجل القضايا · {hand.openDeadlinesCreated.length} موعد مفتوح · {hand.filesUploaded} ملف مرفوع</p><ul className="divide-y divide-navy-100">{hand.cases.map((c) => <li key={c.id} className="py-1" dir="auto">{c.number} · {c.name}</li>)}</ul><p className="text-navy-400">{hand.notice}</p></div>}
    </section>
  );
}
