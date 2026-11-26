'use client';
import { useCallback, useEffect, useState } from 'react';

type Party = { id: string; role: string; name: string; phone: string | null; note: string | null };
type Link = { id: string; caseId: string; name: string; number: string; relation: string; direction: string };
const ROLE: Record<string, string> = { CLIENT: 'موكل', OPPONENT: 'خصم', WITNESS: 'شاهد', EXPERT: 'خبير', OTHER: 'آخر' };
const REL: Record<string, string> = { PARENT: 'قضية أصلية', APPEAL: 'استئناف', RELATED: 'مرتبطة', CONSOLIDATED: 'مضمومة' };

/** Items 127/128/135: parties of the case and the cases linked to it. The server hides links to cases the viewer may not open. */
export function CasePartiesPanel({ caseId }: { caseId: string }) {
  const [parties, setParties] = useState<Party[]>([]); const [links, setLinks] = useState<Link[]>([]);
  const [role, setRole] = useState('OPPONENT'); const [name, setName] = useState(''); const [rel, setRel] = useState('RELATED'); const [other, setOther] = useState('');
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([fetch(`/api/cases/${caseId}/parties`), fetch(`/api/cases/${caseId}/links`)]);
    if (a.ok) setParties((await a.json()).parties); if (b.ok) setLinks((await b.json()).links);
  }, [caseId]);
  useEffect(() => { void load(); }, [load]);
  async function send(path: string, method: string, body: unknown) {
    const r = await fetch(`/api/cases/${caseId}/${path}`, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); setMsg(r.ok ? 'تم الحفظ' : (j.error ?? 'تعذر الحفظ')); if (r.ok) await load();
  }
  return (
    <section aria-label="الأطراف والقضايا المرتبطة" className="mt-6 rounded-2xl border border-navy-100 bg-white p-4">
      <h2 className="mb-2 text-base font-extrabold text-navy-950">الأطراف والقضايا المرتبطة</h2>
      <ul className="mb-2 divide-y divide-navy-100 text-xs">{parties.length === 0 ? <li className="py-1 text-navy-400">لا يوجد أطراف مسجلة.</li> : parties.map((p) => <li key={p.id} className="flex items-center gap-2 py-1.5"><b className="w-12">{ROLE[p.role]}</b><span className="grow">{p.name}</span><button type="button" className="underline" onClick={() => send('parties', 'PATCH', { partyId: p.id, active: false })}>إخفاء</button></li>)}</ul>
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <select aria-label="صفة الطرف" value={role} onChange={(e) => setRole(e.target.value)} className="rounded border p-1">{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input aria-label="اسم الطرف" value={name} onChange={(e) => setName(e.target.value)} className="rounded border p-1" placeholder="اسم الطرف" />
        <button type="button" disabled={name.trim().length < 2} onClick={() => { void send('parties', 'POST', { role, name }); setName(''); }} className="rounded bg-navy-950 px-3 py-1 font-bold text-white disabled:opacity-40">إضافة طرف</button>
      </div>
      <h3 className="mb-1 text-sm font-extrabold">القضايا المرتبطة</h3>
      <ul className="mb-2 text-xs">{links.length === 0 ? <li className="text-navy-400">لا توجد قضايا مرتبطة.</li> : links.map((l) => <li key={l.id} className="flex gap-2 py-1"><a className="underline" href={`/cases/${l.caseId}`}>{l.name} ({l.number})</a><span className="text-navy-400">{REL[l.relation]}{l.direction === 'IN' ? ' (من الطرف الآخر)' : ''}</span><button type="button" className="underline" onClick={() => send('links', 'PATCH', { linkId: l.id, active: false })}>إنهاء الربط</button></li>)}</ul>
      <div className="flex flex-wrap gap-2 text-xs">
        <input aria-label="رقم تعريف القضية المرتبطة" value={other} onChange={(e) => setOther(e.target.value)} className="rounded border p-1" placeholder="معرّف القضية" dir="ltr" />
        <select aria-label="نوع الربط" value={rel} onChange={(e) => setRel(e.target.value)} className="rounded border p-1">{Object.entries(REL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button type="button" disabled={!other.trim()} onClick={() => { void send('links', 'POST', { relatedCaseId: other.trim(), relation: rel }); setOther(''); }} className="rounded bg-navy-950 px-3 py-1 font-bold text-white disabled:opacity-40">ربط قضية</button>
      </div>
      {msg && <p role="status" className="mt-2 text-xs text-navy-500">{msg}</p>}
    </section>
  );
}
