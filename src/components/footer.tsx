import Link from 'next/link';

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

      <div className="relative mx-auto max-w-[1180px] px-5 py-9 sm:px-6 lg:px-8">
        <header className="text-center">
          <p className="text-[17px] tracking-[3px] text-white sm:text-[19px]" style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>DR. HOSSAM LOTFY</p>
          <p className="mt-0.5 text-[9px] uppercase tracking-[4px] text-gold-400/85" style={{ fontFamily: 'Inter, sans-serif' }}>LAW FIRM</p>
          <span aria-hidden className="mx-auto mt-4 block h-px w-12 bg-gold-500/55" />
        </header>

        <div className="mx-auto mt-8 grid max-w-[980px] items-stretch gap-5 md:grid-cols-2" dir="rtl">
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-6 text-center">
            <p className="text-[10px] font-bold tracking-[1.8px] text-gold-400/85" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>عناوين المكاتب</p>
            <div className="mx-auto mt-4 h-px w-10 bg-gold-500/35" />
            <div className="mt-5 grid gap-4 text-[11px] leading-6 text-white/65 sm:grid-cols-2" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
              <div className="rounded-xl border border-white/[0.05] px-4 py-3">
                <p className="font-bold text-white/85">المقر الرئيسي</p>
                <p className="mt-1">6 شارع السد العالي<br />الدقي – الجيزة</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] px-4 py-3">
                <p className="font-bold text-white/85">مكتب القاهرة</p>
                <p className="mt-1">1 شارع شريف باشا<br />باب اللوق – القاهرة</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] px-4 py-3 sm:col-span-2">
                <p className="font-bold text-white/85">مكتب الجيزة</p>
                <p className="mt-1">13 شارع نبيل الوقاد – الدقي – الجيزة</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-6 text-center">
            <p className="text-[10px] font-bold tracking-[1.8px] text-gold-400/85" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>بيانات التواصل</p>
            <div className="mx-auto mt-4 h-px w-10 bg-gold-500/35" />
            <a href="mailto:hloutfi@loutfilawfirm.net" dir="ltr" className="mt-5 inline-block text-[12px] text-white/75 transition-colors hover:text-gold-300" style={{ fontFamily: 'Inter, sans-serif' }}>hloutfi@loutfilawfirm.net</a>
            <div className="mx-auto mt-5 grid max-w-[520px] gap-3 sm:grid-cols-2" dir="ltr" style={{ fontFamily: 'Inter, sans-serif' }}>
              <div className="rounded-xl border border-white/[0.05] px-3 py-3 text-[10px] leading-5 text-white/60">
                <p>تليفونات</p>
                <p className="mt-0.5 text-white/80">37606575 – 37606584 – 37606672</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] px-3 py-3 text-[10px] leading-5 text-white/60">
                <p>تليفون / فاكس</p>
                <p className="mt-0.5 text-white/80">23930289 – ف: 23929992</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] px-3 py-3 text-[10px] leading-5 text-white/60">
                <p>تليفونات</p>
                <p className="mt-0.5 text-white/80">33386364 – 33354738 – ف: 33361135</p>
              </div>
              <div className="rounded-xl border border-gold-500/15 bg-gold-500/[0.03] px-3 py-3 text-[10px] leading-5 text-white/60">
                <p>محمول المكتب</p>
                <p className="mt-0.5 text-white/90">0122411292</p>
              </div>
            </div>
          </section>
        </div>

        <nav aria-label="Footer navigation" className="mx-auto mt-7 max-w-[980px] border-t border-white/[0.06] pt-5">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" dir="rtl">
            {quickLinks.map(([href, label]) => (
              <li key={href}><Link href={href} className="text-[10px] text-white/40 transition-colors hover:text-white/75" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{label}</Link></li>
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
