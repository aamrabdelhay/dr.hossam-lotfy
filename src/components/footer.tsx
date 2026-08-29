import Link from 'next/link';

const contactPhones = [
  '37606575',
  '37606584',
  '37606672',
  '23930289',
  '33386364',
  '33354738',
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
    <footer className="relative mt-12 overflow-hidden border-t border-white/[0.08] bg-[#0A101D] text-white">
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold-500/70 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(680px_220px_at_50%_-90px,rgba(212,175,81,0.10),transparent_70%)]" />

      <div className="relative mx-auto max-w-[1180px] px-5 py-8 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
        <header className="text-center">
          <p className="text-[17px] tracking-[3px] text-white sm:text-[19px]" style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>
            DR. HOSSAM LOTFY
          </p>
          <p className="mt-0.5 text-[9px] uppercase tracking-[4px] text-gold-400/85" style={{ fontFamily: 'Inter, sans-serif' }}>
            LAW FIRM
          </p>
          <span aria-hidden className="mx-auto mt-4 block h-px w-12 bg-gold-500/55" />
        </header>

        <div className="mt-7 grid gap-7 md:grid-cols-[1fr_1.4fr] md:gap-10">
          <section className="text-center md:text-right" dir="rtl">
            <p className="text-[10px] font-bold tracking-[1.5px] text-gold-400/80" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>المقر الرئيسي</p>
            <p className="mt-1.5 text-[12px] leading-6 text-white/65" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>6 شارع السد العالي – الدقي – الجيزة</p>

            <div className="mt-5">
              <p className="text-[10px] font-bold tracking-[1.5px] text-gold-400/80" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>مكاتبنا</p>
              <div className="mt-2 grid gap-2 text-[11px] leading-5 text-white/60 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                <p><span className="font-semibold text-white/75">مكتب القاهرة:</span> 1 شارع شريف باشا – باب اللوق – القاهرة</p>
                <p><span className="font-semibold text-white/75">مكتب الجيزة:</span> 13 شارع نبيل الوقاد – الدقي – الجيزة</p>
              </div>
            </div>
          </section>

          <section className="border-t border-white/[0.06] pt-6 text-center md:border-t-0 md:border-r md:pr-10 md:pt-0" dir="rtl">
            <p className="text-[10px] font-bold tracking-[1.5px] text-gold-400/80" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>تواصل معنا</p>
            <a href="mailto:hloutfi@loutfilawfirm.net" dir="ltr" className="mt-1.5 inline-block text-[12px] text-white/70 transition-colors hover:text-gold-300" style={{ fontFamily: 'Inter, sans-serif' }}>hloutfi@loutfilawfirm.net</a>

            <div className="mx-auto mt-4 grid max-w-[570px] gap-y-2 text-[11px] leading-5 text-white/55 sm:grid-cols-2 lg:grid-cols-3" dir="ltr" style={{ fontFamily: 'Inter, sans-serif' }}>
              <span className="whitespace-nowrap">ت: 37606575 – 37606584 – 37606672</span>
              <span className="whitespace-nowrap">ت: 23930289 – ف: 23929992</span>
              <span className="whitespace-nowrap">ت: 33386364 – 33354738 – ف: 33361135</span>
              <span className="whitespace-nowrap">محمول المكتب: 0122411292</span>
            </div>
          </section>
        </div>

        <nav aria-label="Footer navigation" className="mt-7 border-t border-white/[0.06] pt-5">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" dir="rtl">
            {quickLinks.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-[10px] text-white/40 transition-colors hover:text-white/75" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="relative border-t border-white/[0.06] px-4 py-4 sm:px-6">
        <p className="text-center text-[9px] uppercase tracking-[1.2px] text-white/30" style={{ fontFamily: 'Inter, sans-serif' }}>© 2026 DR. HOSSAM LOTFY LAW FIRM</p>
        <p className="mt-1.5 text-center text-[8px] text-white/25" style={{ fontFamily: 'Inter, sans-serif' }}>Designed &amp; Developed by <span className="font-semibold text-white/40">Amr Abdelhay</span></p>
      </div>
    </footer>
  );
}
