'use client';

/**
 * Last-resort error boundary (replaces the whole root layout when even the
 * layout fails). Inline styles only — no Tailwind, no fonts, no layout.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html dir="rtl" lang="ar">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090A0A', color: '#F1F0EB', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <p style={{ fontSize: 12, letterSpacing: '0.3em', color: '#C8FF3D', fontFamily: 'monospace' }}>
            LEGAL COMMAND CENTER
          </p>
          <h1 style={{ margin: '14px 0 0', fontSize: 22 }}>تعذّر تشغيل التطبيق حالياً</h1>
          <p style={{ margin: '14px auto 0', maxWidth: 430, color: '#99A1A1', fontSize: 14, lineHeight: 1.9 }}>
            حدث خطأ غير متوقع. حاول مرة أخرى، أو راجع حالة الخدمة.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{ border: '1px solid #C8FF3D', background: '#C8FF3D', color: '#090A0A', cursor: 'pointer', padding: '11px 18px', fontFamily: 'inherit', fontWeight: 700, borderRadius: 10 }}
            >
              إعادة المحاولة
            </button>
            <a href="/api/health" style={{ border: '1px solid #2F3434', color: '#F1F0EB', padding: '11px 18px', textDecoration: 'none', borderRadius: 10, fontSize: 14 }}>
              تشخيص الخدمة
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
