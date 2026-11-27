'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, Landmark, Scale, KeyRound, LogOut, Menu, X, UserCircle2,
  Archive, ChevronDown, Users, UserPlus, ClipboardList,
  WalletCards, ShieldCheck, Building2, Clock3,
  House, CalendarDays, ListChecks, Bell, Ellipsis, Bot
} from 'lucide-react';
import { Avatar } from './ui';
import { NotificationBell } from './notification-bell';
import { cn } from '@/lib/cn';
import type { NavLawyer, NavLocation } from '@/lib/constants';
import { LOCATION_TYPE_LABEL, TITLE_LABEL } from '@/lib/constants';

type NavbarProps = {
  lawyers: NavLawyer[];
  locations: NavLocation[];
  branches: Array<{ id: string; name_ar: string; address: string; is_main: boolean }>;
  session: {
    role: 'admin' | 'lawyer';
    name: string;
    slug?: string;
    photo?: string | null;
    isAdmin?: boolean;
    isFinance?: boolean;
    isSenior?: boolean;
    isOffice?: boolean;
  } | null;
  unread: number;
  logoDataUrl?: string | null;
};

const COPY = {
  courts: 'أماكن العمل',
  lawyers: 'زملاء العمل',
  calendar: 'التقويم',
  search: 'البحث',
  quick: 'تنقّل سريع',
  clients: 'العملاء',
  assign: 'التكليفات',
  addLawyer: 'إضافة محامي',
  addLocation: 'إضافة محكمة أو جهة',
  archive: 'أرشيف القضايا',
  allCourts: 'عرض كل أماكن العمل',
  allLawyers: 'عرض كل زملاء العمل',
  otherLocations: 'أماكن العمل الأخرى',
  searchPlaceholder: 'ابحث عن عميل، قضية، مكان، زميل…',
  searchShort: 'ابحث...',
  menu: 'القائمة',
  logout: 'تسجيل الخروج',
  profile: 'ملفي الشخصي',
  management: 'الإدارة',
  seniorCenter: 'مركز الإدارة العليا',
  back: 'رجوع',
} as const;

