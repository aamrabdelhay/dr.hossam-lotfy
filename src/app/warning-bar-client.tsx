'use client';

import { TriangleAlert, X } from 'lucide-react';

export function WarningBarClient({ count }: { count: number }) {
  const dismiss = () => {
    const el = document.getElementById('two-week-warning');
    if (el) el.remove();
  };
  return (
    <div id="two-week-warning" className="w-full border-b border-red-600/20 bg-red-600/[0.07] text-center">
      <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-3 px-4 py-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/40">
          <TriangleAlert size={13} className="text-amber-700" />
        </span>
        <p className="text-[12.5px] font-bold leading-5 text-red-700 sm:text-[13px]">
          تنبيه: توجد <span className="text-amber-700">{count}</span>{' '}
          {count === 1 ? 'جلسة مستحقة' : 'جلسات مستحقة'} خلال الأسبوعين القادمين.
        </p>
        <a
          href="/calendar"
          className="shrink-0 rounded-lg bg-brass px-3.5 py-1 text-[11px] font-extrabold text-on-brass shadow-soft transition-colors hover:bg-brass-strong"
        >
          عرض الجلسات
        </a>
        <button onClick={dismiss} className="hidden rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-alt sm:block" aria-label="إخفاء التنبيه">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
