'use client';
import { useEffect, useState } from 'react';

type P = { id: string; title: string; steps: string[] };
/** Item 142: apply a playbook to this case. Creates one checklist item per step in the case register above. */
export function PlaybookApply({ caseId, canEdit }: { caseId: string; canEdit: boolean }) {
  const [pbs, setPbs] = useState<P[]>([]); const [sel, setSel] = useState(''); const [msg, setMsg] = useState('');
  useEffect(() => { fetch('/api/playbooks').then((r) => (r.ok ? r.json() : { playbooks: [] })).then((d) => setPbs(d.playbooks)); }, []);
  if (!canEdit || pbs.length === 0) return null;
  async function apply() { setMsg(''); const r = await fetch(`/api/cases/${caseId}/playbook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ playbookId: sel }) }); const j = await r.json().catch(() => ({})); setMsg(r.ok ? 'تمت إضافة ' + j.created + ' بنود إلى قوائم التحقق. أعد تحميل الصفحة لرؤيتها.' : (j.error ?? 'تعذر التطبيق')); }
  return (
    <section aria-label="تطبيق دليل إجراءات" className="mt-3 rounded-2xl border border-navy-100 bg-white p-3 text-xs">
      <select aria-label="دليل الإجراءات" value={sel} onChange={(e) => setSel(e.target.value)} className="rounded border p-1"><option value="">اختر دليل إجراءات</option>{pbs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
      <button type="button" disabled={!sel} onClick={apply} className="ms-2 rounded bg-navy-950 px-3 py-1 font-bold text-white disabled:opacity-40">تطبيق على القضية</button>
      {msg && <p role="status" className="mt-1 text-navy-500">{msg}</p>}
    </section>
  );
}
