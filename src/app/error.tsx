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
      style={{ fontFamily: 'var(--font-arabic)' }}
    >
      <span
        aria-hidden="true"
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-500/40 bg-gold-500/[0.07] font-mono text-[22px] font-bold text-gold-500 shadow-soft"
      >
        !
      </span>
      <p className="font-mono text-[10px] font-semibold tracking-[0.3em] text-gold-500">DR. HOSSAM LOTFY LAW FIRM</p>
      <h1 className="mt-3 text-xl font-semibold text-ivory-50">تعذّر فتح هذه الصفحة حالياً</h1>
      <p className="mt-3 max-w-md text-[14px] leading-7 text-navy-300">
        حدث خلل مؤقت أثناء تحميل البيانات. يمكنك المحاولة مرة أخرى، أو مراجعة حالة الخدمة إذا استمرت المشكلة.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-gradient-to-b from-navy-700 to-navy-800 px-5 py-2.5 text-[12px] font-bold text-ivory-50 shadow-soft ring-1 ring-white/10 transition-all hover:ring-gold-500/40"
        >
          إعادة المحاولة
        </button>
        <Link
          href="/api/health"
          className="rounded-xl border border-gold-500/40 px-5 py-2.5 text-[12px] font-bold text-gold-500 transition-colors hover:bg-gold-500/10"
        >
          تشخيص الخدمة
        </Link>
        <Link href="/" className="px-2 py-2.5 text-[12px] font-semibold text-navy-300 underline underline-offset-4 hover:text-ivory-50">
          العودة للرئيسية
        </Link>
      </div>
    </section>
  );
}
