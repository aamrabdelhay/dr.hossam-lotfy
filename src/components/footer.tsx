import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[#18263A] bg-[#101C2C] text-white" style={{ backgroundColor: '#101C2C' }}>
      <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-12 md:grid-cols-3">
        {/* Col 1: Firm name + description (2 lines max) */}
        <div>
          <p
            className="text-[14px] tracking-[2px] text-white"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 400, letterSpacing: '2px' }}
          >
            DR. HOSSAM LOTFY
          </p>
          <p
            className="mt-1 text-[10px] tracking-[3px] uppercase text-white/50"
            style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '3px' }}
          >
            LAW FIRM
          </p>
          <p
            className="mt-4 max-w-[280px] text-[12px] leading-[1.7] text-white/60"
            style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
          >
            مكتب محاماة متخصص في القضايا التجارية والدستورية والإدارية والعقارية.
          </p>
        </div>

        {/* Col 2: Quick links */}
        <div>
          <p
            className="text-[9px] tracking-[3px] uppercase text-white/40"
            style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '3px' }}
          >
            QUICK LINKS
          </p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link href="/" className="text-[12px] tracking-[0.5px] text-white/60 hover:text-white transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                الرئيسية
              </Link>
            </li>
            <li>
              <Link href="/locations" className="text-[12px] tracking-[0.5px] text-white/60 hover:text-white transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                المحاكم والأماكن
              </Link>
            </li>
            <li>
              <Link href="/lawyers" className="text-[12px] tracking-[0.5px] text-white/60 hover:text-white transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                المحامون
              </Link>
            </li>
            <li>
              <Link href="/calendar" className="text-[12px] tracking-[0.5px] text-white/60 hover:text-white transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                التقويم
              </Link>
            </li>
            <li>
              <Link href="/search" className="text-[12px] tracking-[0.5px] text-white/60 hover:text-white transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                البحث
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Contact (one phone, one email) */}
        <div>
          <p
            className="text-[9px] tracking-[3px] uppercase text-white/40"
            style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '3px' }}
          >
            CONTACT
          </p>
          <div className="mt-4 space-y-3">
            <a
              href="mailto:hloutfi@loutfilawfirm.net"
              className="block text-[12px] tracking-[0.5px] text-white/60 hover:text-white transition-colors"
              style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
              dir="ltr"
            >
              hloutfi@loutfilawfirm.net
            </a>
            <a
              href="tel:+20237606575"
              className="block text-[12px] tracking-[0.5px] text-white/60 hover:text-white transition-colors"
              style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
              dir="ltr"
            >
              +20 2 3760 6575
            </a>
            <Link
              href="/api/auth/login" prefetch={false}
              className="mt-6 inline-block text-[10px] tracking-[1.5px] uppercase text-white/30 hover:text-white/60 transition-colors"
              style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
            >
              Admin Login
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.06] py-5">
        <p
          className="text-center text-[10px] tracking-[1.5px] uppercase text-white/30"
          style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '1.5px' }}
        >
          © 2026 DR. HOSSAM LOTFY LAW FIRM
        </p>
      </div>
    </footer>
  );
}
