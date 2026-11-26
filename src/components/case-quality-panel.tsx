'use client';
import { useEffect, useState } from 'react';
type Q = { score: number; outOf: number; missing: { key: string; label: string }[]; notice: string };
/** Item 215 UI: file completeness checklist. Not a legal-quality judgment. */
export function CaseQualityPanel({ caseId }: { caseId: string }) {
  const [q, setQ] = useState<Q | null>(null); const [sum, setSum] = useState('');
  useEffect(() => { void fetch(`/api/cases/${caseId}/quality`).then(async (r) => setQ(r.ok ? await r.json() : null)); }, [caseId]);
  if (!q) return null;
  return (
    <section aria-label="اكتمال ملف القضية" className="mt-3 rounded-2xl border border-navy-100 bg-white p-4 text-xs">
      <h2 className="mb-1 text-sm font-extrabold text-navy-950">اكتمال ملف القضية: {q.score} من {q.outOf}</h2>
      <p className="mb-2 text-navy-400">{q.notice}</p>
      {q.missing.length === 0 ? <p className="font-bold">كل البنود مكتملة</p> : <ul className="list-disc pr-5">{q.missing.map((m) => <li key={m.key}>ناقص: {m.label}</li>)}</ul>}
      <div className="mt-3 border-t border-navy-100 pt-2">
        <h3 className="mb-1 font-extrabold">تقرير PDF للعميل (يُنشأ فقط ولا يُرسل)</h3>
        <textarea aria-label="ملخص المحامي للعميل" value={sum} onChange={(e) => setSum(e.target.value)} maxLength={1500} rows={2} placeholder="ملخص قصير يكتبه المحامي" className="w-full rounded-lg border border-navy-200 px-2 py-1.5" />
        <a className="font-bold underline" target="_blank" rel="noreferrer" href={`/api/cases/${caseId}/client-report?summary=${encodeURIComponent(sum)}`}>فتح التقرير PDF للمراجعة</a>
      </div>
    </section>
  );
}
