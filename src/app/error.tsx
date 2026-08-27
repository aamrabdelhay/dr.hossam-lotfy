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
        className="mb-6 flex h-14 w-14 items-center justify-center border border-[#8A6A3A] text-[25px] text-[#8A6A3A]"
        style={{ fontFamily: 'Cormorant Garamond, serif' }}
      >
        !
      </span>
      <p className="text-[10px] tracking-[3px] text-[#8A6A3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
        DR. HOSSAM LOTFY LAW FIRM
      </p>
      <h1 className="mt-3 text-xl font-semibold text-[#101C2C]">تعذّر فتح هذه الصفحة حالياً</h1>
      <p className="mt-3 max-w-md text-[14px] leading-7 text-[#6B6B6B]">
        حدث خلل مؤقت أثناء تحميل البيانات. يمكنك المحاولة مرة أخرى، أو مراجعة حالة الخدمة إذا استمرت المشكلة.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="border border-[#101C2C] bg-[#101C2C] px-5 py-2.5 text-[12px] text-white transition-colors hover:bg-[#18263A]"
        >
          إعادة المحاولة
        </button>
        <Link
          href="/api/health"
          className="border border-[#8A6A3A] px-5 py-2.5 text-[12px] text-[#641F2B] transition-colors hover:bg-[#F7F5F0]"
        >
          تشخيص الخدمة
        </Link>
        <Link href="/" className="px-2 py-2.5 text-[12px] text-[#6B6B6B] underline underline-offset-4 hover:text-[#101C2C]">
          العودة للرئيسية
        </Link>
      </div>
    </section>
  );
}
