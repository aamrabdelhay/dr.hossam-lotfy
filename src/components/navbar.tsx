'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Landmark,
  Scale,
  Bell,
  KeyRound,
  LogOut,
  Menu,
  X,
  CalendarClock,
  UserCircle2,
  ChevronDown,
} from 'lucide-react';
import { Avatar } from './ui';
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
  const [bellOpen, setBellOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [type, setType] = React.useState<'court' | 'location' | 'lawyer'>('court');
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setDropdown(null);
        setBellOpen(false);
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
    <div className="flex max-h-[min(75vh,520px)] w-80 flex-col overflow-hidden rounded-sm border border-[#E0D8CC] bg-[#F7F5F0] shadow-xl">
      <p className="shrink-0 bg-[#101C2C] px-4 py-2 text-[9px] font-medium tracking-[2px] uppercase text-white/70" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
        المحاكم ({courts.length})
      </p>
      <ul className="flex-1 overflow-y-auto overscroll-contain py-1 scrollbar-thin scrollbar-thumb-[#c9c2b2] scrollbar-track-transparent">
        {courts.map((l) => (
          <li key={l.id}>
            <Link href={`/locations/${l.slug}`} className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#242424] hover:bg-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
              <Landmark size={14} className="text-[#8A6A3A]" />
              <span className="truncate">{l.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="shrink-0 bg-[#EEEBE4] px-4 py-2 text-[9px] font-medium tracking-[2px] uppercase text-[#6B6B6B]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
        الأماكن القانونية الأخرى ({otherLocations.length})
      </p>
      <ul className="max-h-48 shrink-0 overflow-y-auto overscroll-contain border-t border-[#E0D8CC]/50 py-1 scrollbar-thin scrollbar-thumb-[#c9c2b2]">
        {otherLocations.map((l) => (
          <li key={l.id}>
            <Link href={`/locations/${l.slug}`} className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#242424] hover:bg-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
              <Scale size={14} className="text-[#6B6B6B]" />
              <span className="min-w-0 flex-1 truncate">{l.name}</span>
              <span className="ms-auto shrink-0 text-[10px] font-medium text-[#6B6B6B]">{LOCATION_TYPE_LABEL[l.type]}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/locations" className="block shrink-0 border-t border-[#E0D8CC] px-4 py-2.5 text-center text-[11px] tracking-[1px] uppercase text-[#8A6A3A] hover:bg-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
        عرض كل المحاكم والأماكن
      </Link>
    </div>
  );

  const lawyerList = (
    <div className="flex max-h-[min(70vh,480px)] w-80 flex-col overflow-hidden rounded-sm border border-[#E0D8CC] bg-[#F7F5F0] shadow-xl">
      <p className="shrink-0 bg-[#101C2C] px-4 py-2 text-[9px] font-medium tracking-[2px] uppercase text-white/70" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
        المحامون ({lawyers.length})
      </p>
      <ul className="flex-1 overflow-y-auto overscroll-contain py-1 scrollbar-thin scrollbar-thumb-[#c9c2b2]">
        {[...lawyers]
          .sort((a, b) => Number(b.isPrincipal) - Number(a.isPrincipal))
          .map((l) => (
            <li key={l.id} className={cn(l.isPrincipal && 'bg-[#8A6A3A]/[0.06]')}>
              <Link href={`/lawyers/${l.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white">
                <Avatar name={l.name} src={l.photo} size={32} />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[13px] font-medium text-[#242424]')} style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                    {l.name}
                  </span>
                  <span className="block text-[10px] tracking-[1px] uppercase text-[#6B6B6B]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                    {TITLE_LABEL[l.title]}
                  </span>
                </span>
              </Link>
            </li>
          ))}
      </ul>
      <Link href="/lawyers" className="block shrink-0 border-t border-[#E0D8CC] px-4 py-2.5 text-center text-[11px] tracking-[1px] uppercase text-[#8A6A3A] hover:bg-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
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

        {/* Logo */}
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

        {/* Desktop search */}
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

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          <div className="relative">
            <button
              onClick={() => setDropdown((d) => (d === 'locations' ? null : 'locations'))}
              className={navLinkStyle(isActive('/locations'))}
            >
              المحاكم والأماكن
              <ChevronDown size={10} className={cn('transition-transform opacity-60', dropdown === 'locations' && 'rotate-180')} />
            </button>
            {dropdown === 'locations' && <div className="absolute end-0 top-full z-50 pt-3">{locationList}</div>}
          </div>
          <div className="relative">
            <button
              onClick={() => setDropdown((d) => (d === 'lawyers' ? null : 'lawyers'))}
              className={navLinkStyle(isActive('/lawyers'))}
            >
              المحامون
              <ChevronDown size={10} className={cn('transition-transform opacity-60', dropdown === 'lawyers' && 'rotate-180')} />
            </button>
            {dropdown === 'lawyers' && <div className="absolute end-0 top-full z-50 pt-3">{lawyerList}</div>}
          </div>
          <Link href="/calendar" className={navLinkStyle(isActive('/calendar'))}>
            التقويم
          </Link>
          <Link href="/search" className={navLinkStyle(isActive('/search'))}>
            البحث
          </Link>
        </nav>

        {/* Right actions */}
        <div className="ms-auto flex items-center gap-2 lg:ms-4">
          {session && (
            <div className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative p-2 text-white/50 hover:text-white/80"
                aria-label="الإشعارات"
              >
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -start-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#641F2B] px-1 text-[8px] font-bold text-white">
                    {unread > 9 ? '+9' : unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute end-0 top-full z-50 w-64 pt-3">
                  <div className="overflow-hidden rounded-sm border border-[#E0D8CC] bg-[#F7F5F0] shadow-xl">
                    <p className="bg-[#101C2C] px-4 py-2 text-[9px] tracking-[2px] uppercase text-white/60" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                      الإشعارات
                    </p>
                    <Link href="/notifications" className="block px-4 py-5 text-center text-[11px] text-[#242424] hover:bg-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                      عرض كل الإشعارات ←
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {!session ? (
            <Link
              href="/admin/login"
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
                <span className="hidden max-w-32 truncate text-[11px] tracking-[1px] sm:inline" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                  {session.name}
                </span>
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
        <div className="border-t border-white/10 bg-[#101C2C] lg:hidden">
          <div className="flex max-h-[80vh] flex-col overflow-hidden px-6 py-5">
            <form onSubmit={doSearch} className="mb-4 flex shrink-0 items-center gap-2">
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
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="grid grid-cols-1 gap-1">
                <Link href="/locations" className="flex items-center gap-3 px-3 py-3 text-[11px] tracking-[1.5px] uppercase text-white/60 hover:bg-white/5 hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                  <Landmark size={14} className="text-white/30" /> المحاكم والأماكن
                </Link>
                <Link href="/lawyers" className="flex items-center gap-3 px-3 py-3 text-[11px] tracking-[1.5px] uppercase text-white hover:bg-white/5" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                  <Scale size={14} className="text-white/60" /> المحامون
                </Link>
                <Link href="/calendar" className="flex items-center gap-3 px-3 py-3 text-[11px] tracking-[1.5px] uppercase text-white/60 hover:bg-white/5 hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                  <CalendarClock size={14} className="text-white/30" /> التقويم
                </Link>
                <Link href="/search" className="flex items-center gap-3 px-3 py-3 text-[11px] tracking-[1.5px] uppercase text-white/60 hover:bg-white/5 hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                  <Search size={14} className="text-white/30" /> البحث
                </Link>
                {!session && (
                  <Link href="/admin/login" className="flex items-center gap-3 px-3 py-3 text-[11px] tracking-[1.5px] uppercase text-white/40 hover:bg-white/5 hover:text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                    <KeyRound size={14} /> Admin Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
