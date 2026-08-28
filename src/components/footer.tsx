import Link from 'next/link';

const contactPhones = [
  '37606575 - 37606584 - 37606672',
  '23930289 / Fax: 23929992',
  '33386364 - 33354738 / Fax: 33361135',
  'Office Mobile: 0122411292',
];

export function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-white/[0.08] bg-[#0A101D] text-white">
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold-500/70 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(720px_240px_at_50%_-80px,rgba(212,175,81,0.10),transparent_70%)]" />
      <span aria-hidden className="pointer-events-none absolute inset-x-10 top-10 h-56 bg-[radial-gradient(560px_220px_at_88%_30%,rgba(36,18,22,0.55),transparent_70%)]" />

      <div className="relative mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-4 py-10 sm:px-6 sm:py-12 md:grid-cols-2 md:gap-10 lg:grid-cols-3 lg:gap-12 lg:px-8">
        <section className="min-w-0">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold-500/50 bg-gradient-to-br from-gold-500/25 via-gold-600/10 to-transparent text-[15px] text-gold-300"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}
            >
              HL
            </span>
            <div className="min-w-0">
              <p className="text-[14px] tracking-[2px] text-white" style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 500 }}>
                DR. HOSSAM LOTFY
              </p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[3px] text-gold-400/80" style={{ fontFamily: 'Inter, sans-serif' }}>
                LAW FIRM
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-[12px] leading-7 text-white/65" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            <p><span className="font-semibold text-gold-400">المقر الرئيسي:</span> 6 El-Sad El-Aaly St. - Dokki - Giza</p>
            <p><span className="font-semibold text-gold-400">مكتب القاهرة:</span> 1 Sherif Basha St. - Bab El-Louk - Cairo</p>
            <a href="mailto:hloutfi@loutfilawfirm.net" dir="ltr" className="block w-fit text-white/75 transition-colors hover:text-gold-300">
              hloutfi@loutfilawfirm.net
            </a>
          </div>
        </section>

        <section className="min-w-0 border-t border-white/[0.06] pt-7 md:border-t-0 md:pt-0">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-gold-400/70" style={{ fontFamily: 'Inter, sans-serif' }}>
            BRANCHES
          </p>
          <div className="mt-5 space-y-3 text-[12px] leading-7 text-white/65" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            <p><span className="font-semibold text-gold-400">مكتب العالية:</span> Nabil El-Wakkad St. - Dokki - Giza</p>
            <p><span className="font-semibold text-gold-400">مكتب الجيزة:</span> 13 Nabil El-Wakkad St. - Dokki - Giza</p>
          </div>

          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-gold-400/60" style={{ fontFamily: 'Inter, sans-serif' }}>
              CONTACT
            </p>
            <div className="space-y-1.5 text-[11px] leading-6 text-white/55" dir="ltr" style={{ fontFamily: 'Inter, sans-serif' }}>
              {contactPhones.map((phone) => <p key={phone}>{phone}</p>)}
            </div>
          </div>
        </section>

        <section className="min-w-0 border-t border-white/[0.06] pt-7 md:col-span-2 lg:col-span-1 md:border-t-0 md:pt-0">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-gold-400/70" style={{ fontFamily: 'Inter, sans-serif' }}>
            QUICK LINKS
          </p>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-1">
            <li><Link href="/" className="text-[12px] text-white/60 transition-colors hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>الرئيسية</Link></li>
            <li><Link href="/locations" className="text-[12px] text-white/60 transition-colors hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>المحاكم والأماكن</Link></li>
            <li><Link href="/lawyers" className="text-[12px] text-white/60 transition-colors hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>المحامون</Link></li>
            <li><Link href="/calendar" className="text-[12px] text-white/60 transition-colors hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>التقويم</Link></li>
            <li><Link href="/search" className="text-[12px] text-white/60 transition-colors hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>البحث</Link></li>
          </ul>
        </section>
      </div>

      <div className="relative border-t border-white/[0.06] px-4 py-5 sm:px-6">
        <p className="text-center text-[10px] uppercase tracking-[1.5px] text-white/35" style={{ fontFamily: 'Inter, sans-serif' }}>
          © 2026 DR. HOSSAM LOTFY LAW FIRM
        </p>
        <p className="mt-2 text-center text-[9px] text-white/30" style={{ fontFamily: 'Inter, sans-serif' }}>
          Designed &amp; Developed by <span className="font-semibold text-white/45">Amr Abdelhay</span>
        </p>
      </div>
    </footer>
  );
}
