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
    >
      <span
        aria-hidden="true"
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-brass/40 bg-brass-soft text-[25px] font-semibold text-brass shadow-soft"
        style={{ fontFamily: 'var(--font-serif-en)' }}
      >
        !
      </span>
      <p className="font-latin text-[10px] tracking-[3px] text-brass">
        DR. HOSSAM LOTFY LAW FIRM
      </p>
      <h1 className="mt-3 text-xl font-semibold text-ink-strong">تعذّر فتح هذه الصفحة حالياً</h1>
      <p className="mt-3 max-w-md text-[14px] leading-7 text-muted">
        حدث خلل مؤقت أثناء تحميل البيانات. يمكنك المحاولة مرة أخرى، أو مراجعة حالة الخدمة إذا استمرت المشكلة.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="btn-bubble rounded-lg bg-accent px-5 py-2.5 text-[12px] font-semibold text-on-accent shadow-soft transition-colors hover:bg-accent-hover"
        >
          إعادة المحاولة
        </button>
        <Link
          href="/api/health"
          className="rounded-lg border border-line-strong px-5 py-2.5 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-alt"
        >
          تشخيص الخدمة
        </Link>
        <Link href="/" className="px-2 py-2.5 text-[12px] text-muted underline underline-offset-4 transition-colors hover:text-accent">
          العودة للرئيسية
        </Link>
      </div>
    </section>
  );
}
