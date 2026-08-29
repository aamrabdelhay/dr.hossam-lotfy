'use client';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Last-resort fallback when even the root layout cannot render. This file owns
 * its html/body tags because Next replaces the root layout for global errors.
 */
export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: '#f5f4ef',
          color: '#1d2621',
          fontFamily: 'Alexandria, Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <main style={{ width: 'min(100%, 560px)', borderTop: '2px solid #1e5f46', padding: '40px 24px' }}>
          <p style={{ margin: 0, color: '#1e5f46', fontFamily: 'Fraunces, Georgia, serif', fontSize: 13, letterSpacing: 3 }}>
            DR. HOSSAM LOTFY LAW FIRM
          </p>
          <h1 style={{ margin: '18px 0 0', fontSize: 23, fontWeight: 600 }}>الخدمة غير متاحة مؤقتاً</h1>
          <p style={{ margin: '14px auto 0', maxWidth: 430, color: '#5d6a61', fontSize: 14, lineHeight: 1.9 }}>
            نعمل على استعادة الخدمة. جرّب إعادة تحميل الصفحة بعد لحظات، أو افتح تشخيص الخدمة لمعرفة الحالة الحالية.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 28 }}>
            <button
              type="button"
              onClick={reset}
              style={{ border: '1px solid #1e5f46', background: '#1e5f46', color: '#fff', borderRadius: 10, cursor: 'pointer', padding: '11px 18px', fontFamily: 'inherit' }}
            >
              إعادة المحاولة
            </button>
            <a
              href="/api/health"
              style={{ border: '1px solid #d2cec0', color: '#1e5f46', padding: '11px 18px', textDecoration: 'none', borderRadius: 10 }}
            >
              تشخيص الخدمة
            </a>
            <a href="/" style={{ color: '#5d6a61', padding: '11px 8px' }}>
              الرئيسية
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
