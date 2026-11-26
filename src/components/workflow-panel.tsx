'use client';
import { useCallback, useEffect, useState } from 'react';

type Rule = { event_kind: string; enabled: boolean; threshold_days: number; notify_group: string };
const LABEL: Record<string, string> = { INSTALLMENT_OVERDUE: 'قسط متأخر', BUDGET_NEAR: 'اقتراب من ميزانية القضية', BUDGET_EXCEEDED: 'تجاوز ميزانية القضية', TASK_OVERDUE: 'مهمة متأخرة', REVIEW_PENDING: 'مستند ينتظر المراجعة' };
/** Items 205, 208, 210: workflow rules from a fixed list. Senior management only. A rule only sends an in-app notification. */
export function WorkflowPanel() {
  const [rules, setRules] = useState<Rule[]>([]); const [msg, setMsg] = useState('');
  const load = useCallback(async () => { const r = await fetch('/api/admin/workflow'); const j = r.ok ? (await r.json()).rules : []; setRules(Object.keys(LABEL).map((k) => j.find((x: Rule) => x.event_kind === k) ?? { event_kind: k, enabled: false, threshold_days: 0, notify_group: 'SENIOR' })); }, []);
  useEffect(() => { void load(); }, [load]);
  async function save(r: Rule, patch: Partial<Rule>) { const n = { ...r, ...patch }; await fetch('/api/admin/workflow', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ eventKind: n.event_kind, enabled: n.enabled, thresholdDays: n.threshold_days, notifyGroup: n.notify_group }) }); await load(); }
  async function run() { const r = await fetch('/api/admin/workflow/run', { method: 'POST' }); const j = await r.json().catch(() => ({})); setMsg(r.ok ? 'تم التشغيل: ' + Object.entries(j.sent).map(([k, v]) => LABEL[k] + ' ' + v).join('، ') : (j.error ?? 'تعذر التشغيل')); }
  return (
    <section aria-label="قواعد سير العمل" className="mb-4 rounded-2xl border border-navy-100 bg-white p-4 text-xs">
      <h2 className="mb-1 text-sm font-extrabold text-navy-950">قواعد سير العمل والتنبيهات</h2>
      <p className="mb-2 text-navy-400">قائمة ثابتة. كل قاعدة ترسل إشعارًا داخل النظام مرة واحدة يوميًا لكل حالة. لا يتم تفعيل أي قاعدة تلقائيًا. القضايا المحمية بحاجز أخلاقي أو السرية لا تظهر في الإشعارات.</p>
      <ul className="divide-y divide-navy-100">{rules.map((r) => <li key={r.event_kind} className="flex flex-wrap items-center gap-2 py-1.5"><label className="flex items-center gap-1 font-bold"><input type="checkbox" aria-label={'تفعيل ' + LABEL[r.event_kind]} checked={r.enabled} onChange={(e) => void save(r, { enabled: e.target.checked })} />{LABEL[r.event_kind]}</label>
        {['INSTALLMENT_OVERDUE', 'TASK_OVERDUE', 'REVIEW_PENDING'].includes(r.event_kind) && <label>بعد <input type="number" min={0} max={365} aria-label={'أيام ' + LABEL[r.event_kind]} defaultValue={r.threshold_days} onBlur={(e) => void save(r, { threshold_days: Number(e.target.value) || 0 })} className="w-14 rounded border px-1" /> يوم</label>}
        <select aria-label={'المستلمون ' + LABEL[r.event_kind]} value={r.notify_group} onChange={(e) => void save(r, { notify_group: e.target.value })} className="rounded border px-1"><option value="SENIOR">الإدارة العليا</option><option value="FINANCE">الإدارة العليا والمالية</option></select></li>)}</ul>
      <button type="button" onClick={run} className="mt-2 rounded-lg bg-navy-950 px-3 py-1.5 font-extrabold text-white">تشغيل القواعد الآن</button>
      {msg && <p role="status" className="mt-1 font-bold">{msg}</p>}
    </section>
  );
}
