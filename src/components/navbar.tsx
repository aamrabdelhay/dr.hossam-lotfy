'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Landmark, Scale, KeyRound, LogOut, Menu, X, UserCircle2, Archive, ChevronDown, LayoutDashboard } from 'lucide-react';
import { Avatar } from './ui';
import { NotificationBell } from './notification-bell';
import { cn } from '@/lib/cn';
import type { NavLawyer, NavLocation } from '@/lib/constants';
import { LOCATION_TYPE_LABEL, TITLE_LABEL } from '@/lib/constants';

type NavbarProps = { lawyers: NavLawyer[]; locations: NavLocation[]; session: { role: 'admin' | 'lawyer'; name: string; slug?: string; photo?: string | null; isAdmin?: boolean } | null; unread: number };

export function Navbar({ lawyers, locations, session, unread }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [dropdown, setDropdown] = React.useState<'locations' | 'lawyers' | null>(null);
  const [q, setQ] = React.useState('');
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setDropdown(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  React.useEffect(() => { setMobileOpen(false); setDropdown(null); }, [pathname]);

  const doSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    params.set('type', 'court');
    window.location.assign(`/search?${params.toString()}`);
  };

  const logout = () => { setMobileOpen(false); window.location.replace('/api/auth/logout'); };
  const courts = locations.filter((l) => l.type === 'COURT');
  const otherLocations = locations.filter((l) => l.type !== 'COURT');
  const isActive = (href: string) => href === '/lawyers' ? pathname?.startsWith('/lawyers') ?? false : href === '/locations' ? pathname?.startsWith('/locations') ?? false : href === '/calendar' ? pathname === '/calendar' : href === '/search' ? pathname === '/search' : pathname === href;
  const navLinkStyle = (active: boolean) => cn('relative inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap transition-all duration-200', active ? 'bg-white/65 text-navy-950 shadow-sm ring-1 ring-white/80 backdrop-blur-xl' : 'text-navy-600 hover:bg-white/55 hover:text-navy-950');

  const locationList = (
    <div className="w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-xl ring-1 ring-white/70 backdrop-blur-2xl">
      <p className="bg-[#0A101D]/90 px-4 py-2.5 text-[10px] font-bold text-gold-300">المحاكم والجهات الحكومية</p>
      <ul className="max-h-64 overflow-y-auto py-1.5">{courts.map((l) => <li key={l.id}><Link href={`/locations/${l.slug}`} className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#1D2433] hover:bg-white/70"><Landmark size={14} className="text-gold-600" />{l.name}</Link></li>)}</ul>
      <p className="bg-white/50 px-4 py-2 text-[9px] font-bold text-[#5B6B84]">الجهات الأخرى</p>
      <ul className="max-h-48 overflow-y-auto py-1.5">{otherLocations.map((l) => <li key={l.id}><Link href={`/locations/${l.slug}`} className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#1D2433] hover:bg-white/70"><Scale size={14} className="text-[#5B6B84]" />{l.name}<span className="ms-auto rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-[#5B6B84]">{LOCATION_TYPE_LABEL[l.type]}</span></Link></li>)}</ul>
      <Link href="/locations" className="block border-t border-white/70 bg-white/45 px-4 py-2.5 text-center text-[11px] font-bold text-gold-700">عرض كل المحاكم والجهات الحكومية</Link>
    </div>
  );

  const lawyerList = (
    <div className="w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-xl ring-1 ring-white/70 backdrop-blur-2xl">
      <ul className="max-h-80 overflow-y-auto py-1.5">{[...lawyers].sort((a, b) => Number(b.isPrincipal) - Number(a.isPrincipal)).map((l) => <li key={l.id}><Link href={`/lawyers/${l.slug}`} className="flex items-center gap-3 px-4 py-2"><Avatar name={l.name} src={l.photo} size={28} /><span className="min-w-0"><span className="block truncate text-[13px] font-medium text-[#1D2433]">{l.isPrincipal ? 'Dr.Hossam Loutfi' : l.name}</span><span className="block text-[10px] font-semibold text-[#5B6B84]">{TITLE_LABEL[l.title]}</span></span></Link></li>)}</ul>
      <Link href="/lawyers" className="block border-t border-white/70 bg-white/45 px-4 py-2.5 text-center text-[11px] font-bold text-gold-700">عرض كل المحامين</Link>
    </div>
  );

  const loginLink = <Link href="/auth" prefetch={false} className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold text-navy-400"><KeyRound size={12} /><span className="hidden sm:inline">تسجيل دخول</span></Link>;
  const isAdmin = Boolean(session && (session.role === 'admin' || session.isAdmin));

  return (
    <header ref={wrapRef} className="site-floating-nav glass-light fixed left-1/2 top-2 z-50 w-[calc(100%-1rem)] max-w-[1440px] -translate-x-1/2 overflow-visible border border-white/70 text-navy-950 sm:top-3 sm:w-[calc(100%-2rem)] lg:top-4 lg:w-[calc(100%-3rem)]">
      <span aria-hidden className="gold-hairline pointer-events-none absolute inset-x-5 bottom-0 opacity-50 sm:inset-x-8" />
      <div className="relative mx-auto flex min-h-[58px] w-full items-center gap-1 px-2.5 py-2 sm:min-h-[64px] sm:gap-2 sm:px-4 sm:py-0 lg:gap-3 lg:px-6">
        <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-navy-400 lg:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="القائمة">{mobileOpen ? <X size={18} /> : <Menu size={18} />}</button>
        <Link href="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-[13px] font-semibold text-white shadow-glow-gold sm:h-10 sm:w-10 sm:text-[15px]">HL</span><span className="hidden min-w-0 flex-col items-center text-center sm:flex"><span className="block max-w-[130px] truncate text-[12px] tracking-[1px] text-navy-950 md:max-w-none md:text-[15px] md:tracking-[2px]">Dr.Hossam Loutfi</span><span className="hidden text-[9px] font-bold tracking-[3px] text-gold-600 uppercase md:block">LAW FIRM</span></span></Link>
        <form onSubmit={doSearch} className="mx-auto hidden min-w-0 max-w-[300px] flex-1 xl:flex"><div className="relative w-full"><Search size={13} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-navy-300" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن محكمة، مكان، محامٍ…" className="h-9 w-full rounded-full border border-white/80 bg-white/60 ps-9 pe-3.5 text-[12px] text-navy-900 shadow-soft backdrop-blur-md" /></div></form>
        <nav className="hidden min-w-0 items-center gap-0.5 lg:flex xl:gap-1"><div className="relative"><button onClick={() => setDropdown((d) => d === 'locations' ? null : 'locations')} className={navLinkStyle(isActive('/locations'))}>المحاكم والجهات الحكومية<ChevronDown size={10} /></button>{dropdown === 'locations' && <div className="absolute end-0 top-full pt-3">{locationList}</div>}</div><div className="relative"><button onClick={() => setDropdown((d) => d === 'lawyers' ? null : 'lawyers')} className={navLinkStyle(isActive('/lawyers'))}>المحامون<ChevronDown size={10} /></button>{dropdown === 'lawyers' && <div className="absolute end-0 top-full pt-3">{lawyerList}</div>}</div><Link href="/calendar" className={navLinkStyle(isActive('/calendar'))}>التقويم</Link><Link href="/search" className={navLinkStyle(isActive('/search'))}>البحث</Link></nav>
        <div className="ms-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">{session && <NotificationBell unread={unread} />}{!session ? loginLink : isAdmin ? <div className="flex items-center gap-1 sm:gap-2"><Link href="/admin" className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-semibold text-navy-600"><LayoutDashboard size={14} className="text-gold-600" /><span className="hidden sm:inline">الإدارة</span></Link><Link href="/cases/archive" className="hidden shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-semibold text-navy-600 sm:flex"><Archive size={14} className="text-gold-600" />أرشيف القضايا</Link><button onClick={logout} className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-bold text-navy-400"><LogOut size={14} /><span className="hidden sm:inline">تسجيل الخروج</span></button></div> : <div className="flex items-center gap-1"><Link href={`/lawyers/${session.slug}`} className="flex min-w-0 items-center gap-2 rounded-full px-2 py-1.5 text-[11px] font-semibold text-navy-600"><UserCircle2 size={14} className="shrink-0 text-gold-600" /><span className="hidden max-w-[120px] truncate sm:inline">{session.name}</span></Link><button onClick={logout} className="rounded-full p-2 text-navy-300" aria-label="تسجيل الخروج"><LogOut size={14} /></button></div>}</div>
      </div>
      {mobileOpen && <div className="border-t border-white/50 bg-white/60 backdrop-blur-2xl lg:hidden"><div className="max-h-[calc(100dvh-78px)] space-y-4 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5"><form onSubmit={doSearch} className="flex items-center gap-2"><div className="relative min-w-0 flex-1"><Search size={13} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-navy-300" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث..." className="h-10 w-full rounded-full border border-white/70 bg-white/70 ps-9 pe-3 text-[12px] backdrop-blur-xl" /></div></form><div className="grid gap-2"><Link href="/locations" className={navLinkStyle(isActive('/locations'))}>المحاكم والجهات الحكومية</Link><Link href="/lawyers" className={navLinkStyle(isActive('/lawyers'))}>المحامون</Link><Link href="/calendar" className={navLinkStyle(isActive('/calendar'))}>التقويم</Link><Link href="/search" className={navLinkStyle(isActive('/search'))}>البحث</Link>{isAdmin && <><Link href="/admin" className={navLinkStyle(isActive('/admin'))}>الإدارة</Link><Link href="/cases/archive" className={navLinkStyle(isActive('/cases/archive'))}>أرشيف القضايا</Link></>}{!session ? loginLink : <button onClick={logout} className={cn(navLinkStyle(false), 'w-full justify-center text-red-600')}>تسجيل الخروج</button>}</div></div></div>}
    </header>
  );
}
