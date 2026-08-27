import Link from 'next/link';

export function Footer() {
  return (
    <footer className="relative mt-16 border-t border-white/[0.08] bg-[#0A101D] text-white">
      {/* Gold gradient hairline accent */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold-500/70 to-transparent"
      />
      {/* Premium wine + gold ambient glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(720px_240px_at_50%_-80px,rgba(212,175,81,0.10),transparent_70%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-10 h-56 bg-[radial-gradient(560px_220px_at_88%_30%,rgba(36,18,22,0.55),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-[1440px] gap-10 px-6 py-14 md:grid-cols-3">
        {/* Col 1: Firm name + description (2 lines max) */}
        <div>
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/50 bg-gradient-to-br from-gold-500/25 via-gold-600/10 to-transparent text-[15px] text-gold-300"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}
            >
              HL
            </span>
            <span className="block min-w-0">
              <p
                className="text-[14px] tracking-[2px] text-white"
                style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 500, letterSpacing: '2px' }}
              >
                DR. HOSSAM LOTFY
              </p>
              <p
                className="mt-0.5 text-[9px] tracking-[3px] uppercase text-gold-400/80"
                style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '3px' }}
              >
                LAW FIRM
              </p>
            </span>
          </div>
          <p
            className="mt-5 max-w-[280px] text-[12px] leading-[1.8] text-white/55"
            style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
          >
            مكتب محاماة متخصص في القضايا التجارية والدستورية والإدارية والعقارية.
          </p>
        </div>

        {/* Col 2: Quick links */}
        <div>
          <p
            className="text-[10px] font-bold tracking-[2px] uppercase text-gold-400/70"
            style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '2px' }}
          >
            QUICK LINKS
          </p>
          <ul className="mt-5 space-y-3">
            <li>
              <Link href="/" className="group inline-flex items-center gap-2 text-[12.5px] text-white/60 transition-colors hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <span className="h-px w-3 bg-gold-500/50 transition-all duration-300 group-hover:w-5 group-hover:bg-gold-400" />
                الرئيسية
              </Link>
            </li>
            <li>
              <Link href="/locations" className="group inline-flex items-center gap-2 text-[12.5px] text-white/60 transition-colors hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <span className="h-px w-3 bg-gold-500/50 transition-all duration-300 group-hover:w-5 group-hover:bg-gold-400" />
                المحاكم والأماكن
              </Link>
            </li>
            <li>
              <Link href="/lawyers" className="group inline-flex items-center gap-2 text-[12.5px] text-white/60 transition-colors hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <span className="h-px w-3 bg-gold-500/50 transition-all duration-300 group-hover:w-5 group-hover:bg-gold-400" />
                المحامون
              </Link>
            </li>
            <li>
              <Link href="/calendar" className="group inline-flex items-center gap-2 text-[12.5px] text-white/60 transition-colors hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <span className="h-px w-3 bg-gold-500/50 transition-all duration-300 group-hover:w-5 group-hover:bg-gold-400" />
                التقويم
              </Link>
            </li>
            <li>
              <Link href="/search" className="group inline-flex items-center gap-2 text-[12.5px] text-white/60 transition-colors hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <span className="h-px w-3 bg-gold-500/50 transition-all duration-300 group-hover:w-5 group-hover:bg-gold-400" />
                البحث
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Contact (one phone, one email) */}
        <div>
          <p
            className="text-[10px] font-bold tracking-[2px] uppercase text-gold-400/70"
            style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '2px' }}
          >
            CONTACT
          </p>
          <div className="mt-5 space-y-3">
            <a
              href="mailto:hloutfi@loutfilawfirm.net"
              className="btn-bubble inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-white/70 transition-all hover:border-gold-500/40 hover:bg-gold-500/10 hover:text-white"
              style={{ fontFamily: 'Inter, sans-serif' }}
              dir="ltr"
            >
              hloutfi@loutfilawfirm.net
            </a>
            <div>
              <a
                href="tel:+20237606575"
                className="btn-bubble inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-white/70 transition-all hover:border-gold-500/40 hover:bg-gold-500/10 hover:text-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
                dir="ltr"
              >
                +20 2 3760 6575
              </a>
            </div>
            <Link
              href="/auth" prefetch={false}
              className="mt-4 inline-block text-[10px] tracking-[1.5px] uppercase text-white/30 transition-colors hover:text-gold-400/80"
              style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
            >
              الدخول
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/[0.06] py-5">
        <p
          className="text-center text-[10px] tracking-[1.5px] uppercase text-white/35"
          style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '1.5px' }}
        >
          © 2026 DR. HOSSAM LOTFY LAW FIRM
        </p>
      </div>
    </footer>
  );
}
