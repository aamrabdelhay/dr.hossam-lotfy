'use client';
import { useCallback, useEffect, useState } from 'react';

type It = { id: string; name: string; unit: string; min_qty: number; qty: number; low: boolean };
const box = 'rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm';
/** Item 182. Stock changes are movements; the quantity is their sum and cannot go below zero. */
export function InventoryPanel() {
  const [items, setItems] = useState<It[]>([]); const [name, setName] = useState(''); const [qty, setQty] = useState(''); const [min, setMin] = useState(''); const [msg, setMsg] = useState('');
  const load = useCallback(async () => { const r = await fetch('/api/admin/inventory'); setItems(r.ok ? (await r.json()).items : []); }, []);
  useEffect(() => { load(); }, [load]);
  async function add() { setMsg(''); const r = await fetch('/api/admin/inventory', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, ...(qty ? { initialQty: Number(qty) } : {}), ...(min ? { minQty: Number(min) } : {}) }) }); if (r.ok) { setName(''); setQty(''); setMin(''); load(); } else setMsg('تعذر الحفظ'); }
  async function mv(id: string, delta: number) { setMsg(''); const r = await fetch('/api/admin/inventory', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId: id, delta }) }); if (r.ok) load(); else setMsg((await r.json().catch(() => ({}))).error || 'تعذر التحديث'); }
  return (
    <section aria-label="المخزون" className="mb-6 rounded-2xl border border-navy-100 bg-white p-4">
      <h2 className="mb-2 text-sm font-extrabold text-navy-950">المخزون</h2>
      {msg && <p role="status" className="mb-2 text-xs font-bold text-red-700">{msg}</p>}
      <div className="mb-3 flex flex-wrap gap-2"><input aria-label="اسم الصنف" placeholder="اسم الصنف" value={name} onChange={(e) => setName(e.target.value)} className={box} /><input aria-label="الرصيد الافتتاحي" type="number" min={1} placeholder="الرصيد" value={qty} onChange={(e) => setQty(e.target.value)} className={box + ' w-24'} /><input aria-label="الحد الأدنى" type="number" min={0} placeholder="الحد الأدنى" value={min} onChange={(e) => setMin(e.target.value)} className={box + ' w-28'} /><button type="button" disabled={name.trim().length < 2} onClick={add} className="rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40">إضافة صنف</button></div>
      {items.length === 0 ? <p className="text-xs text-navy-400">لا توجد أصناف.</p> : <ul className="divide-y divide-navy-100 text-xs">{items.map((i) => <li key={i.id} className="flex items-center justify-between gap-2 py-2"><span><b>{i.name}</b> · {i.qty} {i.unit}{i.low ? <span className="font-extrabold text-red-700"> · أقل من الحد الأدنى ({i.min_qty})</span> : null}</span><span className="flex gap-1"><button type="button" onClick={() => mv(i.id, 1)} className="rounded border px-2 py-1">+1</button><button type="button" onClick={() => mv(i.id, -1)} className="rounded border px-2 py-1">-1</button></span></li>)}</ul>}
    </section>
  );
}
