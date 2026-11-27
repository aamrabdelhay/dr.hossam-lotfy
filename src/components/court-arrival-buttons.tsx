'use client';
import { useState } from 'react';

/** Arrive / depart taps for one court session (same API the session page uses). */
export function CourtArrivalButtons({ taskId }: { taskId: string }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function tap(kind: 'ARRIVE' | 'DEPART') {
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`/api/hearings/${taskId}/attendance`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind }) });
      if (r.ok) setMsg(kind === 'ARRIVE' ? 'تم تسجيل وصولك للمحكمة ✓' : 'تم تسجيل انصرافك من المحكمة ✓');
      else setMsg(r.status === 409 ? (kind === 'ARRIVE' ? 'سجلت وصولك بالفعل. سجل الانصراف أولًا.' : 'لا يوجد وصول مسجل لتسجيل الانصراف.') : 'تعذر التسجيل.');
    } finally { setBusy(false); }
  }
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={() => tap('ARRIVE')} className="min-h-12 rounded-xl bg-emerald-600 px-3 text-xs font-extrabold text-white disabled:opacity-60">وصلت المحكمة</button>
        <button type="button" disabled={busy} onClick={() => tap('DEPART')} className="min-h-12 rounded-xl bg-navy-800 px-3 text-xs font-extrabold text-white disabled:opacity-60">انصرفت من المحكمة</button>
      </div>
      {msg && <p role="status" className="mt-2 text-center text-[12px] font-bold text-navy-600">{msg}</p>}
    </div>
  );
}
