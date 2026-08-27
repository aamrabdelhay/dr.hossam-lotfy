'use client';

import Link from 'next/link';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Route-level fallback for recoverable server and client rendering errors. */
export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <section
      dir="rtl"
      className="mx-auto flex min-h-[58vh] w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center"
      style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
    >
      <span
        aria-hidden="true"
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#A07E2C]/40 bg-[#A07E2C]/[0.07] text-[25px] text-[#A07E2C] shadow-soft"
        style={{ fontFamily: 'Cormorant Garamond, serif' }}
      >
        !
      </span>
      <p className="text-[10px] tracking-[3px] text-[#A07E2C]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
        DR. HOSSAM LOTFY LAW FIRM
      </p>
      <h1 className="mt-3 text-xl font-semibold text-[#0A101D]">تعذّر فتح هذه الصفحة حالياً</h1>
      <p className="mt-3 max-w-md text-[14px] leading-7 text-[#5B6B84]">
        حدث خلل مؤقت أثناء تحميل البيانات. يمكنك المحاولة مرة أخرى، أو مراجعة حالة الخدمة إذا استمرت المشكلة.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-gradient-to-b from-[#111B31] to-[#0A101D] px-5 py-2.5 text-[12px] text-white shadow-soft transition-all hover:shadow-card"
        >
          إعادة المحاولة
        </button>
        <Link
          href="/api/health"
          className="rounded-xl border border-[#A07E2C]/50 px-5 py-2.5 text-[12px] text-[#7A1F2B] transition-colors hover:bg-[#F4F6F9]"
        >
          تشخيص الخدمة
        </Link>
        <Link href="/" className="px-2 py-2.5 text-[12px] text-[#5B6B84] underline underline-offset-4 hover:text-[#0A101D]">
          العودة للرئيسية
        </Link>
      </div>
    </section>
  );
}
