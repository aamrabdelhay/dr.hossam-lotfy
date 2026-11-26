'use client';
import { useState } from 'react';

type Res = { clients: { id: string; name: string; phone: string | null; status: string }[]; cases: { id: string; name: string; number: string; client_name: string | null; protected: boolean }[]; notice: string };
/** Item 129 (senior management only; the server refuses everyone else). Lists possible matches. A person decides. */
export function ConflictCheckPanel() {
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [res, setRes] = useState<Res | null>(null); const [msg, setMsg] = useState('');
  async function run() {
    setMsg(''); setRes(null); const r = await fetch('/api/admin/conflict-check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, ...(phone ? { phone } : {}) }) });
    if (r.ok) setRes(await r.json()); else setMsg(r.status === 403 ? 'للإدارة العليا فقط' : 'اكتب اسماً من 3 أحرف على الأقل');
  }
  const box = 'rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm';
  return (
    <section aria-label="كشف تعارض المصالح" className="mb-6 rounded-2xl border border-navy-100 bg-white p-4">
      <h2 className="mb-2 text-sm font-extrabold text-navy-950">كشف تعارض المصالح</h2>
      <div className="flex flex-wrap gap-2"><input aria-label="اسم الطرف" placeholder="اسم الطرف" value={name} onChange={(e) => setName(e.target.value)} className={box} /><input aria-label="الهاتف" placeholder="الهاتف (اختياري)" value={phone} onChange={(e) => setPhone(e.target.value)} className={box} /><button type="button" disabled={name.trim().length < 3} onClick={run} className="rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40">فحص</button></div>
      {msg && <p role="status" className="mt-2 text-xs font-bold text-red-700">{msg}</p>}
      {res && <div className="mt-3 text-xs"><p className="mb-1 text-amber-700">{res.notice}</p>
        <p className="font-bold">عملاء ({res.clients.length})</p><ul>{res.clients.map((c) => <li key={c.id}>{c.name} · {c.phone ?? '-'}{c.status === 'MERGED' ? ' · مدمج' : ''}</li>)}</ul>
        <p className="mt-2 font-bold">قضايا ({res.cases.length})</p><ul>{res.cases.map((c) => <li key={c.id}>{c.name} · {c.number}{c.protected ? ' · محمية' : ''}</li>)}</ul></div>}
    </section>
  );
}
