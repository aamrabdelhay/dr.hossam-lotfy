import Link from 'next/link';

const contactPhones = [
  '37606575',
  '37606584',
  '37606672',
  '23930289',
  '23929992',
  '33386364',
  '33354738',
  '33361135',
  '0122411292',
];

const quickLinks = [
  ['/', 'الرئيسية'],
  ['/locations', 'المحاكم والجهات الحكومية'],
  ['/lawyers', 'المحامون'],
  ['/calendar', 'التقويم'],
  ['/search', 'البحث'],
] as const;

export function Footer() {
  return (
    <footer className="footer-surface relative mt-12 overflow-hidden border-t border-[var(--footer-line)]">
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[var(--footer-accent)]/60 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(680px_220px_at_50%_-90px,rgba(211,180,119,0.10),transparent_70%)]" />

      <div className="relative mx-auto max-w-[1180px] px-5 py-8 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
        <header className="text-center">
          <p
            className="font-latin text-[17px] font-semibold tracking-[3px] text-[var(--footer-fg)] sm:text-[19px]"
            style={{ fontFamily: 'var(--font-serif-en)' }}
          >
            DR. HOSSAM LOTFY
          </p>
          <p
            className="mt-0.5 text-[9px] uppercase tracking-[4px] text-[var(--footer-accent)]/90"
            style={{ fontFamily: 'var(--font-latin)' }}
          >
            LAW FIRM
          </p>
          <span aria-hidden className="mx-auto mt-4 block h-px w-12 bg-[var(--footer-accent)]/50" />
        </header>

        <div className="mt-7 grid gap-7 md:grid-cols-[1fr_1.4fr] md:gap-10">
          <section className="text-center md:text-right" dir="rtl">
            <p className="text-[10px] font-bold tracking-[1.5px] text-[var(--footer-accent)]/90">المقر الرئيسي</p>
            <p className="mt-1.5 text-[12px] leading-6 text-[var(--footer-muted)]" style={{ fontFamily: 'var(--font-latin)' }}>6 El-Sad El-Aaly St. - Dokki - Giza</p>
            <div className="mt-5">
              <p className="text-[10px] font-bold tracking-[1.5px] text-[var(--footer-accent)]/90">مكاتبنا</p>
              <div className="mt-2 grid gap-2 text-[11px] leading-5 text-[var(--footer-faint)] sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                <p><span className="font-semibold text-[var(--footer-muted)]">مكتب القاهرة:</span> <span style={{ fontFamily: 'var(--font-latin)' }}>1 Sherif Basha St. - Bab El-Louk - Cairo</span></p>
                <p><span className="font-semibold text-[var(--footer-muted)]">مكتب العليا:</span> <span style={{ fontFamily: 'var(--font-latin)' }}>Nabil El-Wakkad St. - Dokki - Giza</span></p>
                <p><span className="font-semibold text-[var(--footer-muted)]">مكتب الجيزة:</span> <span style={{ fontFamily: 'var(--font-latin)' }}>13 Nabil El-Wakkad St. - Dokki - Giza</span></p>
              </div>
            </div>
          </section>

          <section className="border-t border-[var(--footer-line)] pt-6 text-center md:border-t-0 md:border-r md:pr-10 md:pt-0" dir="rtl">
            <p className="text-[10px] font-bold tracking-[1.5px] text-[var(--footer-accent)]/90">تواصل معنا</p>
            <a href="mailto:hloutfi@loutfilawfirm.net" dir="ltr" className="mt-1.5 inline-block text-[12px] text-[var(--footer-muted)] transition-colors hover:text-[var(--footer-accent)]" style={{ fontFamily: 'var(--font-latin)' }}>hloutfi@loutfilawfirm.net</a>

            <div className="footer-phone-grid mx-auto mt-4 grid max-w-[570px] grid-cols-2 gap-x-8 gap-y-1.5 text-[11px] leading-5 text-[var(--footer-faint)] sm:grid-cols-3 lg:grid-cols-4" dir="ltr" style={{ fontFamily: 'var(--font-latin)' }}>
              {contactPhones.map((phone) => <span key={phone} className="whitespace-nowrap">{phone}</span>)}
            </div>
          </section>
        </div>

        <nav aria-label="Footer navigation" className="mt-7 border-t border-[var(--footer-line)] pt-5">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" dir="rtl">
            {quickLinks.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-[10px] text-[var(--footer-faint)] transition-colors hover:text-[var(--footer-muted)]">{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="relative border-t border-[var(--footer-line)] px-4 py-4 sm:px-6">
        <p className="text-center text-[9px] uppercase tracking-[1.2px] text-[var(--footer-faint)]" style={{ fontFamily: 'var(--font-latin)' }}>© 2026 DR. HOSSAM LOTFY LAW FIRM</p>
        <p className="mt-1.5 text-center text-[8px] text-[var(--footer-faint)]" style={{ fontFamily: 'var(--font-latin)' }}>Designed &amp; Developed by <span className="font-semibold text-[var(--footer-muted)]">Amr Abdelhay</span></p>
      </div>
    </footer>
  );
}
