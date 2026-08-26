import Link from 'next/link';
import { MapPin, Mail, Phone, Printer, Smartphone, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

type Office = { title: string; address: string };

const OFFICES: Office[] = [
  { title: 'المقر الرئيسي', address: '(٦) شارع السد العالي - الدقي - الجيزة' },
  { title: 'مكتب القاهرة', address: '(1) شارع شريف باشا - باب اللوق - القاهرة' },
  { title: 'مكتب العالية', address: 'شارع نبيل الوقاد - الدقي - الجيزة' },
  { title: 'مكتب الجيزة', address: '(١٣) شارع نبيل الوقاد - الدقي - الجيزة' },
];

function OfficeBlock({ office, mobile }: { office: Office; mobile?: boolean }) {
  return (
    <details className={cn('group', mobile && 'rounded-lg bg-white/5')} open={!mobile}>
      <summary className={cn('flex cursor-pointer list-none items-center gap-2 py-1.5 text-[13px] font-extrabold text-ivory-50 [&::-webkit-details-marker]:hidden', mobile && 'justify-between')}>
        <span className="flex items-center gap-2">
          <MapPin size={14} className="text-gold-400" />
          {office.title}
        </span>
        {mobile && <ChevronDown size={14} className="text-gold-400 transition-transform group-open:rotate-180" />}
      </summary>
      <p className="pb-2 ps-6 text-[12px] font-medium leading-6 text-ivory-300">{office.address}</p>
    </details>
  );
}

export function Footer() {
  return (
    <footer className="mt-12 border-t-4 border-gold-500 bg-navy-950 text-ivory-200">
      <div className="gold-hairline" />
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3">
            <span className="h-14 w-14 overflow-hidden rounded-md ring-1 ring-gold-500/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="DR. HOSSAM LOTFY LAW FIRM" className="h-full w-full object-cover" />
            </span>
            <div>
              <p className="font-latin text-sm font-bold tracking-wide text-ivory-50">DR. HOSSAM LOTFY</p>
              <p className="text-[11px] font-semibold text-gold-400">LAW FIRM — مكتب المحاماة</p>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-[12px] leading-6 text-ivory-300">
            نظام إدارة عمليات مكتب المحاماة: الجلسات، المواعيد، المهام، ومتابعة المحامين — في مكان واحد.
          </p>
          <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-bold">
            <Link href="/" className="text-ivory-300 hover:text-gold-300">الرئيسية</Link>
            <Link href="/locations" className="text-ivory-300 hover:text-gold-300">المحاكم والأماكن</Link>
            <Link href="/lawyers" className="text-ivory-300 hover:text-gold-300">المحامون</Link>
            <Link href="/search" className="text-ivory-300 hover:text-gold-300">البحث</Link>
            <Link href="/calendar" className="text-ivory-300 hover:text-gold-300">التقويم</Link>
          </nav>
        </div>

        {/* Offices — collapsible on mobile */}
        <div>
          <h3 className="mb-2 text-[13px] font-extrabold tracking-wide text-gold-300">مكاتبنا</h3>
          <div className="hidden md:block">
            {OFFICES.map((o) => (
              <div key={o.title} className="py-1.5">
                <p className="flex items-center gap-2 text-[13px] font-extrabold text-ivory-50">
                  <MapPin size={14} className="text-gold-400" />
                  {o.title}
                </p>
                <p className="ps-6 text-[12px] font-medium leading-6 text-ivory-300">{o.address}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 md:hidden">
            {OFFICES.map((o) => (
              <OfficeBlock key={o.title} office={o} mobile />
            ))}
          </div>
        </div>

        {/* Contact — exact office information */}
        <div>
          <h3 className="mb-2 text-[13px] font-extrabold tracking-wide text-gold-300">تواصل معنا</h3>
          <ul className="space-y-2.5 text-[12.5px] font-medium text-ivory-300">
            <li className="flex items-center gap-2">
              <Mail size={14} className="shrink-0 text-gold-400" />
              <a href="mailto:hloutfi@loutfilawfirm.net" className="font-latin tracking-wide hover:text-gold-300" dir="ltr">
                hloutfi@loutfilawfirm.net
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={14} className="shrink-0 text-gold-400" />
              <span>{'٣٧٦٠٦٥٧٥ - ٣٧٦٠٦٥٨٤ - ٣٧٦٠٦٦٧٢'}</span>
            </li>
            <li className="flex items-center gap-2">
              <Printer size={14} className="shrink-0 text-gold-400" />
              <span>{'۲۳۹۳۰۲۸۹ / ۲۳۹۲۹۹۹۲'}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={14} className="shrink-0 text-gold-400" />
              <span>{'٣٣٣٨٦٣٦٤ - ٣٣٣٥٤٧٣٨ (مكتب الجيزة)'}</span>
            </li>
            <li className="flex items-center gap-2">
              <Printer size={14} className="shrink-0 text-gold-400" />
              <span>{'٣٣٣٦١١٣٥ (فاكس مكتب الجيزة)'}</span>
            </li>
            <li className="flex items-center gap-2">
              <Smartphone size={14} className="shrink-0 text-gold-400" />
              <span>{'٠١٢٢٤١١٢٩٢ (محمول المكتب)'}</span>
            </li>
          </ul>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="mb-2 text-[13px] font-extrabold tracking-wide text-gold-300">روابط سريعة</h3>
          <ul className="space-y-2 text-[12.5px] font-semibold text-ivory-300">
            <li><Link href="/locations" className="hover:text-gold-300">صفحات المحاكم والأماكن</Link></li>
            <li><Link href="/lawyers/dr-hossam-lotfy" className="hover:text-gold-300">صفحة DR. Hossam Lotfy</Link></li>
            <li><Link href="/calendar" className="hover:text-gold-300">التقويم والجلسات</Link></li>
            <li><Link href="/search" className="hover:text-gold-300">البحث المتقدم</Link></li>
            <li><Link href="/admin/login" className="text-gold-400 hover:text-gold-300">بوابة المسؤول (Admin)</Link></li>
          </ul>
          <div className="mt-5 rounded-lg border border-gold-500/25 bg-gold-500/[0.06] p-3">
            <p className="text-[11px] font-semibold leading-5 text-ivory-300">
              البيانات المعروضة في بيئة التطوير تجريبية لأغراض العرض فقط، ولا تمثل ملفات قضائية حقيقية.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4">
        <p className="px-4 text-center text-[11px] font-medium text-ivory-300">
          © {new Date().getFullYear()} DR. HOSSAM LOTFY LAW FIRM — جميع الحقوق محفوظة
        </p>
      </div>
    </footer>
  );
}
