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
          background: '#F7F5F0',
          color: '#101C2C',
          fontFamily: 'IBM Plex Sans Arabic, Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <main style={{ width: 'min(100%, 560px)', borderTop: '2px solid #8A6A3A', padding: '40px 24px' }}>
          <p style={{ margin: 0, color: '#8A6A3A', fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 13, letterSpacing: 3 }}>
            DR. HOSSAM LOTFY LAW FIRM
          </p>
          <h1 style={{ margin: '18px 0 0', fontSize: 23, fontWeight: 600 }}>الخدمة غير متاحة مؤقتاً</h1>
          <p style={{ margin: '14px auto 0', maxWidth: 430, color: '#6B6B6B', fontSize: 14, lineHeight: 1.9 }}>
            نعمل على استعادة الخدمة. جرّب إعادة تحميل الصفحة بعد لحظات، أو افتح تشخيص الخدمة لمعرفة الحالة الحالية.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 28 }}>
            <button
              type="button"
              onClick={reset}
              style={{ border: '1px solid #101C2C', background: '#101C2C', color: '#fff', cursor: 'pointer', padding: '11px 18px', fontFamily: 'inherit' }}
            >
              إعادة المحاولة
            </button>
            <a
              href="/api/health"
              style={{ border: '1px solid #8A6A3A', color: '#641F2B', padding: '11px 18px', textDecoration: 'none' }}
            >
              تشخيص الخدمة
            </a>
            <a href="/" style={{ color: '#6B6B6B', padding: '11px 8px' }}>
              الرئيسية
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
