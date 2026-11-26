'use client';
import { useCallback, useEffect, useState } from 'react';

type Kind = 'EXPERT' | 'TRANSLATOR' | 'PROVIDER';
type E = { id: string; kind: Kind; name: string; specialty: string | null; phone: string | null; email: string | null; notes: string | null };
const LABEL: Record<Kind, string> = { EXPERT: 'الخبراء', TRANSLATOR: 'المترجمون', PROVIDER: 'مقدمو الخدمات' };
const box = 'rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm';
/** Item 185. Everyone reads; the server only lets senior management and office managers add or deactivate. */
export function DirectoryPanel() {
  const [kind, setKind] = useState<Kind>('EXPERT'); const [items, setItems] = useState<E[]>([]);
  const [name, setName] = useState(''); const [spec, setSpec] = useState(''); const [phone, setPhone] = useState(''); const [msg, setMsg] = useState('');
  const load = useCallback(async () => { const r = await fetch('/api/directory?kind=' + kind); setItems(r.ok ? (await r.json()).entries : []); }, [kind]);
  useEffect(() => { load(); }, [load]);
  async function add() { setMsg(''); const r = await fetch('/api/directory', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, name, ...(spec ? { specialty: spec } : {}), ...(phone ? { phone } : {}) }) }); if (r.ok) { setName(''); setSpec(''); setPhone(''); load(); } else setMsg(r.status === 403 ? 'الإضافة للإدارة ومديري المكاتب فقط' : 'راجع البيانات'); }
  async function off(id: string) { const r = await fetch('/api/directory', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, active: false }) }); if (r.ok) load(); else setMsg('لا تملك صلاحية الإيقاف'); }
  return (
    <section aria-label="دليل الخبراء والمترجمين" className="mx-auto w-full max-w-[900px] px-4 py-6">
      <h1 className="mb-3 text-xl font-extrabold text-navy-950">دليل الخبراء والمترجمين ومقدمي الخدمات</h1>
      <div className="mb-3 flex flex-wrap gap-2">{(Object.keys(LABEL) as Kind[]).map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-lg px-3 py-1.5 text-xs font-extrabold ${k === kind ? 'bg-navy-950 text-white' : 'border border-navy-200'}`}>{LABEL[k]}</button>)}</div>
      {msg && <p role="status" className="mb-2 text-xs font-bold text-red-700">{msg}</p>}
      <div className="mb-3 flex flex-wrap gap-2"><input aria-label="الاسم" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} className={box} /><input aria-label="التخصص" placeholder="التخصص" value={spec} onChange={(e) => setSpec(e.target.value)} className={box} /><input aria-label="الهاتف" placeholder="الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} className={box} /><button type="button" disabled={name.trim().length < 2} onClick={add} className="rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40">إضافة</button></div>
      {items.length === 0 ? <p className="text-xs text-navy-400">لا توجد جهات في هذا القسم.</p> : <ul className="divide-y divide-navy-100 text-sm">{items.map((e) => <li key={e.id} className="flex items-center justify-between gap-2 py-2"><span><b>{e.name}</b>{e.specialty ? ' · ' + e.specialty : ''}{e.phone ? ' · ' + e.phone : ''}</span><button type="button" onClick={() => off(e.id)} className="rounded border px-2 py-1 text-xs">إيقاف</button></li>)}</ul>}
    </section>
  );
}
