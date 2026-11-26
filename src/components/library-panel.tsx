'use client';
import { useCallback, useEffect, useState } from 'react';

type K = 'PRECEDENT' | 'JUDGMENT' | 'MEMO';
type E = { id: string; kind: K; title: string; court: string | null; decided_on: string | null; summary: string | null; source_ref: string; tags: string[] };
type P = { id: string; title: string; category: string | null; steps: string[] };
const LABEL: Record<K, string> = { PRECEDENT: 'سوابق', JUDGMENT: 'أحكام', MEMO: 'مذكرات' };
const box = 'rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm';
/** Items 144 and 142: library of precedents, judgments and memos (lawyers add, a source reference is required) and playbooks (senior management writes). Do not enter client data. */
export function LibraryPanel() {
  const [q, setQ] = useState(''); const [kind, setKind] = useState<K>('JUDGMENT'); const [items, setItems] = useState<E[]>([]); const [pbs, setPbs] = useState<P[]>([]);
  const [title, setTitle] = useState(''); const [court, setCourt] = useState(''); const [summary, setSummary] = useState(''); const [ref, setRef] = useState(''); const [msg, setMsg] = useState('');
  const [pt, setPt] = useState(''); const [ps, setPs] = useState('');
  const load = useCallback(async () => {
    const r = await fetch('/api/library?q=' + encodeURIComponent(q)); setItems(r.ok ? (await r.json()).entries : []);
    const p = await fetch('/api/playbooks'); setPbs(p.ok ? (await p.json()).playbooks : []);
  }, [q]);
  useEffect(() => { void load(); }, [load]);
  async function add() { setMsg(''); const r = await fetch('/api/library', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, title, sourceRef: ref, ...(court ? { court } : {}), ...(summary ? { summary } : {}) }) }); if (r.ok) { setTitle(''); setCourt(''); setSummary(''); setRef(''); await load(); } else setMsg((await r.json().catch(() => ({}))).error ?? 'تعذر الحفظ'); }
  async function addPb() { setMsg(''); const steps = ps.split('\n').map((x) => x.trim()).filter(Boolean); const r = await fetch('/api/playbooks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: pt, steps }) }); if (r.ok) { setPt(''); setPs(''); await load(); } else setMsg((await r.json().catch(() => ({}))).error ?? 'تعذر الحفظ'); }
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 text-xs">
      <section aria-label="مكتبة السوابق والأحكام والمذكرات" className="rounded-2xl border border-navy-100 bg-white p-4">
        <h1 className="mb-2 text-base font-extrabold text-navy-950">مكتبة السوابق والأحكام والمذكرات</h1>
        <p className="mb-2 text-navy-400">نص وملخص ومرجع فقط. لا تدخل بيانات موكلين. المرجع إلزامي.</p>
        <input aria-label="بحث في المكتبة" placeholder="بحث" value={q} onChange={(e) => setQ(e.target.value)} className={box + ' mb-3'} />
        {msg && <p role="status" className="mb-2 font-bold text-red-700">{msg}</p>}
        <div className="mb-3 flex flex-wrap gap-2">
          <select aria-label="نوع الإدخال" value={kind} onChange={(e) => setKind(e.target.value as K)} className={box}>{(Object.keys(LABEL) as K[]).map((k) => <option key={k} value={k}>{LABEL[k]}</option>)}</select>
          <input aria-label="عنوان الإدخال" placeholder="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} className={box} />
          <input aria-label="المحكمة" placeholder="المحكمة" value={court} onChange={(e) => setCourt(e.target.value)} className={box} />
          <input aria-label="ملخص" placeholder="ملخص" value={summary} onChange={(e) => setSummary(e.target.value)} className={box + ' min-w-[14rem]'} />
          <input aria-label="المرجع" placeholder="المرجع (إلزامي)" value={ref} onChange={(e) => setRef(e.target.value)} className={box} />
          <button type="button" disabled={title.trim().length < 3 || ref.trim().length < 3} onClick={add} className="rounded-lg bg-navy-950 px-3 py-2 font-extrabold text-white disabled:opacity-40">إضافة للمكتبة</button>
        </div>
        {items.length === 0 ? <p className="text-navy-400">لا توجد إدخالات.</p> : <ul className="divide-y divide-navy-100">{items.map((e) => <li key={e.id} className="py-1.5"><b dir="auto">{e.title}</b> · {LABEL[e.kind]}{e.court ? ' · ' + e.court : ''}{e.decided_on ? ' · ' + e.decided_on : ''}{e.summary ? <span className="block text-navy-500" dir="auto">{e.summary}</span> : null}<span className="block text-navy-400" dir="auto">المرجع: {e.source_ref}</span></li>)}</ul>}
      </section>
      <section aria-label="أدلة الإجراءات" className="rounded-2xl border border-navy-100 bg-white p-4">
        <h2 className="mb-2 text-sm font-extrabold text-navy-950">أدلة الإجراءات</h2>
        <p className="mb-2 text-navy-400">تكتبها الإدارة العليا فقط. لا يوجد دليل جاهز في النظام. يمكن تطبيق الدليل من صفحة القضية.</p>
        <div className="mb-3 flex flex-wrap gap-2"><input aria-label="عنوان الدليل" placeholder="عنوان الدليل" value={pt} onChange={(e) => setPt(e.target.value)} className={box} /><textarea aria-label="خطوات الدليل" placeholder="خطوة في كل سطر" value={ps} onChange={(e) => setPs(e.target.value)} className={box + ' min-w-[14rem]'} rows={3} /><button type="button" disabled={pt.trim().length < 3 || !ps.trim()} onClick={addPb} className="rounded-lg bg-navy-950 px-3 py-2 font-extrabold text-white disabled:opacity-40">إضافة دليل</button></div>
        {pbs.length === 0 ? <p className="text-navy-400">لا توجد أدلة.</p> : <ul className="divide-y divide-navy-100">{pbs.map((p) => <li key={p.id} className="py-1.5"><b>{p.title}</b> · {p.steps.length} خطوات</li>)}</ul>}
      </section>
    </div>
  );
}
