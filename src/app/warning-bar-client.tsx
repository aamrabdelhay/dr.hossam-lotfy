'use client';

import { TriangleAlert, X } from 'lucide-react';

export function WarningBarClient({ count }: { count: number }) {
  const dismiss = () => {
    const el = document.getElementById('two-week-warning');
    if (el) el.remove();
  };
  return (
    <div id="two-week-warning" className="w-full border-b border-red-600/20 bg-gradient-to-l from-red-950 via-[#2a0d0d] to-[#2a1505] text-center">
      <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-3 px-4 py-2.5">
        <TriangleAlert size={16} className="shrink-0 text-gold-400" />
        <p className="text-[12.5px] font-bold leading-5 text-ivory-100 sm:text-[13px]">
          تنبيه: توجد <span className="text-gold-300">{count}</span>{' '}
          {count === 1 ? 'جلسة مستحقة' : 'جلسات مستحقة'} خلال الأسبوعين القادمين.
        </p>
        <a
          href="/calendar"
          className="shrink-0 rounded-md bg-gold-500 px-3 py-1 text-[11px] font-extrabold text-navy-950 hover:bg-gold-400"
        >
          عرض الجلسات
        </a>
        <button onClick={dismiss} className="hidden rounded-md p-1 text-ivory-300 hover:bg-white/10 sm:block" aria-label="إخفاء التنبيه">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
