'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Clock3, UserRound } from 'lucide-react';
import { Card, EmptyState } from './ui';

type SessionRow = {
  id: string;
  description: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  status: string;
  lawyers: string[];
  caseLabel: string | null;
};

function cleanGuideCards() {
  const targets = new Set(['موثق', 'أونلاين', 'حضور شخصي']);
  document.querySelectorAll<HTMLElement>('[data-guide-cleanup]').forEach((el) => el.remove());
  const guideLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/lawyer-guide/"]'));
  for (const link of guideLinks) {
    const card = link.closest('.group');
    if (!card) continue;
    for (const node of Array.from(card.querySelectorAll<HTMLElement>('span'))) {
      if (targets.has(node.textContent?.trim() ?? '')) node.remove();
    }
  }
}

export function LawyerGuideEnhancements() {
  const pathname = usePathname();
  const [sessions, setSessions] = React.useState<SessionRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (pathname === '/lawyer-guide') {
      cleanGuideCards();
      const observer = new MutationObserver(() => cleanGuideCards());
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
    setSessions([]);
  }, [pathname]);

  React.useEffect(() => {
    const match = pathname?.match(/^\/lawyer-guide\/([^/]+)$/);
    if (!match) return;
    const slug = decodeURIComponent(match[1]);
    let alive = true;
    setLoading(true);
    fetch(`/api/lawyer-guide/${encodeURIComponent(slug)}/sessions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setSessions(d?.sessions ?? []); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [pathname]);

  if (!pathname?.match(/^\/lawyer-guide\/[^/]+$/)) return null;

  return (
    <section className="mx-auto mt-5 w-full max-w-[1200px] px-4 pb-6 sm:px-6" aria-labelledby="guide-session-history">
      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="guide-session-history" className="flex items-center gap-2 text-[14px] font-extrabold text-navy-900">
              <CalendarDays size={15} className="text-gold-600" />
              سجل الجلسات في هذا المكان
            </h2>
            <p className="mt-1 text-[10.5px] font-semibold text-navy-300">الجلسات السابقة والقادمة المرتبطة بهذا المكان.</p>
          </div>
          <span className="rounded-full bg-navy-900/[0.06] px-2.5 py-1 text-[10px] font-bold text-navy-400">{sessions.length}</span>
        </div>
        {loading ? (
          <p className="py-5 text-center text-[11px] font-bold text-navy-300">جارٍ تحميل السجل…</p>
        ) : sessions.length === 0 ? (
          <EmptyState title="لا توجد جلسات مسجلة" hint="ستظهر هنا الجلسات التي تُسجل لهذا المكان." />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`} className="block rounded-xl border border-navy-100 bg-ivory-50/50 p-3 transition hover:border-gold-500/50 hover:bg-white">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-gold-700"><Clock3 size={12} />{s.scheduledDate ? new Date(`${s.scheduledDate}T00:00:00`).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'بدون تاريخ'}{s.scheduledTime ? ` — ${s.scheduledTime}` : ''}</span>
                  <span className="rounded-full bg-navy-900/[0.06] px-2 py-0.5 text-[9px] text-navy-400">{s.status}</span>
                </div>
                <p className="mt-1 text-[12px] font-extrabold text-navy-900">{s.description || 'جلسة'}</p>
                {s.caseLabel && <p className="mt-1 text-[10.5px] font-semibold text-navy-400">القضية: {s.caseLabel}</p>}
                {s.lawyers.length > 0 && <p className="mt-1 flex items-center gap-1 text-[10.5px] font-bold text-navy-500"><UserRound size={11} className="text-gold-600" />{s.lawyers.join('، ')}</p>}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
