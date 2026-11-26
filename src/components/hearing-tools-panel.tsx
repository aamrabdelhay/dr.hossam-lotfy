'use client';
import { useCallback, useEffect, useState } from 'react';
import { OUTCOMES } from '@/lib/session-outcomes';

const box = 'rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm';
type Pack = { case: { name: string; number: string } | null; openRegisterItems: Array<{ kind: string; title: string; due_date: string | null }>; previousOutcomes: Array<{ outcome_code: string | null; result: string | null; feedback: string | null }>; note: string };

/** Item 99/101/105/107/108/109 UI: hearing pack, preset outcome, substitute request, conflict warning, ICS link. */
export function HearingToolsPanel({ taskId, date, lawyers, isLawyer }: { taskId: string; date: string | null; isLawyer: boolean; lawyers: Array<{ id: string; name: string }> }) {
  const [unrecorded, setUnrecorded] = useState<Array<{ id: string; description: string }>>([]);
  const [pack, setPack] = useState<Pack | null>(null);
  const [conflict, setConflict] = useState<number | null>(null);
  const [toLawyer, setToLawyer] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    const r = await fetch('/api/hearings/outcomes');
    if (r.ok) { const j = await r.json(); setUnrecorded(j.unrecorded); }
    if (date && isLawyer) { const c = await fetch('/api/hearings/conflicts?date=' + date); if (c.ok) setConflict((await c.json()).conflicts.length); }
  }, [date, isLawyer]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { window.addEventListener('session-outcome-saved', load); return () => window.removeEventListener('session-outcome-saved', load); }, [load]);
  const post = async (url: string, body: unknown, okMsg: string) => {
    setMsg('');
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    setMsg(r.ok ? okMsg : r.status === 403 ? 'لا تملك صلاحية على هذه الجلسة' : 'تعذر التنفيذ، راجع البيانات (قد يكون الترتيب غير صحيح)');
    if (r.ok) load();
  };
  async function openPack() { const r = await fetch(`/api/hearings/${taskId}/pack`); if (r.ok) setPack(await r.json()); else setMsg(r.status === 403 ? 'لا تملك صلاحية على ملف الجلسة' : 'تعذر فتح الملف'); }
  const isUnrecorded = unrecorded.some((u) => u.id === taskId);
  return (
    <section className="rounded-2xl border border-navy-100 bg-white p-5" aria-label="أدوات الجلسة">
      <h2 className="text-[15px] font-extrabold text-navy-950">أدوات الجلسة</h2>
      {conflict ? <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">تنبيه: عندك جلسات أخرى في نفس اليوم بفارق أقل من 90 دقيقة (أو بدون ساعة محددة). راجع الجدول.</p> : null}
      {isUnrecorded ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">هذه الجلسة مرّت ولم تُسجل نتيجتها.</p> : null}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-extrabold">
        <button type="button" onClick={openPack} className="rounded-lg border border-navy-200 px-3 py-2">تجهيز ملف الجلسة</button>
        <a href="/api/hearings/ics" className="rounded-lg border border-navy-200 px-3 py-2">تصدير جلساتي (ICS)</a>
        <a href="/api/hearings/pdf" className="rounded-lg border border-navy-200 px-3 py-2">PDF</a>
        <a href="/api/hearings/xlsx" className="rounded-lg border border-navy-200 px-3 py-2">Excel</a>
        <a href="/api/hearings/csv" className="rounded-lg border border-navy-200 px-3 py-2">CSV</a>
        {isLawyer && <button type="button" onClick={() => post(`/api/hearings/${taskId}/attendance`, { kind: 'ARRIVE' }, 'تم تسجيل الوصول')} className="rounded-lg border border-navy-200 px-3 py-2">وصلت المحكمة</button>}
        {isLawyer && <button type="button" onClick={() => post(`/api/hearings/${taskId}/attendance`, { kind: 'DEPART' }, 'تم تسجيل الانصراف')} className="rounded-lg border border-navy-200 px-3 py-2">غادرت المحكمة</button>}
        {isLawyer && <p className="basis-full text-[10px] text-navy-400">التسجيل بضغطة يدوية فقط. يحفظ النظام وقت الضغط ولا يلتقط موقعك ولا يتتبعك.</p>}
      </div>
      {pack && (
        <div className="mt-3 rounded-lg border border-navy-100 p-3 text-xs">
          <p className="font-extrabold">{pack.case ? `${pack.case.name} — ${pack.case.number}` : 'بدون قضية مرتبطة'}</p>
          <p className="mt-1 text-navy-500">{pack.note}</p>
          <ul className="mt-2 list-disc pr-5">{pack.openRegisterItems.map((i, k) => <li key={k}>{i.title}</li>)}</ul>
          {pack.openRegisterItems.length === 0 && <p className="mt-1 text-navy-400">لا توجد بنود مفتوحة في سجل القضية.</p>}
          {pack.previousOutcomes.length > 0 && <p className="mt-2">آخر نتيجة: {(pack.previousOutcomes[0].outcome_code && OUTCOMES[pack.previousOutcomes[0].outcome_code]) || pack.previousOutcomes[0].result || 'مسجلة'}</p>}
        </div>
      )}
      <p className="mt-3 text-xs text-navy-500">تسجيل نتيجة الجلسة من نموذج «نتيجة الجلسة والمتابعة» بالأسفل.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <select className={box} value={toLawyer} onChange={(e) => setToLawyer(e.target.value)} aria-label="المحامي البديل">
          <option value="">محامٍ بديل للجلسة</option>
          {lawyers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <input className={box + ' sm:col-span-2'} placeholder="سبب الطلب" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <button type="button" disabled={!toLawyer || reason.trim().length < 3} onClick={() => post(`/api/hearings/${taskId}/substitute`, { toLawyerId: toLawyer, reason }, 'تم إرسال طلب النيابة').then(() => { setToLawyer(''); setReason(''); })} className="mt-2 rounded-lg border border-navy-300 px-3 py-2 text-xs font-extrabold disabled:opacity-40">طلب محامٍ بديل</button>
      {msg && <p role="status" className="mt-2 text-xs font-bold text-navy-700">{msg}</p>}
    </section>
  );
}
