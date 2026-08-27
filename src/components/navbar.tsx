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
      'relative inline-flex items-center gap-1.5 px-3 py-2 text-[11px] tracking-[1.5px] uppercase transition-colors',
      'font-[\"IBM_Plex_Sans_Arabic\",sans-serif]',
      active
        ? 'text-white border-b border-[#641F2B]'
        : 'text-white/50 hover:text-white/80',
    );

  const locationList = (
    <div className="w-72 overflow-hidden rounded-sm border border-[#E0D8CC] bg-[#F7F5F0] shadow-xl">
      <p className="bg-[#101C2C] px-4 py-2 text-[9px] font-medium tracking-[2px] uppercase text-white/70" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>المحاكم</p>
      <ul className="max-h-64 overflow-y-auto overscroll-contain py-1 [scrollbar-gutter:stable]">
        {courts.map((l) => (
          <li key={l.id}>
            <Link href={`/locations/${l.slug}`} className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#242424] hover:bg-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
              <Landmark size={14} className="text-[#8A6A3A]" />
              {l.name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="bg-[#EEEBE4] px-4 py-2 text-[9px] font-medium tracking-[2px] uppercase text-[#6B6B6B]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>الأماكن القانونية الأخرى</p>
      <ul className="max-h-48 overflow-y-auto overscroll-contain py-1 [scrollbar-gutter:stable]">
        {otherLocations.map((l) => (
          <li key={l.id}>
            <Link href={`/locations/${l.slug}`} className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#242424] hover:bg-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
              <Scale size={14} className="text-[#6B6B6B]" />
              {l.name}
              <span className="ms-auto text-[10px] font-medium text-[#6B6B6B]">{LOCATION_TYPE_LABEL[l.type]}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/locations" className="block border-t border-[#E0D8CC] px-4 py-2.5 text-center text-[11px] tracking-[1px] uppercase text-[#8A6A3A] hover:bg-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
        عرض كل المحاكم والأماكن
      </Link>
    </div>
  );

  const lawyerList = (
    <div className="w-72 overflow-hidden rounded-sm border border-[#E0D8CC] bg-[#F7F5F0] shadow-xl">
      <ul className="max-h-80 overflow-y-auto overscroll-contain py-1 [scrollbar-gutter:stable]">
        {[...lawyers]
          .sort((a, b) => Number(b.isPrincipal) - Number(a.isPrincipal))
          .map((l) => (
            <li key={l.id} className={cn(l.isPrincipal && 'bg-[#8A6A3A]/[0.06]')}>
              <Link href={`/lawyers/${l.slug}`} className="flex items-center gap-3 px-4 py-2 hover:bg-white">
                <Avatar name={l.name} src={l.photo} size={28} />
                <span className="min-w-0">
                  <span className={cn('block truncate text-[13px] font-medium text-[#242424]')} style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{l.name}</span>
                  <span className="block text-[10px] tracking-[1px] uppercase text-[#6B6B6B]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{TITLE_LABEL[l.title]}</span>
                </span>
              </Link>
            </li>
          ))}
      </ul>
      <Link href="/lawyers" className="block border-t border-[#E0D8CC] px-4 py-2.5 text-center text-[11px] tracking-[1px] uppercase text-[#8A6A3A] hover:bg-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
        عرض كل المحامين
      </Link>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-[#18263A] bg-[#101C2C] text-white" ref={wrapRef} style={{ backgroundColor: '#101C2C' }}>
      <div className="mx-auto flex h-[64px] max-w-[1440px] items-center gap-4 px-6">
        {/* Mobile menu button */}
        <button
          className="rounded-sm p-2 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="القائمة"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Logo - DR. HOSSAM LOTFY / LAW FIRM (single instance — the sub-line
            is hidden on small screens instead of rendering a second copy) */}
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="block min-w-0">
            <span
              className="block truncate text-[14px] tracking-[2px] text-white md:text-[15px]"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 400, fontVariant: 'small-caps', letterSpacing: '2px' }}
            >
              DR. HOSSAM LOTFY
            </span>
            <span
              className="hidden text-[9px] tracking-[3px] text-white/60 uppercase md:block"
              style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '3px' }}
            >
              LAW FIRM
            </span>
          </span>
        </Link>

        {/* Desktop search - minimal */}
        <form onSubmit={doSearch} className="mx-auto hidden w-full max-w-[320px] items-center gap-1.5 lg:flex">
          <div className="relative flex-1">
            <Search size={12} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث..."
              className="h-8 w-full rounded-none border border-white/10 bg-[#18263A] ps-7 pe-2 text-[11px] tracking-[1px] text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] tracking-[1.5px] uppercase text-white/50 hover:text-white"
              style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
              title="دخول المسؤول"
            >
              <KeyRound size={12} />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          ) : session.role === 'admin' ? (
            <div className="flex items-center gap-2">
              <Link href="/admin" className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] tracking-[1px] text-white/70 hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <UserCircle2 size={14} className="text-white/40" />
                <span className="hidden sm:inline">{session.name}</span>
              </Link>
              <button onClick={logout} className="p-2 text-white/30 hover:text-white/70" aria-label="تسجيل الخروج">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link href={`/lawyers/${session.slug}`} className="flex items-center gap-2 px-2 py-1.5 text-white/60 hover:text-white">
                <UserCircle2 size={16} className="text-white/40" />
                <span className="hidden max-w-32 truncate text-[11px] tracking-[1px] sm:inline" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{session.name}</span>
              </Link>
              <button onClick={logout} className="p-2 text-white/30 hover:text-white/70" aria-label="تسجيل الخروج">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="max-h-[calc(100dvh-64px)] overflow-y-auto overscroll-contain border-t border-white/10 bg-[#101C2C] lg:hidden [scrollbar-gutter:stable]">
          <div className="space-y-4 px-6 py-5">
            <form onSubmit={doSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ابحث..."
                  className="h-9 w-full rounded-none border border-white/10 bg-[#18263A] ps-7 pe-3 text-[12px] text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
                  style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
                />
              </div>
              <button type="submit" className="h-9 shrink-0 bg-white px-4 text-[11px] tracking-[1px] uppercase text-[#101C2C]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                بحث
              </button>
            </form>
            <div className="grid grid-cols-1 gap-1">
              <Link href="/locations" className="flex items-center gap-3 px-3 py-3 text-[11px] tracking-[1.5px] uppercase text-white/60 hover:text-white hover:bg-white/5" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <Landmark size={14} className="text-white/30" /> المحاكم والأماكن
              </Link>
              <Link href="/lawyers" className="flex items-center gap-3 px-3 py-3 text-[11px] tracking-[1.5px] uppercase text-white border-b border-[#641F2B]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <Scale size={14} className="text-white/60" /> المحامون
              </Link>
              <Link href="/calendar" className="flex items-center gap-3 px-3 py-3 text-[11px] tracking-[1.5px] uppercase text-white/60 hover:text-white hover:bg-white/5" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <CalendarClock size={14} className="text-white/30" /> التقويم
              </Link>
              <Link href="/search" className="flex items-center gap-3 px-3 py-3 text-[11px] tracking-[1.5px] uppercase text-white/60 hover:text-white hover:bg-white/5" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <Search size={14} className="text-white/30" /> البحث
              </Link>
              <Link href="/lawyer-guide" className="flex items-center gap-3 px-3 py-3 text-[11px] tracking-[1.5px] uppercase text-white/60 hover:text-white hover:bg-white/5" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                <Landmark size={14} className="text-white/30" /> دليل المحامي
              </Link>
              {!session && (
                <Link href="/api/auth/login" prefetch={false} className="flex items-center gap-3 px-3 py-3 text-[11px] tracking-[1.5px] uppercase text-white/40 hover:text-white hover:bg-white/5" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                  <KeyRound size={14} /> Admin Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