export function Navbar({ lawyers, locations, branches, session, unread, logoDataUrl }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [dropdown, setDropdown] = React.useState<'locations' | 'lawyers' | 'branches' | 'quick' | null>(null);
  const [q, setQ] = React.useState('');
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setDropdown(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
    setDropdown(null);
  }, [pathname]);

  if (pathname === '/auth') return null;

  const doSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    const value = q.trim();
    router.push(value ? '/search?q=' + encodeURIComponent(value) + '&type=all' : '/search');
  };

  const logout = () => {
    setMobileOpen(false);
    window.location.replace('/api/auth/logout');
  };

  const visibleLocations = locations.filter((location) => location.type !== 'OTHER');
  const courts = visibleLocations.filter((location) => location.type === 'COURT');
  const other = visibleLocations.filter((location) => location.type !== 'COURT');
  const isAdmin = Boolean(session && (session.role === 'admin' || session.isSenior));
  const isManagement = Boolean(session && (session.role === 'admin' || session.isSenior || session.isOffice || session.isFinance));
  const canNavigateBranches = Boolean(isAdmin && branches.length);

  const navClass = (active: boolean) =>
    cn(
      'inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap transition',
      active ? 'bg-navy-950 text-white' : 'text-navy-700 hover:bg-navy-900/5 hover:text-navy-950',
    );

  const locationList = (
    <div className="w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-xl">
      <p className="bg-navy-950 px-4 py-2.5 text-[10px] font-bold text-gold-300">{COPY.courts}</p>
      <ul className="max-h-64 overflow-y-auto py-1">
        {courts.map((location) => (
          <li key={location.id}>
            <Link href={'/locations/' + location.slug} className="flex items-center gap-2 px-4 py-2 text-[12px] text-navy-700 hover:bg-ivory-50">
              <Landmark size={14} className="text-gold-600" />{location.name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="border-t bg-ivory-50 px-4 py-2 text-[9px] font-bold text-navy-400">{COPY.otherLocations}</p>
      <ul className="max-h-48 overflow-y-auto py-1">
        {other.map((location) => (
          <li key={location.id}>
            <Link href={'/locations/' + location.slug} className="flex items-center gap-2 px-4 py-2 text-[12px] text-navy-700 hover:bg-ivory-50">
              <Scale size={13} className="text-gold-600" />{location.name}
              <span className="ms-auto text-[10px] text-navy-400">{LOCATION_TYPE_LABEL[location.type]}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="border-t bg-ivory-50 px-4 py-2 text-[9px] font-bold text-navy-400">فروع المكتب</p>
      <ul className="max-h-48 overflow-y-auto py-1">
        {branches.map((branch) => (
          <li key={branch.id}>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${branch.name_ar} ${branch.address}`)}`} target="_blank" rel="noreferrer" className="flex items-start gap-2 px-4 py-2 text-[12px] text-navy-700 hover:bg-ivory-50">
              <Building2 size={14} className="mt-0.5 shrink-0 text-gold-600" />
              <span><span className="block font-bold">{branch.name_ar}{branch.is_main ? ' — المقر الرئيس' : ''}</span><span className="mt-0.5 block text-[10px] text-navy-400">{branch.address}</span></span>
            </a>
          </li>
        ))}
      </ul>
      <Link prefetch={true} href="/locations" className="block border-t px-4 py-2.5 text-center text-[11px] font-bold text-gold-700">{COPY.allCourts}</Link>
    </div>
  );

  const lawyerList = (
    <div className="w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-xl">
      <ul className="max-h-80 overflow-y-auto py-1">
        {[...lawyers].sort((a, b) => Number(b.isPrincipal) - Number(a.isPrincipal)).map((lawyer) => (
          <li key={lawyer.id}>
            <Link href={'/lawyers/' + lawyer.slug} className="flex items-center gap-3 px-4 py-2 hover:bg-ivory-50">
              <Avatar name={lawyer.name} src={lawyer.photo} size={28} />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-bold text-navy-800">{lawyer.name}</span>
                <span className="block text-[10px] text-navy-400">{TITLE_LABEL[lawyer.title]}</span>
                {lawyer.managementLabels?.length > 0 && <span className="mt-1 flex flex-wrap gap-1">{lawyer.managementLabels.map((label) => <span key={label} className="rounded-full bg-gold-500/10 px-1.5 py-0.5 text-[8px] font-extrabold text-gold-700">{label}</span>)}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link prefetch={true} href="/lawyers" className="block border-t px-4 py-2.5 text-center text-[11px] font-bold text-gold-700">{COPY.allLawyers}</Link>
    </div>
  );

  const branchList = (
    <div className="w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-xl">
      <p className="bg-navy-950 px-4 py-2.5 text-[10px] font-bold text-gold-300">المكاتب والفروع</p>
      <ul className="max-h-80 overflow-y-auto py-1">
        {branches.map((branch) => (
          <li key={branch.id}>
            <Link href={'/admin/office/branches/' + branch.id} className="flex items-start gap-3 px-4 py-3 hover:bg-ivory-50">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-500/10 text-gold-700"><Building2 size={15} /></span>
              <span className="min-w-0">
                <span className="block text-[12px] font-extrabold text-navy-800">{branch.name_ar}</span>
                <span className="mt-0.5 block truncate text-[10px] text-navy-400">{branch.address}</span>
                {branch.is_main && <span className="mt-1 inline-block text-[9px] font-bold text-gold-700">المقر الرئيس</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/admin/office" className="block border-t px-4 py-2.5 text-center text-[11px] font-bold text-gold-700">مركز إدارة الفروع</Link>
    </div>
  );

  const quickList = (
    <div className="max-h-[min(70vh,calc(100dvh-6rem))] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain scroll-smooth rounded-2xl border border-navy-100 bg-white p-2 shadow-xl">
      <p className="px-3 py-2 text-[10px] font-black text-gold-700">{COPY.quick}</p>
      <Link href="/my-day" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><ClipboardList size={15}/>يومي</Link>
      <Link href="/timesheets" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><Clock3 size={15}/>ساعات العمل</Link>
      <Link href="/court-mode" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><Landmark size={15}/>وضع المحاكم</Link>
      <Link href="/library" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><ClipboardList size={15}/>المكتبة والأدلة</Link>
      <Link href="/directory" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><ClipboardList size={15}/>دليل الخبراء والمترجمين</Link>
      <Link href="/tools/compare" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><ClipboardList size={15}/>مقارنة نصوص</Link>
      <Link href="/tools/redact" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><ClipboardList size={15}/>إخفاء بيانات في صورة</Link>
      <Link href="/profile/security" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><ShieldCheck size={15}/>الأجهزة وجلسات الدخول</Link>
      <Link href="/profile" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><UserCircle2 size={15} />{COPY.profile}</Link>
      <Link href="/finance" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><WalletCards size={15} className="text-gold-600" />الطلبات المالية</Link>
      {(session?.isFinance || session?.isSenior) && <Link href="/admin/finance" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><Landmark size={15} className="text-gold-600" />الإدارة المالية</Link>}
      {isManagement && <><Link href="/admin/operations" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><ShieldCheck size={15} className="text-gold-600" />مركز العمليات الذكية</Link><Link href="/admin/office" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><WalletCards size={15} className="text-gold-600" />{COPY.management}</Link></>}
      {isAdmin && <React.Fragment>
        <Link href="/admin/clients" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><Users size={15} className="text-gold-600" />{COPY.clients}</Link>
        <Link href="/admin/office" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><ShieldCheck size={15} className="text-gold-600" />{COPY.seniorCenter}</Link>
        <Link href="/admin?tab=tasks" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><ClipboardList size={15} className="text-gold-600" />{COPY.assign}</Link>
        <Link href="/admin?tab=lawyers" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><UserPlus size={15} className="text-gold-600" />{COPY.addLawyer}</Link>
        <Link href="/admin?tab=locations" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><Landmark size={15} className="text-gold-600" />{COPY.addLocation}</Link>
        <Link href="/cases/archive" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><Archive size={15} className="text-gold-600" />{COPY.archive}</Link>
      </React.Fragment>}
      {canNavigateBranches && <div className="my-1 border-y border-navy-100 py-1">{branches.map((branch) => <Link key={branch.id} href={'/admin/office/branches/' + branch.id} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><Building2 size={15} className="text-gold-600" />{branch.name_ar}</Link>)}</div>}
    </div>
  );

  return (
    <>
    <header ref={wrapRef} className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[1440px] rounded-none sm:top-3 sm:w-[calc(100%-2rem)] sm:rounded-2xl border border-navy-100 bg-white/95 shadow-sm backdrop-blur sm:shadow-lg">
      {session && (
        <nav aria-label="التنقل" className="grid h-16 grid-cols-6 lg:hidden">
          {[
            { href: '/', label: 'الرئيسية', icon: House, active: pathname === '/' },
            { href: '/calendar', label: 'التقويم', icon: CalendarDays, active: pathname?.startsWith('/calendar') || false },
            { href: '/my-day', label: 'يومي', icon: ListChecks, active: pathname?.startsWith('/my-day') || false },
            { href: '/notifications', label: 'الإشعارات', icon: Bell, active: pathname?.startsWith('/notifications') || false, badge: unread },
          ].map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn('relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold', item.active ? 'text-gold-700' : 'text-navy-500')}>
              <span className={cn('relative flex h-8 w-9 items-center justify-center rounded-full', item.active && 'bg-gold-500/15')}><item.icon size={20} />{item.badge ? <span className="absolute -end-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[9px] font-extrabold leading-4 text-white">{item.badge > 99 ? '99+' : item.badge}</span> : null}</span>{item.label}
            </Link>
          ))}
          <button type="button" onClick={() => { setMobileOpen(false); window.dispatchEvent(new Event('open-office-assistant')); }} className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-navy-500">
            <span className="flex h-8 w-9 items-center justify-center rounded-full bg-navy-950 text-gold-400"><Bot size={18} /></span>المساعد
          </button>
          <button type="button" onClick={() => setMobileOpen((v) => !v)} aria-label={COPY.menu} aria-expanded={mobileOpen} className={cn('flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold', mobileOpen ? 'text-gold-700' : 'text-navy-500')}>
            <span className={cn('flex h-8 w-9 items-center justify-center rounded-full', mobileOpen && 'bg-gold-500/15')}>{mobileOpen ? <X size={20} /> : <Ellipsis size={20} />}</span>المزيد
          </button>
        </nav>
      )}

      <div className="relative hidden min-h-14 items-center gap-1 px-2 sm:px-4 lg:flex">
        
        <Link href="/" className="flex shrink-0 items-center gap-2"><span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-navy-950 text-xs font-bold text-gold-400">{logoDataUrl ? <img src={logoDataUrl} alt="شعار مكتب لوتفي" className="h-full w-full object-contain" /> : <Scale size={19} className="text-gold-400" aria-label="شعار المكتب" />}</span><span className="hidden text-[12px] font-extrabold tracking-wider text-navy-950 sm:block">Loutfi</span></Link>
        {session && <form onSubmit={doSearch} className="mx-2 hidden min-w-0 max-w-[360px] flex-1 xl:flex"><div className="relative w-full"><Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-300" /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder={COPY.searchPlaceholder} className="h-9 w-full rounded-full border border-navy-200 bg-ivory-50 ps-9 pe-3 text-[12px] text-navy-900 outline-none focus:border-gold-500" /></div></form>}
        {session && <nav className="hidden items-center gap-1 lg:flex">
          <div className="relative">
            <button type="button" onClick={() => setDropdown((value) => value === 'locations' ? null : 'locations')} className={navClass(pathname?.startsWith('/locations') || false)}>{COPY.courts}<ChevronDown size={10} /></button>
            {dropdown === 'locations' && <div className="absolute end-0 top-full pt-2">{locationList}</div>}
          </div>
          <div className="relative">
            <button type="button" onClick={() => setDropdown((value) => value === 'lawyers' ? null : 'lawyers')} className={navClass(pathname?.startsWith('/lawyers') || false)}>{COPY.lawyers}<ChevronDown size={10} /></button>
            {dropdown === 'lawyers' && <div className="absolute end-0 top-full pt-2">{lawyerList}</div>}
          </div>
          {canNavigateBranches && <div className="relative">
            <button type="button" onClick={() => setDropdown((value) => value === 'branches' ? null : 'branches')} className={navClass(pathname?.startsWith('/admin/office/branches') || false)}><Building2 size={13} />المكاتب<ChevronDown size={10} /></button>
            {dropdown === 'branches' && <div className="absolute end-0 top-full pt-2">{branchList}</div>}
          </div>}
          <Link prefetch={true} href="/calendar" className={navClass(pathname === '/calendar')}>{COPY.calendar}</Link>
          <Link prefetch={true} href="/search" className={navClass(pathname === '/search')}>{COPY.search}</Link>
          {session && <div className="relative">
            <button type="button" onClick={() => setDropdown((value) => value === 'quick' ? null : 'quick')} className={navClass(false)}>{COPY.quick}<ChevronDown size={10} /></button>
            {dropdown === 'quick' && <div className="absolute end-0 top-full pt-2">{quickList}</div>}
          </div>}
        </nav>}
        {session && <button type="button" aria-label="مساعد المكتب" onClick={() => window.dispatchEvent(new Event('open-office-assistant'))} className="absolute start-1/2 top-1/2 flex h-10 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-gold-400/70 bg-navy-950 px-4 text-[12px] font-bold text-gold-400 shadow-md lg:hidden"><Bot size={18} />المساعد</button>}
        <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {session && <NotificationBell unread={unread} />}
          {session && isManagement && <Link href="/admin/office" className="hidden h-10 shrink-0 items-center gap-1 rounded-full bg-navy-950 px-3 text-[10px] sm:inline-flex font-extrabold text-white hover:bg-navy-900 sm:gap-1.5 sm:px-3" title="دخول الإدارة"><ShieldCheck size={14} className="shrink-0 text-gold-400" /><span className="hidden sm:inline">دخول الإدارة</span><span className="hidden min-[400px]:inline sm:hidden">الإدارة</span></Link>}
          {session && <Link href="/profile" className="hidden h-10 w-10 items-center justify-center gap-1 rounded-full border border-navy-200 bg-white text-[11px] sm:flex sm:w-auto sm:px-2.5 font-bold text-navy-700 hover:border-gold-400"><UserCircle2 size={14} className="text-gold-600" /><span className="hidden max-w-28 truncate sm:inline">{COPY.profile}</span></Link>}
          {!session ? (
            <Link href="/auth" prefetch={false} className="rounded-full px-3 py-2 text-[10px] font-bold text-navy-500"><KeyRound size={13} className="inline me-1" />دخول</Link>
          ) : (
            <div className="flex items-center gap-1">
              {pathname !== '/' && <button type="button" onClick={() => router.back()} className="hidden h-8 items-center sm:flex gap-1 rounded-lg border border-navy-200 bg-white px-2 text-[11px] font-bold text-navy-600 hover:border-gold-400 hover:text-navy-950"><span aria-hidden>←</span><span className="hidden sm:inline">{COPY.back}</span></button>}
              <button type="button" onClick={logout} aria-label={COPY.logout} className="hidden h-10 w-10 items-center justify-center gap-1 rounded-full bg-red-50 sm:flex sm:h-8 sm:w-auto sm:rounded-lg sm:px-2 text-[11px] font-bold text-red-600"><LogOut size={14} /><span className="hidden sm:inline">{COPY.logout}</span></button>
            </div>
          )}
        </div>
      </div>
    </header>
      {session && (
        <>
          {mobileOpen && (
            <div className="fixed inset-0 z-[65] lg:hidden" role="dialog" aria-modal="true">
              <button type="button" aria-label="إغلاق" className="absolute inset-0 bg-navy-950/40" onClick={() => setMobileOpen(false)} />
              <div className="absolute inset-x-0 top-[68px] max-h-[calc(100dvh-76px)] overflow-y-auto overscroll-contain rounded-b-3xl bg-white p-4 shadow-2xl">
                
                <form onSubmit={doSearch} className="mb-4 flex gap-2"><input value={q} onChange={(event) => setQ(event.target.value)} placeholder={COPY.searchShort} className="h-11 min-w-0 flex-1 rounded-full border border-navy-200 bg-ivory-50 px-4 text-base" /><button type="submit" className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-950 text-gold-400" aria-label={COPY.search}><Search size={17} /></button></form>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  {[
                    { href: '/sessions', label: 'الجلسات', icon: Scale, show: true },
                    { href: '/tasks', label: 'المهام', icon: ClipboardList, show: true },
                    { href: '/locations', label: COPY.courts, icon: Landmark, show: true },
                    { href: '/lawyers', label: COPY.lawyers, icon: Users, show: true },
                    { href: '/search', label: COPY.search, icon: Search, show: true },
                    { href: '/profile', label: COPY.profile, icon: UserCircle2, show: true },
                    { href: '/admin/office', label: canNavigateBranches ? 'المكاتب والفروع' : 'دخول الإدارة', icon: Building2, show: !!(canNavigateBranches || isManagement) },
                    { href: '/finance', label: 'الطلبات المالية', icon: WalletCards, show: true },
                    { href: '/admin/finance', label: 'الإدارة المالية', icon: Landmark, show: !!(session?.isFinance || session?.isSenior) },
                    { href: '/admin/operations', label: 'العمليات', icon: ShieldCheck, show: !!isManagement },
                    { href: '/admin/clients', label: COPY.clients, icon: Users, show: !!isAdmin },
                  ].filter((i) => i.show).map((item) => (
                    <Link key={item.href + item.label} href={item.href} onClick={() => setMobileOpen(false)} className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl bg-ivory-100 px-1 text-[12px] font-bold text-navy-800 active:bg-ivory-200">
                      <item.icon size={22} className="text-gold-600" />{item.label}
                    </Link>
                  ))}
                </div>
                <button type="button" onClick={logout} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-50 text-[13px] font-bold text-red-600"><LogOut size={16} />{COPY.logout}</button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}