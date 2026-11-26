'use client';
import { useState } from 'react';

type Row = { line: number; raw: string; date: string | null; time: string | null; caseNumber: string | null; rest: string; problems: string[]; case: { id: string; name: string } | null; caseNote: string | null; duplicate: boolean };
const box = 'rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm';

/** Item 110, text path: paste the court roll, review the rows, then create each session through the normal session form route. Reading a photo needs an OCR provider that is not configured. */
export function RollDraftPanel() {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState('');
  const [made, setMade] = useState<Record<number, string>>({});
  async function preview() {
    setMsg(''); setMade({}); const r = await fetch('/api/hearings/roll-draft', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
    const d = await r.json().catch(() => ({})); if (r.ok) setRows(d.rows); else { setRows(null); setMsg(d.error || 'تعذر قراءة النص'); }
  }
  async function create(r: Row) {
    const res = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ description: r.rest || 'جلسة', scheduledDate: r.date, ...(r.time ? { scheduledTime: r.time } : {}), ...(r.caseNumber ? { caseNumber: r.caseNumber } : {}), ...(r.case ? { caseName: r.case.name } : {}) }) });
    setMade((m) => ({ ...m, [r.line]: res.ok ? 'تم الإنشاء' : 'تعذر الإنشاء' }));
  }
  return (
    <details className="mb-6 rounded-2xl border border-navy-100 bg-white p-4">
      <summary className="cursor-pointer text-sm font-extrabold text-navy-950">إدخال رول الجلسة من نص (مسودة للمراجعة)</summary>
      <p className="mt-2 text-[11px] text-navy-500">اكتب أو الصق سطراً لكل جلسة: التاريخ، الساعة، رقم القضية (مثل 4455/2026)، ثم الوصف. لا يُحفظ شيء قبل ضغطك على إنشاء. قراءة صورة الرول تحتاج مزود OCR وهو غير مُعد حالياً.</p>
      <textarea aria-label="نص رول الجلسة" value={text} onChange={(e) => setText(e.target.value)} rows={5} className={box + ' mt-2 w-full'} placeholder="2031-05-01 09:30 4455/2026 دائرة 5 مدني" />
      <button type="button" disabled={!text.trim()} onClick={preview} className="mt-2 rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40">معاينة</button>
      {msg && <p role="status" className="mt-2 text-xs font-bold text-red-700">{msg}</p>}
      {rows && <ul className="mt-3 divide-y divide-navy-100 text-xs">{rows.map((r) => (
        <li key={r.line} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span><b>{r.date ?? '؟'}</b> {r.time ?? ''} · {r.caseNumber ?? 'بلا رقم'}{r.case ? ' · ' + r.case.name : ''} · {r.rest}
            {r.problems.length > 0 && <span className="block text-red-700">{r.problems.join('، ')}</span>}
            {r.caseNote && <span className="block text-amber-700">{r.caseNote}</span>}
            {r.duplicate && <span className="block text-amber-700">توجد جلسة لنفس القضية في نفس التاريخ</span>}</span>
          {made[r.line] ? <span className="font-bold">{made[r.line]}</span> : <button type="button" disabled={!r.date} onClick={() => create(r)} className="rounded border px-2 py-1 font-extrabold disabled:opacity-40">إنشاء الجلسة</button>}
        </li>))}</ul>}
    </details>
  );
}
