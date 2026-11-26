'use client';
import { useCallback, useEffect, useState } from 'react';

type Entry = { id: string; kind: string; amount: string; currency: string; due_on: string | null; status: string; note: string | null; created_at: string };
type Data = { entries: Entry[]; summary: Record<string, number | string | null>; flags: string[]; installments: { overdue: Entry[]; dueSoon: Entry[] }; statement: { id: string; kind: string; date: string; amount: string; balance: string }[]; profit: { net: number; timeCostIncluded: boolean } };
const KIND: Record<string, string> = { FEE_AGREEMENT: 'اتفاق أتعاب', INSTALLMENT: 'قسط', INVOICE: 'فاتورة', PAYMENT: 'دفعة', EXPENSE: 'مصروف قابل للاسترداد', BUDGET: 'ميزانية المصروفات', EXTRA_SCOPE: 'أتعاب إضافية', QUOTE: 'عرض خدمة', TRUST_IN: 'إيداع أمانات', TRUST_OUT: 'سحب أمانات' };
const FLAG: Record<string, string> = { PAID_MORE_THAN_INVOICED: 'المدفوع أكبر من المفوتر', TRUST_NEGATIVE: 'رصيد الأمانات سالب', BUDGET_EXCEEDED: 'المصروفات تجاوزت الميزانية', EXPENSES_NOT_REIMBURSED: 'مصروفات لم تسترد بعد' };
const NEXT: Record<string, [string, string][]> = { INSTALLMENT: [['PAID', 'تم السداد']], INVOICE: [['PAID', 'تم السداد']], EXPENSE: [['REIMBURSED', 'تم الاسترداد']], QUOTE: [['ACCEPTED', 'قبول'], ['REJECTED', 'رفض']], EXTRA_SCOPE: [['ACCEPTED', 'قبول'], ['REJECTED', 'رفض']] };
const box = 'rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-xs';
const money = (c: unknown) => (Number(c) / 100).toFixed(2);
/** Items 190-199, 202-204 UI. Visible only to finance management (the API refuses everyone else, and the panel stays hidden). Records only. */
export function CaseFinancePanel({ caseId }: { caseId: string }) {
  const [d, setD] = useState<Data | null>(null); const [kind, setKind] = useState('FEE_AGREEMENT'); const [amount, setAmount] = useState(''); const [due, setDue] = useState(''); const [note, setNote] = useState(''); const [msg, setMsg] = useState('');
  const load = useCallback(async () => { const r = await fetch(`/api/cases/${caseId}/finance`); setD(r.ok ? await r.json() : null); }, [caseId]);
  useEffect(() => { void load(); }, [load]);
  if (!d) return null;
  async function add() { setMsg(''); const r = await fetch(`/api/cases/${caseId}/finance`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, amount: Number(amount), ...(due && kind === 'INSTALLMENT' ? { dueOn: due } : {}), ...(note ? { note } : {}) }) }); const j = await r.json().catch(() => ({})); if (r.ok) { setAmount(''); setNote(''); setDue(''); setMsg(j.budgetState === 'EXCEEDED' ? 'تنبيه: المصروفات تجاوزت الميزانية' : j.budgetState === 'NEAR' ? 'تنبيه: المصروفات اقتربت من الميزانية' : 'تم الحفظ'); await load(); } else setMsg(j.error ?? 'تعذر الحفظ'); }
  async function setStatus(id: string, status: string) { setMsg(''); const r = await fetch(`/api/cases/${caseId}/finance`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status }) }); const j = await r.json().catch(() => ({})); if (!r.ok) setMsg(j.error ?? 'تعذر التحديث'); await load(); }
  const s = d.summary;
  return (
    <section aria-label="مالية القضية" className="mt-3 rounded-2xl border border-navy-100 bg-white p-4 text-xs">
      <h2 className="mb-1 text-sm font-extrabold text-navy-950">مالية القضية</h2>
      <p className="mb-2 text-navy-400">سجل مالي للإدارة المالية والعليا فقط. للتسجيل والمتابعة، لا يتم تحصيل أو إرسال أي شيء للعميل. الربحية = المدفوع ناقص المصروفات غير المستردة، وتكلفة الوقت غير محسوبة.</p>
      <p className="mb-2 font-bold" dir="auto">متفق عليه {money(s.agreed)} · مفوتر {money(s.invoiced)} · مدفوع {money(s.paid)} · متبقي {money(s.outstanding)} · مصروفات {money(s.expenses)}{s.budget ? ' من ' + money(s.budget) : ''} · أمانات {money(s.trustBalance)} · صافي {money(d.profit.net)}</p>
      {d.flags.length > 0 && <p role="alert" className="mb-2 font-bold text-red-700">{d.flags.map((f) => FLAG[f] ?? f).join(' · ')}</p>}
      {d.installments.overdue.length > 0 && <p role="alert" className="mb-2 font-bold text-red-700">أقساط متأخرة: {d.installments.overdue.length}</p>}
      {msg && <p role="status" className="mb-2 font-bold">{msg}</p>}
      <div className="mb-3 flex flex-wrap gap-2">
        <select aria-label="نوع القيد المالي" value={kind} onChange={(e) => setKind(e.target.value)} className={box}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input aria-label="المبلغ" inputMode="decimal" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} className={box} />
        {kind === 'INSTALLMENT' && <input aria-label="تاريخ الاستحقاق" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={box} />}
        <input aria-label="ملاحظة مالية" placeholder="ملاحظة" value={note} onChange={(e) => setNote(e.target.value)} className={box + ' min-w-[12rem]'} />
        <button type="button" disabled={!(Number(amount) > 0)} onClick={add} className="rounded-lg bg-navy-950 px-3 py-1.5 font-extrabold text-white disabled:opacity-40">إضافة قيد</button>
      </div>
      <ul className="divide-y divide-navy-100">{d.entries.map((e) => <li key={e.id} className="flex flex-wrap items-center gap-2 py-1.5" dir="auto"><b>{KIND[e.kind] ?? e.kind}</b><span>{Number(e.amount).toFixed(2)} {e.currency}</span>{e.due_on && <span>استحقاق {e.due_on}</span>}<span className="text-navy-400">{e.status}</span>{e.note && <span className="text-navy-500">{e.note}</span>}
        {e.status === 'OPEN' && (NEXT[e.kind] ?? []).map(([st, lb]) => <button key={st} type="button" onClick={() => void setStatus(e.id, st)} className="rounded border px-1.5 py-0.5">{lb}</button>)}
        {e.status === 'OPEN' && <button type="button" onClick={() => void setStatus(e.id, 'CANCELLED')} className="rounded border px-1.5 py-0.5 text-red-700">إلغاء</button>}
        {(e.kind === 'INVOICE' || e.kind === 'PAYMENT') && e.status !== 'CANCELLED' && (['ar', 'en', 'fr'] as const).map((l) => <a key={l} href={`/api/cases/${caseId}/finance/invoice?entry=${e.id}&lang=${l}`} target="_blank" rel="noreferrer" className="rounded border px-1.5 py-0.5">{e.kind === 'INVOICE' ? 'فاتورة' : 'إيصال'} {l}</a>)}
      </li>)}</ul>
      <p className="mt-2"><a className="font-bold underline" href="/api/admin/finance/export?format=csv">تصدير للمحاسب CSV</a> · <a className="font-bold underline" href="/api/admin/finance/export?format=xlsx">XLSX</a></p>
    </section>
  );
}
