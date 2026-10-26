'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';

export function CaseDevelopmentForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [description, setDescription] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const add = async () => {
    const value = description.trim();
    if (!value || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/cases/' + encodeURIComponent(caseId) + '/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: value, type: 'development' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر تسجيل تطور القضية.');
      setDescription('');
      setNotice('تم تسجيل تطور القضية.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تسجيل تطور القضية.');
    } finally { setBusy(false); }
  };

  return <div className="border-t border-navy-100 bg-ivory-50/60 p-4">
    <label className="mb-2 block text-xs font-extrabold text-navy-800" htmlFor={'case-development-'+caseId}>إضافة آخر تطور للقضية</label>
    <textarea id={'case-development-'+caseId} value={description} onChange={event => setDescription(event.target.value)} maxLength={1000} rows={2} placeholder="اكتب التطور الجديد والإجراء الذي تم..." className="w-full rounded-xl border border-navy-200 bg-white p-3 text-xs leading-6 outline-none focus:border-gold-500"/>
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-2 text-xs text-emerald-700">{notice}</p>}
    <button type="button" onClick={() => void add()} disabled={busy || !description.trim()} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin"/> : <Plus size={13}/>}تسجيل التطور</button>
  </div>;
}
