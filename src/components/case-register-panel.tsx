'use client';
import { useCallback, useEffect, useState } from 'react';

type Kind = 'ENFORCEMENT' | 'EXPERT_MISSION' | 'POA' | 'CORRESPONDENCE' | 'CUSTODY' | 'MONEY' | 'CHECKLIST' | 'NOTE' | 'OBLIGATION';
type Item = { id: string; kind: Kind; title: string; status: 'OPEN' | 'DONE' | 'CANCELLED'; due_date: string | null; amount: string | null; data: Record<string, unknown> };
const LABEL: Record<Kind, string> = { NOTE: 'دفتر الملاحظات القانونية', OBLIGATION: 'التزامات العقود', ENFORCEMENT: 'التنفيذ', EXPERT_MISSION: 'مأموريات الخبراء', POA: 'التوكيلات', CORRESPONDENCE: 'المراسلات الرسمية', CUSTODY: 'سجل حيازة الأدلة', MONEY: 'الرسوم والكفالات والمرتجعات', CHECKLIST: 'قوائم التحقق' };
const STATUS: Record<string, string> = { OPEN: 'مفتوح', DONE: 'تم', CANCELLED: 'ملغي' };
const box = 'rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm';

export function CaseRegisterPanel({ caseId, canEdit }: { caseId: string; canEdit: boolean }) {
  const [kind, setKind] = useState<Kind>('POA');
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    const r = await fetch(`/api/cases/${caseId}/register?kind=${kind}`);
    setItems(r.ok ? (await r.json()).items : []);
  }, [caseId, kind]);
  useEffect(() => { load(); }, [load]);
  async function add() {
    setMsg('');
    const body: Record<string, unknown> = { kind, title, ...(due ? { dueDate: due } : {}), ...(kind === 'MONEY' ? { amount: Number(amount) } : {}), ...(kind === 'CHECKLIST' ? { data: { phase: 'OPENING', done: false } } : {}) };
    const r = await fetch(`/api/cases/${caseId}/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) { setTitle(''); setAmount(''); setDue(''); load(); } else setMsg(r.status === 403 ? 'لا تملك صلاحية التعديل' : 'تعذر الحفظ، راجع البيانات');
  }
  async function setStatus(id: string, status: Item['status']) {
    const r = await fetch(`/api/cases/${caseId}/register`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId: id, status }) });
    if (r.ok) load(); else setMsg('تعذر التحديث');
  }
  return (
    <section aria-label="سجل القضية" className="mt-6 rounded-2xl border border-navy-100 bg-white p-4">
      <h2 className="mb-3 text-base font-extrabold text-navy-950">سجل القضية</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(LABEL) as Kind[]).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-lg px-3 py-1.5 text-xs font-extrabold ${k === kind ? 'bg-navy-950 text-white' : 'border border-navy-200 text-navy-700'}`}>{LABEL[k]}</button>
        ))}
      </div>
      {msg && <p role="status" className="mb-2 text-xs font-bold text-red-700">{msg}</p>}
      {items.length === 0 ? <p className="text-xs font-semibold text-navy-400">لا توجد سجلات بعد.</p> : (
        <ul className="divide-y divide-navy-100">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm font-semibold text-navy-800">
              <span>{i.title}{i.amount ? ` — ${Number(i.amount).toLocaleString('ar-EG')} ج.م` : ''}{i.due_date ? ` — ${String(i.due_date).slice(0, 10)}` : ''}</span>
              <span className="flex items-center gap-2 text-xs">
                <span className="rounded bg-navy-50 px-2 py-0.5 font-extrabold">{STATUS[i.status]}</span>
                {canEdit && kind !== 'CUSTODY' && i.status === 'OPEN' && <button type="button" onClick={() => setStatus(i.id, 'DONE')} className="font-extrabold text-gold-700 underline">تم</button>}
                {canEdit && kind !== 'CUSTODY' && i.status === 'OPEN' && <button type="button" onClick={() => setStatus(i.id, 'CANCELLED')} className="font-extrabold text-navy-500 underline">إلغاء</button>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className={box + ' min-w-[14rem] flex-1'} placeholder="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} />
          {kind === 'MONEY' && <input className={box + ' w-32'} type="number" min="0" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} />}
          <input className={box} type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="التاريخ" />
          <button type="button" disabled={!title || (kind === 'MONEY' && !amount)} onClick={add} className="rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40">إضافة</button>
        </div>
      ) : <p className="mt-3 text-xs font-semibold text-navy-400">للعرض فقط.</p>}
      {kind === 'CUSTODY' && <p className="mt-2 text-xs font-semibold text-navy-400">سجل الحيازة للإضافة فقط ولا يمكن تعديله.</p>}
    </section>
  );
}
