'use client';
import { useEffect, useState } from 'react';
const L: Record<string, string> = { cases: 'قضايا', tasksPending: 'مهام مفتوحة', deadlinesOverdue: 'مواعيد متأخرة', deadlinesNext7Days: 'مواعيد خلال 7 أيام', filesInReview: 'ملفات في المراجعة', installmentsOverdue: 'أقساط متأخرة', openInvoices: 'فواتير مفتوحة' };
/** Item 211 senior dashboard card: counts only. */
export function DashboardCard() {
  const [d, setD] = useState<{ counts: Record<string, number | null>; scope: string } | null>(null);
  useEffect(() => { void fetch('/api/admin/dashboard').then(async (r) => setD(r.ok ? await r.json() : null)); }, []);
  if (!d) return null;
  return (
    <section aria-label="لوحة الإدارة العليا" className="mt-4 rounded-2xl border border-navy-100 bg-white p-4 text-xs">
      <h2 className="mb-1 text-sm font-extrabold text-navy-950">لوحة الإدارة العليا</h2>
      <p className="mb-2 text-navy-400">{d.scope}</p>
      <div className="flex flex-wrap gap-2">{Object.entries(d.counts).filter(([, v]) => v !== null).map(([k, v]) => <div key={k} className="min-w-[8rem] rounded-lg border border-navy-100 px-3 py-2"><div className="text-lg font-extrabold">{v}</div><div>{L[k] ?? k}</div></div>)}</div>
    </section>
  );
}
