import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[#3a302d] bg-[#1d1b1a] text-white" style={{ backgroundColor: '#1d1b1a' }}>
      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-14 md:grid-cols-3">
        <div>
          <p className="text-[18px] tracking-[2.5px] text-white" style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 500 }}>DR. HOSSAM LOTFY</p>
          <p className="mt-1 text-[9px] tracking-[4px] uppercase text-[#c7b697]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>LAW FIRM</p>
          <p className="mt-5 max-w-[300px] text-[12px] leading-[1.9] text-white/55" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            مكتب محاماة متخصص في القضايا التجارية والدستورية والإدارية والعقارية.
          </p>
        </div>
        <div>
          <p className="text-[9px] tracking-[3px] uppercase text-[#c7b697]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>QUICK LINKS</p>
          <ul className="mt-5 space-y-3">
            <li><Link href="/" className="text-[12px] text-white/55 hover:text-white transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>الرئيسية</Link></li>
            <li><Link href="/locations" className="text-[12px] text-white/55 hover:text-white transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>المحاكم والأماكن</Link></li>
            <li><Link href="/lawyers" className="text-[12px] text-white/55 hover:text-white transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>المحامون</Link></li>
            <li><Link href="/calendar" className="text-[12px] text-white/55 hover:text-white transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>التقويم</Link></li>
            <li><Link href="/search" className="text-[12px] text-white/55 hover:text-white transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>البحث</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[9px] tracking-[3px] uppercase text-[#c7b697]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>CONTACT</p>
          <div className="mt-5 space-y-3">
            <a href="mailto:hloutfi@loutfilawfirm.net" className="block text-[12px] text-white/55 hover:text-white transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }} dir="ltr">hloutfi@loutfilawfirm.net</a>
            <a href="tel:+20237606575" className="block text-[12px] text-white/55 hover:text-white transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }} dir="ltr">+20 2 3760 6575</a>
            <Link href="/api/auth/login" prefetch={false} className="mt-7 inline-block text-[10px] tracking-[1.5px] uppercase text-white/30 hover:text-[#c7b697] transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>Admin Login</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.08] py-5">
        <p className="text-center text-[10px] tracking-[1.8px] uppercase text-white/30" style={{ fontFamily: 'Cormorant Garamond, serif' }}>© 2026 DR. HOSSAM LOTFY LAW FIRM</p>
      </div>
    </footer>
  );
}
