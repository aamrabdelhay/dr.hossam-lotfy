'use client';
import { useCallback, useEffect, useState } from 'react';

type Kind = 'MINUTES' | 'DECISION' | 'VISITOR' | 'INCIDENT' | 'MAINTENANCE' | 'LOAN' | 'DELEGATION' | 'HANDOVER' | 'ABSENCE' | 'PRINT';
type Entry = { id: string; kind: Kind; branch_id: string; title: string; body: string | null; occurred_on: string; ends_on?: string | null; expiry?: string | null; status: string };
const LABEL: Record<Kind, string> = { MINUTES: 'محاضر الاجتماعات', DECISION: 'القرارات الإدارية', VISITOR: 'سجل الزوار', INCIDENT: 'الحوادث والمشكلات', MAINTENANCE: 'الصيانة والدعم الفني', LOAN: 'استعارة وتسليم الملفات الورقية', DELEGATION: 'تقويم التفويضات', HANDOVER: 'تسليم واستلام الأعمال', ABSENCE: 'غياب المحامين والبدلاء', PRINT: 'مركز الطباعة' };
const EXP: Record<string, string> = { EXPIRED: 'منتهي', EXPIRING: 'ينتهي خلال 14 يومًا', ACTIVE: 'ساري' };
const NEEDS_END = ['DELEGATION', 'ABSENCE'];
const box = 'rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm';
/** Items 177, 178, 183, 188. Entries are never deleted; they can be closed. */
export function OfficeLogPanel() {
  const [kind, setKind] = useState<Kind>('MINUTES'); const [items, setItems] = useState<Entry[]>([]);
  const [endsOn, setEndsOn] = useState(''); const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [msg, setMsg] = useState('');
  const load = useCallback(async () => { const r = await fetch('/api/admin/office-log?kind=' + kind); setItems(r.ok ? (await r.json()).entries : []); }, [kind]);
  useEffect(() => { load(); }, [load]);
  async function add() { setMsg(''); const r = await fetch('/api/admin/office-log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, title, ...(body ? { body } : {}), ...(endsOn ? { endsOn } : {}) }) }); if (r.ok) { setTitle(''); setBody(''); setEndsOn(''); load(); } else setMsg('تعذر الحفظ'); }
  async function close(id: string) { const r = await fetch('/api/admin/office-log', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status: 'CLOSED' }) }); if (r.ok) load(); else setMsg('تعذر التحديث'); }
  return (
    <section aria-label="سجل المكتب" className="mb-6 rounded-2xl border border-navy-100 bg-white p-4">
      <h2 className="mb-2 text-sm font-extrabold text-navy-950">سجل المكتب</h2>
      <div className="mb-3 flex flex-wrap gap-2">{(Object.keys(LABEL) as Kind[]).map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-lg px-3 py-1.5 text-xs font-extrabold ${k === kind ? 'bg-navy-950 text-white' : 'border border-navy-200'}`}>{LABEL[k]}</button>)}</div>
      {msg && <p role="status" className="mb-2 text-xs font-bold text-red-700">{msg}</p>}
      <div className="mb-3 flex flex-wrap gap-2"><input aria-label="العنوان" placeholder="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} className={box} /><input aria-label="التفاصيل" placeholder="التفاصيل" value={body} onChange={(e) => setBody(e.target.value)} className={box + ' min-w-[14rem]'} />{NEEDS_END.includes(kind) && <input aria-label="تاريخ النهاية" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} className={box} />}<button type="button" disabled={title.trim().length < 2 || (NEEDS_END.includes(kind) && !endsOn)} onClick={add} className="rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40">إضافة</button></div>
      {items.length === 0 ? <p className="text-xs text-navy-400">لا توجد إدخالات.</p> : <ul className="divide-y divide-navy-100 text-xs">{items.map((e) => <li key={e.id} className="flex items-center justify-between gap-2 py-2"><span><b>{e.title}</b> · {e.occurred_on}{e.ends_on ? ' إلى ' + e.ends_on : ''}{e.expiry ? ' · ' + EXP[e.expiry] : ''}{e.status === 'CLOSED' ? ' · مغلق' : ''}{e.body ? <span className="block text-navy-500">{e.body}</span> : null}</span>{e.status === 'OPEN' && <button type="button" onClick={() => close(e.id)} className="rounded border px-2 py-1">إغلاق</button>}</li>)}</ul>}
    </section>
  );
}
