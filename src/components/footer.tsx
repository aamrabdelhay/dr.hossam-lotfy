import Link from 'next/link';

export function Footer() {
  return (
    <footer className="relative mt-16 border-t border-white/[0.06] bg-navy-950">
      {/* Lime hairline accent */}
      <span aria-hidden className="gold-hairline absolute inset-x-0 top-0 opacity-50" />
      <div className="relative mx-auto grid max-w-[1440px] gap-10 px-6 py-12 md:grid-cols-3">
        {/* Col 1: Firm name */}
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold-500/40 bg-gold-500/10 font-mono text-[13px] font-bold text-gold-500">
              HL
            </span>
            <span className="block min-w-0 leading-none">
              <p className="font-mono text-[11.5px] font-semibold tracking-[0.18em] text-ivory-50">DR. HOSSAM LOTFY</p>
              <p className="mt-1 font-mono text-[8.5px] font-semibold tracking-[0.32em] text-gold-500">LAW FIRM</p>
            </span>
          </div>
          <p className="mt-5 max-w-[280px] text-[12px] leading-[1.9] text-navy-300">
            مكتب محاماة متخصص في القضايا التجارية والدستورية والإدارية والعقارية.
          </p>
        </div>

        {/* Col 2: Quick links */}
        <div>
          <p className="font-mono text-[9.5px] font-semibold tracking-[0.26em] text-navy-400">QUICK LINKS</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {[
              { href: '/', label: 'نظرة عامة' },
              { href: '/sessions', label: 'الجلسات' },
              { href: '/lawyers', label: 'المحامون' },
              { href: '/locations', label: 'المحاكم والأماكن' },
              { href: '/calendar', label: 'التقويم' },
              { href: '/search', label: 'البحث' },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="group inline-flex items-center gap-2 text-[12.5px] font-semibold text-navy-300 transition-colors hover:text-ivory-50">
                  <span className="h-px w-3 bg-gold-500/50 transition-all duration-300 group-hover:w-5 group-hover:bg-gold-500" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Contact */}
        <div>
          <p className="font-mono text-[9.5px] font-semibold tracking-[0.26em] text-navy-400">CONTACT</p>
          <div className="mt-4 space-y-3">
            <a
              href="mailto:hloutfi@loutfilawfirm.net"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-[11.5px] text-navy-300 transition-all hover:border-gold-500/40 hover:text-gold-500"
              dir="ltr"
            >
              hloutfi@loutfilawfirm.net
            </a>
            <div>
              <a
                href="tel:+20237606575"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-[11.5px] text-navy-300 transition-all hover:border-gold-500/40 hover:text-gold-500"
                dir="ltr"
              >
                +20 2 3760 6575
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/[0.06] py-5">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6">
          <p className="font-mono text-[9.5px] tracking-[0.2em] text-navy-400">© 2026 DR. HOSSAM LOTFY LAW FIRM</p>
          <p className="font-mono text-[9.5px] tracking-[0.2em] text-navy-400">LEGAL COMMAND CENTER — VERSION 2.0</p>
          <p className="flex items-center gap-2 font-mono text-[9.5px] tracking-[0.2em] text-navy-400">
            SYSTEM
            <span className="flex items-center gap-1.5 text-gold-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-500 opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-500" />
              </span>
              ONLINE
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
