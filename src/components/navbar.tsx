'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, Landmark, Scale, KeyRound, LogOut, Menu, X, UserCircle2,
  Archive, ChevronDown, Users, UserPlus, ClipboardList,
  WalletCards, ShieldCheck, Building2
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

export function Navbar({ lawyers, locations, branches, session, unread }: NavbarProps) {
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

  const doSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    const value = q.trim();
    window.location.assign(value ? '/search?q=' + encodeURIComponent(value) + '&type=all' : '/search');
  };

  const logout = () => {
    setMobileOpen(false);
    window.location.replace('/api/auth/logout');
  };

  const courts = locations.filter((location) => location.type === 'COURT');
  const other = locations.filter((location) => location.type !== 'COURT');
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
      <Link href="/locations" className="block border-t px-4 py-2.5 text-center text-[11px] font-bold text-gold-700">{COPY.allCourts}</Link>
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
      <Link href="/lawyers" className="block border-t px-4 py-2.5 text-center text-[11px] font-bold text-gold-700">{COPY.allLawyers}</Link>
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
                {branch.is_main && <span className="mt-1 inline-block text-[9px] font-bold text-gold-700">المقر الرئيسي</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/admin/office" className="block border-t px-4 py-2.5 text-center text-[11px] font-bold text-gold-700">مركز إدارة الفروع</Link>
    </div>
  );

  const quickList = (
    <div className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-navy-100 bg-white p-2 shadow-xl">
      <p className="px-3 py-2 text-[10px] font-black text-gold-700">{COPY.quick}</p>
      <Link href="/profile" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><UserCircle2 size={15} />{COPY.profile}</Link>
      {isManagement && <Link href="/admin/office" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-navy-700 hover:bg-ivory-50"><WalletCards size={15} className="text-gold-600" />{COPY.management}</Link>}
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
    <header ref={wrapRef} className="fixed inset-x-0 top-2 z-50 mx-auto w-[calc(100%-1rem)] max-w-[1440px] rounded-2xl border border-navy-100 bg-white/95 shadow-lg backdrop-blur sm:top-3 sm:w-[calc(100%-2rem)]">
      <div className="relative flex min-h-14 items-center gap-1 px-2 sm:px-4">
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-navy-400 lg:hidden" onClick={() => setMobileOpen((value) => !value)} aria-label={COPY.menu}>{mobileOpen ? <X size={18} /> : <Menu size={18} />}</button>
        <Link href="/" className="flex shrink-0 items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-950 text-xs font-bold text-gold-400">LL</span><span className="hidden sm:flex flex-col"><span className="text-[12px] font-extrabold tracking-wider text-navy-950">Loutfi</span><span className="text-[8px] font-bold tracking-[3px] text-gold-600">LAW FIRM</span></span></Link>
        <form onSubmit={doSearch} className="mx-2 hidden min-w-0 max-w-[360px] flex-1 xl:flex"><div className="relative w-full"><Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-300" /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder={COPY.searchPlaceholder} className="h-9 w-full rounded-full border border-navy-200 bg-ivory-50 ps-9 pe-3 text-[12px] text-navy-900 outline-none focus:border-gold-500" /></div></form>
        <nav className="hidden items-center gap-1 lg:flex">
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
          <Link href="/calendar" className={navClass(pathname === '/calendar')}>{COPY.calendar}</Link>
          <Link href="/search" className={navClass(pathname === '/search')}>{COPY.search}</Link>
          {session && <div className="relative">
            <button type="button" onClick={() => setDropdown((value) => value === 'quick' ? null : 'quick')} className={navClass(false)}>{COPY.quick}<ChevronDown size={10} /></button>
            {dropdown === 'quick' && <div className="absolute end-0 top-full pt-2">{quickList}</div>}
          </div>}
        </nav>
        <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {session && pathname !== '/' && <button type="button" onClick={() => router.back()} className="flex h-8 items-center gap-1 rounded-lg border border-navy-200 bg-white px-2 text-[11px] font-bold text-navy-600 hover:border-gold-400 hover:text-navy-950"><span aria-hidden>←</span><span className="hidden sm:inline">{COPY.back}</span></button>}
          {session && <NotificationBell unread={unread} />}
          {session && <Link href="/profile" className="flex items-center gap-1 rounded-full border border-navy-200 bg-white px-2.5 py-2 text-[11px] font-bold text-navy-700 hover:border-gold-400"><UserCircle2 size={14} className="text-gold-600" /><span className="hidden max-w-28 truncate sm:inline">{COPY.profile}</span></Link>}
          {!session ? (
            <Link href="/auth" prefetch={false} className="rounded-full px-3 py-2 text-[10px] font-bold text-navy-500"><KeyRound size={13} className="inline me-1" />دخول</Link>
          ) : (
            <React.Fragment>
              <button type="button" onClick={logout} aria-label={COPY.logout} className="flex h-8 items-center gap-1 rounded-lg bg-red-50 px-2 text-[11px] font-bold text-red-600"><LogOut size={14} /><span className="hidden sm:inline">{COPY.logout}</span></button>
            </React.Fragment>
          )}
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-navy-100 bg-white p-3 lg:hidden">
          <form onSubmit={doSearch} className="mb-3 flex gap-2"><input value={q} onChange={(event) => setQ(event.target.value)} placeholder={COPY.searchShort} className="h-10 flex-1 rounded-xl border border-navy-200 px-3 text-sm" /><button type="submit" className="rounded-xl bg-navy-950 px-3 text-gold-400" aria-label={COPY.search}><Search size={15} /></button></form>
          <div className="grid gap-1.5">
            <Link href="/locations" className={navClass(false)}>{COPY.courts}</Link>
            <Link href="/lawyers" className={navClass(false)}>{COPY.lawyers}</Link>
            <Link href="/calendar" className={navClass(false)}>{COPY.calendar}</Link>
            <Link href="/search" className={navClass(false)}>{COPY.search}</Link>
            {session && <Link href="/profile" className={navClass(false)}>{COPY.profile}</Link>}
            {canNavigateBranches && <Link href="/admin/office" className={navClass(false)}><Building2 size={14} />المكاتب والفروع</Link>}
            {isManagement && <Link href="/admin/office" className={navClass(false)}>{COPY.management}</Link>}
          </div>
        </div>
      )}
    </header>
  );
}