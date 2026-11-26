'use client';
import { useCallback, useEffect, useState } from 'react';

type E = { id: string; day: string; in_at: string; out_at: string | null };
const fmt = (s: string) => new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' }).format(new Date(s));
/** Item 187: check-in and check-out for the signed-in lawyer. Manual tap, no location. */
export function AttendanceTap() {
  const [rows, setRows] = useState<E[] | null>(null); const [msg, setMsg] = useState('');
  const load = useCallback(async () => { const r = await fetch('/api/attendance'); setRows(r.ok ? (await r.json()).entries : null); }, []);
  useEffect(() => { void load(); }, [load]);
  if (rows === null) return null;
  const open = rows.find((x) => !x.out_at);
  async function tap(action: 'IN' | 'OUT') { setMsg(''); const r = await fetch('/api/attendance', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) }); if (!r.ok) setMsg((await r.json().catch(() => ({}))).error ?? 'تعذر التسجيل'); await load(); }
  async function proof(phase: 'IN' | 'OUT') { setMsg(''); if (!('geolocation' in navigator)) { setMsg('الجهاز لا يدعم الموقع'); return; } if (!window.confirm('هل توافق على إرفاق موقعك الحالي مرة واحدة بهذا التسجيل؟')) return; navigator.geolocation.getCurrentPosition(async (p) => { const r = await fetch('/api/attendance/location', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phase, lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy, consent: true }) }); setMsg(r.ok ? 'تم إرفاق الموقع' : (await r.json().catch(() => ({}))).error ?? 'تعذر إرفاق الموقع'); }, () => setMsg('لم يتم السماح بقراءة الموقع'), { timeout: 15000 }); }
  return (
    <section aria-label="الحضور والانصراف" className="mb-6 rounded-2xl border border-navy-100 bg-white p-4 text-xs">
      <div className="flex flex-wrap items-center gap-3"><h2 className="text-sm font-extrabold text-navy-950">الحضور والانصراف</h2>
        {open ? <button type="button" onClick={() => tap('OUT')} className="rounded-lg bg-navy-950 px-3 py-1.5 font-extrabold text-white">تسجيل الانصراف</button> : <button type="button" onClick={() => tap('IN')} className="rounded-lg bg-navy-950 px-3 py-1.5 font-extrabold text-white">تسجيل الحضور</button>}
        {open && <span>حضور منذ {fmt(open.in_at)}</span>}
        <button type="button" onClick={() => proof(open ? 'IN' : 'OUT')} className="rounded-lg border px-3 py-1.5 font-bold">إرفاق موقعي (بموافقتي)</button></div>
      {msg && <p role="status" className="mt-2 font-bold text-red-700">{msg}</p>}
      <ul className="mt-2 text-navy-500">{rows.slice(0, 5).map((x) => <li key={x.id}>{x.day} · حضور {fmt(x.in_at)}{x.out_at ? ' · انصراف ' + fmt(x.out_at) : ''}</li>)}</ul>
      <p className="mt-1 text-[10px] text-navy-400">التسجيل يدوي. الموقع لا يُقرأ إلا لو ضغطت إرفاق الموقع ووافقت في كل مرة.</p>
    </section>
  );
}
