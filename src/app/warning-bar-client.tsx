'use client';

import Link from 'next/link';
import { TriangleAlert, X } from 'lucide-react';

export function WarningBarClient({ count }: { count: number }) {
  const dismiss = () => {
    const el = document.getElementById('two-week-warning');
    if (el) el.remove();
  };
  return (
    <div id="two-week-warning" className="w-full border-b border-red-500/20 bg-gradient-to-l from-[#2a0d12] via-[#251018] to-[#231a08] text-center">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-3 py-1.5 max-sm:flex-nowrap max-sm:gap-x-2 sm:flex-nowrap sm:px-4 sm:py-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-500/15 ring-1 ring-gold-500/40">
          <TriangleAlert size={13} className="text-gold-400" />
        </span>
        <p className="min-w-0 flex-1 basis-0 text-[12px] font-bold leading-5 text-ivory-100 sm:basis-auto sm:flex-none sm:text-[13px]">
          تنبيه: توجد <span className="text-gold-300">{count}</span>{' '}
          {count === 1 ? 'جلسة مستحقة' : 'جلسات مستحقة'} خلال الأسبوعين القادمين.
        </p>
        <Link
          href="/calendar"
          className="inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-gradient-to-b from-gold-400 to-gold-500 px-4 py-1 text-[12px] font-extrabold text-navy-950 transition-all hover:from-gold-300 hover:to-gold-400"
        >
          عرض الجلسات
        </Link>
        <button onClick={dismiss} className="hidden rounded-full p-1.5 text-ivory-300 transition-colors hover:bg-white/10 sm:block" aria-label="إخفاء التنبيه">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
