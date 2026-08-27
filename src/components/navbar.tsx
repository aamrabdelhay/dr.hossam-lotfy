'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Landmark,
  Scale,
  KeyRound,
  LogOut,
  Menu,
  X,
  CalendarClock,
  UserCircle2,
  ChevronDown,
} from 'lucide-react';
import { Avatar } from './ui';
import { NotificationBell } from './notification-bell';
import { cn } from '@/lib/cn';
import type { NavLawyer, NavLocation } from '@/lib/constants';
import { LOCATION_TYPE_LABEL, TITLE_LABEL } from '@/lib/constants';

type NavbarProps = {
  lawyers: NavLawyer[];
  locations: NavLocation[];
  session: { role: 'admin' | 'lawyer'; name: string; slug?: string; photo?: string | null } | null;
  unread: number;
};

export function Navbar({ lawyers, locations, session, unread }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [dropdown, setDropdown] = React.useState<'locations' | 'lawyers' | null>(null);
  const [q, setQ] = React.useState('');
  const [type, setType] = React.useState<'court' | 'location' | 'lawyer'>('court');
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setDropdown(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
    setDropdown(null);
  }, [pathname]);

  const doSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const term = q.trim();
    const params = new URLSearchParams();
    if (term) params.set('q', term);
    params.set('type', type);
    router.push(`/search?${params.toString()}`);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
    router.push('/');
  };

  const courts = locations.filter((l) => l.type === 'COURT');
  const otherLocations = locations.filter((l) => l.type !== 'COURT');

  const isActive = (href: string) => {
    if (href === '/lawyers') return pathname?.startsWith('/lawyers');
    if (href === '/locations') return pathname?.startsWith('/locations');
    if (href === '/calendar') return pathname === '/calendar';
    if (href === '/search') return pathname === '/search';
    return pathname === href;
  };

  const navLinkStyle = (active: boolean) =>
    cn(
      'relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-all duration-200',
      'font-[\"IBM_Plex_Sans_Arabic\",sans-serif]',
      active
        ? 'bg-navy-900 text-white shadow-soft'
        : 'text-navy-500 hover:bg-navy-900/[0.06] hover:text-navy-900',
    );

  const locationList = (
    <div className="w-72 overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-lift ring-1 ring-navy-950/5">
      <p className="bg-[#0A101D] px-4 py-2.5 text-[10px] font-bold tracking-[1.5px] uppercase text-gold-300" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>المحاكم</p>
      <ul className="max-h-64 overflow-y-auto overscroll-contain py-1.5 [scrollbar-gutter:stable]">
        {courts.map((l) => (
          <li key={l.id}>
            <Link href={`/locations/${l.slug}`} className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#1D2433] transition-colors hover:bg-ivory-100" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
              <Landmark size={14} className="text-gold-600" />
              {l.name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="bg-ivory-100 px-4 py-2 text-[9px] font-bold tracking-[1.5px] uppercase text-[#5B6B84]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>الأماكن القانونية الأخرى</p>
      <ul className="max-h-48 overflow-y-auto overscroll-contain py-1.5 [scrollbar-gutter:stable]">
        {otherLocations.map((l) => (
          <li key={l.id}>
            <Link href={`/locations/${l.slug}`} className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#1D2433] transition-colors hover:bg-ivory-100" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
              <Scale size={14} className="text-[#5B6B84]" />
              {l.name}
              <span className="ms-auto rounded-full bg-ivory-100 px-2 py-0.5 text-[10px] font-bold text-[#5B6B84]">{LOCATION_TYPE_LABEL[l.type]}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/locations" className="block border-t border-navy-100 bg-ivory-50 px-4 py-2.5 text-center text-[11px] font-bold tracking-[0.5px] uppercase text-gold-700 transition-colors hover:bg-gold-500/10" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
        عرض كل المحاكم والأماكن
      </Link>
    </div>
  );

  const lawyerList = (
    <div className="w-72 overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-lift ring-1 ring-navy-950/5">
      <ul className="max-h-80 overflow-y-auto overscroll-contain py-1.5 [scrollbar-gutter:stable]">
        {[...lawyers]
          .sort((a, b) => Number(b.isPrincipal) - Number(a.isPrincipal))
          .map((l) => (
            <li key={l.id} className={cn(l.isPrincipal && 'bg-gold-500/[0.07]')}>
              <Link href={`/lawyers/${l.slug}`} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-ivory-100">
                <Avatar name={l.name} src={l.photo} size={28} />
                <span className="min-w-0">
                  <span className={cn('block truncate text-[13px] font-medium text-[#1D2433]')} style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{l.name}</span>
                  <span className="block text-[10px] font-semibold tracking-[0.5px] uppercase text-[#5B6B84]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{TITLE_LABEL[l.title]}</span>
                </span>
              </Link>
            </li>
          ))}
      </ul>
      <Link href="/lawyers" className="block border-t border-navy-100 bg-ivory-50 px-4 py-2.5 text-center text-[11px] font-bold tracking-[0.5px] uppercase text-gold-700 transition-colors hover:bg-gold-500/10" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
        عرض كل المحامين
      </Link>
    </div>
  );

  return (
    <header className="glass-light sticky top-0 z-50 border-b border-navy-100 text-navy-950 shadow-[0_4px_24px_-16px_rgba(5,8,15,0.25)]" ref={wrapRef}>
      <span aria-hidden className="gold-hairline absolute inset-x-0 bottom-0 opacity-60" />
      <div className="relative mx-auto flex h-[68px] max-w-[1440px] items-center gap-4 px-5 sm:px-6">
        {/* Mobile menu button */}
        <button
          className="rounded-full p-2 text-navy-400 transition-colors hover:bg-navy-900/[0.06] hover:text-navy-900 lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="القائمة"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Logo - monogram + DR. HOSSAM LOTFY / LAW FIRM (single instance — the sub-line
            is hidden on small screens instead of rendering a second copy) */}
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-[15px] font-semibold text-white shadow-glow-gold transition-transform duration-300 group-hover:scale-105"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}
          >
            HL
          </span>
          <span className="block min-w-0">
            <span
              className="block truncate text-[14px] tracking-[2px] text-navy-950 md:text-[15px]"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 500, fontVariant: 'small-caps', letterSpacing: '2px' }}
            >
              DR. HOSSAM LOTFY
            </span>
            <span
              className="hidden text-[9px] font-bold tracking-[3px] text-gold-600 uppercase md:block"
              style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '3px' }}
            >
              LAW FIRM
            </span>
          </span>
        </Link>

        {/* Desktop search - pill */}
        <form onSubmit={doSearch} className="mx-auto hidden w-full max-w-[340px] items-center gap-1.5 lg:flex">
          <div className="group relative flex-1">
            <Search size={13} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-navy-300 transition-colors group-focus-within:text-gold-600" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن محكمة، مكان، محامٍ…"
              className="h-9 w-full rounded-full border border-navy-200/80 bg-white ps-9 pe-3.5 text-[12px] text-navy-900 shadow-soft transition-all placeholder:text-navy-300 focus:border-gold-500/60 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
              style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
            />
          </div>
        </form>

        {/* Desktop nav - horizontal only */}
        <nav className="hidden items-center gap-1 lg:flex">
          <div className="relative">
            <button
              onClick={() => setDropdown((d) => (d === 'locations' ? null : 'locations'))}
              className={navLinkStyle(isActive('/locations'))}
            >
              المحاكم والأماكن
              <ChevronDown size={10} className={cn('transition-transform opacity-60', dropdown === 'locations' && 'rotate-180')} />
            </button>
            {dropdown === 'locations' && <div className="absolute end-0 top-full pt-3">{locationList}</div>}
          </div>
          <div className="relative">
            <button
              onClick={() => setDropdown((d) => (d === 'lawyers' ? null : 'lawyers'))}
              className={navLinkStyle(isActive('/lawyers'))}
            >
              المحامون
              <ChevronDown size={10} className={cn('transition-transform opacity-60', dropdown === 'lawyers' && 'rotate-180')} />
            </button>
            {dropdown === 'lawyers' && <div className="absolute end-0 top-full pt-3">{lawyerList}</div>}
          </div>
          <Link href="/calendar" className={navLinkStyle(isActive('/calendar'))}>
            التقويم
          </Link>
          <Link href="/search" className={navLinkStyle(isActive('/search'))}>
            البحث
          </Link>
          <Link href="/lawyer-guide" className={navLinkStyle(isActive('/lawyer-guide'))}>
            دليل المحامي
          </Link>
        </nav>

        {/* Right actions */}
        <div className="ms-auto flex items-center gap-2 lg:ms-4">
          {session && <NotificationBell unread={unread} />}

          {!session ? (
            <Link
              href="/api/auth/login" prefetch={false}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-navy-400 transition-colors hover:bg-navy-900/[0.06] hover:text-navy-900"
              style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
              title="دخول المسؤول"
            >
              <KeyRound size={12} />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          ) : session.role === 'admin' ? (
            <div className="flex items-center gap-2">
              <Link href="/admin" className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-semibold tracking-[1px] text-navy-600 transition-colors hover:bg-navy-900/[0.06] hover:text-navy-950" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <UserCircle2 size={14} className="text-gold-600" />
                <span className="hidden sm:inline">{session.name}</span>
              </Link>
              <button onClick={logout} className="rounded-full p-2 text-navy-300 transition-colors hover:bg-red-600/10 hover:text-red-600" aria-label="تسجيل الخروج">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link href={`/lawyers/${session.slug}`} className="flex items-center gap-2 rounded-full px-2 py-1.5 text-navy-600 transition-colors hover:bg-navy-900/[0.06] hover:text-navy-950">
                <UserCircle2 size={16} className="text-gold-600" />
                <span className="hidden max-w-32 truncate text-[11px] font-semibold tracking-[1px] sm:inline" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{session.name}</span>
              </Link>
              <button onClick={logout} className="rounded-full p-2 text-navy-300 transition-colors hover:bg-red-600/10 hover:text-red-600" aria-label="تسجيل الخروج">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="max-h-[calc(100dvh-68px)] overflow-y-auto overscroll-contain border-t border-navy-100 bg-white/95 backdrop-blur-xl lg:hidden [scrollbar-gutter:stable]">
          <div className="space-y-4 px-5 py-5">
            <form onSubmit={doSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ابحث..."
                  className="h-10 w-full rounded-full border border-navy-200/80 bg-white ps-9 pe-3 text-[12px] text-navy-900 shadow-soft transition-all placeholder:text-navy-300 focus:border-gold-500/60 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                  style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
                />
              </div>
              <button type="submit" className="h-10 shrink-0 rounded-full bg-gradient-to-b from-gold-400 to-gold-500 px-4 text-[11px] font-bold text-[#0A101D] transition-opacity hover:opacity-90" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                بحث
              </button>
            </form>
            <div className="grid grid-cols-1 gap-1">
              <Link href="/locations" className="flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-semibold text-navy-600 transition-colors hover:bg-ivory-100 hover:text-navy-950" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <Landmark size={15} className="text-gold-400/70" /> المحاكم والأماكن
              </Link>
              <Link href="/lawyers" className="flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-semibold text-navy-600 transition-colors hover:bg-ivory-100 hover:text-navy-950" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <Scale size={15} className="text-gold-400/70" /> المحامون
              </Link>
              <Link href="/calendar" className="flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-semibold text-navy-600 transition-colors hover:bg-ivory-100 hover:text-navy-950" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <CalendarClock size={15} className="text-gold-400/70" /> التقويم
              </Link>
              <Link href="/search" className="flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-semibold text-navy-600 transition-colors hover:bg-ivory-100 hover:text-navy-950" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <Search size={15} className="text-gold-400/70" /> البحث
              </Link>
              <Link href="/lawyer-guide" className="flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-semibold text-navy-600 transition-colors hover:bg-ivory-100 hover:text-navy-950" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <Landmark size={15} className="text-gold-400/70" /> دليل المحامي
              </Link>
              {!session && (
                <Link href="/api/auth/login" prefetch={false} className="flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-semibold text-navy-400 transition-colors hover:bg-ivory-100 hover:text-navy-950" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                  <KeyRound size={15} /> Admin Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
