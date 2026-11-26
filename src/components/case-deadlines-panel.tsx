'use client';
import { useCallback, useEffect, useState } from 'react';

type Rule = { id: string; name: string; unit: string; amount: number; source_ref: string };
type Dl = { id: string; rule_name: string; source_ref: string; start_date: string; due_date: string; note: string | null; status: string; daysLeft: number; overdue: boolean };
const UNIT: Record<string, string> = { DAYS: 'يوم', MONTHS: 'شهر', YEARS: 'سنة' };
const box = 'rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm';

/** Items 113/114: deadlines calculated from a recorded legal rule. A rule always shows its source. Every date is a helper that the responsible lawyer must check. */
export function CaseDeadlinesPanel({ caseId, canEdit }: { caseId: string; canEdit: boolean }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [items, setItems] = useState<Dl[]>([]);
  const [notice, setNotice] = useState('');
  const [ruleId, setRuleId] = useState('');
  const [start, setStart] = useState('');
  const [preview, setPreview] = useState('');
  const [msg, setMsg] = useState('');
  const [rn, setRn] = useState(''); const [ru, setRu] = useState('DAYS'); const [ra, setRa] = useState(''); const [rs, setRs] = useState('');
  const load = useCallback(async () => {
    const a = await fetch('/api/admin/deadline-rules'); if (a.ok) { const d = await a.json(); setRules(d.rules); setNotice(d.notice); }
    const b = await fetch(`/api/cases/${caseId}/deadlines`); setItems(b.ok ? (await b.json()).deadlines : []);
  }, [caseId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPreview(''); if (ruleId && start) fetch(`/api/admin/deadline-rules?ruleId=${ruleId}&startDate=${start}`).then((r) => r.ok ? r.json() : null).then((d) => setPreview(d ? d.dueDate : '')); }, [ruleId, start]);
  async function add() {
    setMsg(''); const r = await fetch(`/api/cases/${caseId}/deadlines`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ruleId, startDate: start }) });
    if (r.ok) { setStart(''); load(); } else setMsg(r.status === 403 ? 'لا تملك صلاحية التعديل' : 'تعذر الحفظ');
  }
  async function setStatus(id: string, status: string) { const r = await fetch(`/api/cases/${caseId}/deadlines`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deadlineId: id, status }) }); if (r.ok) load(); else setMsg('تعذر التحديث'); }
  async function addRule() {
    setMsg(''); const r = await fetch('/api/admin/deadline-rules', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: rn, unit: ru, amount: Number(ra), sourceRef: rs }) });
    if (r.ok) { setRn(''); setRa(''); setRs(''); load(); } else setMsg(r.status === 403 ? 'إضافة القواعد للإدارة العليا فقط' : 'راجع بيانات القاعدة والمصدر');
  }
  return (
    <section aria-label="المهل القانونية" className="mt-6 rounded-2xl border border-navy-100 bg-white p-4">
      <h2 className="mb-1 text-base font-extrabold text-navy-950">المهل القانونية</h2>
      <p className="mb-3 text-[11px] text-amber-700">{notice}</p>
      {msg && <p role="status" className="mb-2 text-xs font-bold text-red-700">{msg}</p>}
      {items.length === 0 ? <p className="mb-3 text-xs text-navy-400">لا توجد مهل مسجلة لهذه القضية.</p> : (
        <ul className="mb-3 divide-y divide-navy-100">{items.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
            <span><b>{d.rule_name}</b> · من {d.start_date} إلى <b>{d.due_date}</b> · <span className={d.overdue ? 'font-extrabold text-red-700' : ''}>{d.status !== 'OPEN' ? (d.status === 'DONE' ? 'تم' : 'ملغي') : d.overdue ? 'متأخرة ' + Math.abs(d.daysLeft) + ' يوم' : 'متبقي ' + d.daysLeft + ' يوم'}</span><br /><span className="text-[10px] text-navy-400">المصدر: {d.source_ref}</span></span>
            {canEdit && d.status === 'OPEN' && <span className="flex gap-1"><button type="button" onClick={() => setStatus(d.id, 'DONE')} className="rounded border px-2 py-1">تم</button><button type="button" onClick={() => setStatus(d.id, 'CANCELLED')} className="rounded border px-2 py-1">إلغاء</button></span>}
          </li>))}</ul>)}
      {canEdit && (rules.length === 0 ? <p className="text-xs text-navy-500">لا توجد قواعد مهل. تضيفها الإدارة العليا مع المصدر القانوني لكل قاعدة.</p> : (
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="قاعدة المهلة" value={ruleId} onChange={(e) => setRuleId(e.target.value)} className={box}><option value="">اختر القاعدة</option>{rules.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.amount} {UNIT[r.unit]})</option>)}</select>
          <input aria-label="تاريخ البداية" type="date" value={start} onChange={(e) => setStart(e.target.value)} className={box} />
          {preview && <span className="text-xs">تنتهي في <b>{preview}</b></span>}
          <button type="button" disabled={!ruleId || !start} onClick={add} className="rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40">حفظ المهلة</button>
        </div>))}
      <details className="mt-3 text-xs"><summary className="cursor-pointer font-bold">إضافة قاعدة مهلة (الإدارة العليا)</summary>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input aria-label="اسم القاعدة" placeholder="اسم القاعدة" value={rn} onChange={(e) => setRn(e.target.value)} className={box} />
          <input aria-label="المدة" type="number" min={1} placeholder="المدة" value={ra} onChange={(e) => setRa(e.target.value)} className={box + ' w-24'} />
          <select aria-label="الوحدة" value={ru} onChange={(e) => setRu(e.target.value)} className={box}>{Object.entries(UNIT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input aria-label="المصدر القانوني" placeholder="المصدر القانوني (المادة والقانون)" value={rs} onChange={(e) => setRs(e.target.value)} className={box + ' min-w-[16rem]'} />
          <button type="button" disabled={!rn || !ra || rs.trim().length < 5} onClick={addRule} className="rounded-lg border border-navy-300 px-3 py-2 font-extrabold disabled:opacity-40">حفظ القاعدة</button>
        </div></details>
    </section>
  );
}
