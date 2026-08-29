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
          background: '#F4F6F9',
          color: '#0A101D',
          fontFamily: 'IBM Plex Sans Arabic, Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <main style={{ width: 'min(100%, 560px)', borderTop: '2px solid #A07E2C', padding: '40px 24px' }}>
          <p style={{ margin: 0, color: '#A07E2C', fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 13, letterSpacing: 3 }}>
            DR. HOSSAM LOTFY LAW FIRM
          </p>
          <h1 style={{ margin: '18px 0 0', fontSize: 23, fontWeight: 600 }}>الخدمة غير متاحة مؤقتاً</h1>
          <p style={{ margin: '14px auto 0', maxWidth: 430, color: '#5B6B84', fontSize: 14, lineHeight: 1.9 }}>
            نعمل على استعادة الخدمة. جرّب إعادة تحميل الصفحة بعد لحظات، أو افتح تشخيص الخدمة لمعرفة الحالة الحالية.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 28 }}>
            <button
              type="button"
              onClick={reset}
              style={{ border: '1px solid #0A101D', background: '#0A101D', color: '#fff', cursor: 'pointer', padding: '11px 18px', fontFamily: 'inherit' }}
            >
              إعادة المحاولة
            </button>
            <a
              href="/api/health"
              style={{ border: '1px solid #A07E2C', color: '#7A1F2B', padding: '11px 18px', textDecoration: 'none' }}
            >
              تشخيص الخدمة
            </a>
            <a href="/" style={{ color: '#5B6B84', padding: '11px 8px' }}>
              الرئيسية
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
