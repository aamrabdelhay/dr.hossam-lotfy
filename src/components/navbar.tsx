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
import {Avatar} from './ui';import { cn } from '@/lib/cn';
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

  const locationList = (
    <div className="w-72 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-xl">
      <p className="bg-navy-950 px-4 py-2 text-[11px] font-bold tracking-wide text-gold-300">المحاكم</p>
      <ul className="max-h-64 overflow-y-auto py-1">
        {courts.map((l) => (
          <li key={l.id}>
            <Link href={`/locations/${l.slug}`} className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-semibold text-navy-800 hover:bg-ivory-100">
              <Landmark size={15} className="text-gold-600" />
              {l.name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="bg-ivory-100 px-4 py-2 text-[11px] font-bold tracking-wide text-navy-500">الأماكن القانونية الأخرى</p>
      <ul className="max-h-48 overflow-y-auto py-1">
        {otherLocations.map((l) => (
          <li key={l.id}>
            <Link href={`/locations/${l.slug}`} className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-semibold text-navy-800 hover:bg-ivory-100">
              <Scale size={15} className="text-navy-300" />
              {l.name}
              <span className="ms-auto text-[10px] font-medium text-navy-300">{LOCATION_TYPE_LABEL[l.type]}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/locations" className="block border-t border-navy-100 px-4 py-2.5 text-center text-[12px] font-bold text-gold-700 hover:bg-ivory-100">
        عرض كل المحاكم والأماكن
      </Link>
    </div>
  );

  const lawyerList = (
    <div className="w-72 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-xl">
      <ul className="max-h-80 overflow-y-auto py-1">
        {[...lawyers]
          .sort((a, b) => Number(b.isPrincipal) - Number(a.isPrincipal))
          .map((l) => (
            <li key={l.id} className={cn(l.isPrincipal && 'bg-gold-500/[0.07]')}>
              <Link href={`/lawyers/${l.slug}`} className="flex items-center gap-3 px-4 py-2 hover:bg-ivory-100">
                <Avatar name={l.name} src={l.photo} size={30} />
                <span className="min-w-0">
                  <span className={cn('block truncate text-[13px] font-bold text-navy-900', l.isPrincipal && 'text-navy-950')}>{l.name}</span>
                  <span className="block text-[11px] text-navy-300">{TITLE_LABEL[l.title]}</span>
                </span>
              </Link>
            </li>
          ))}
      </ul>
      <Link href="/lawyers" className="block border-t border-navy-100 px-4 py-2.5 text-center text-[12px] font-bold text-gold-700 hover:bg-ivory-100">
        عرض كل المحامين
      </Link>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-gold-500/25 bg-navy-950 text-ivory-100 shadow-[0_2px_12px_rgba(7,17,28,0.35)]" ref={wrapRef}>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        {/* Mobile menu button */}
        <button
          className="rounded-md p-2 text-ivory-200 hover:bg-white/10 lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="القائمة"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Logo + name */}
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md ring-1 ring-gold-500/40 sm:h-11 sm:w-11">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="DR. HOSSAM LOTFY LAW FIRM" className="h-full w-full object-cover" />
          </span>
          <span className="hidden min-w-0 md:block">
            <span className="block truncate font-latin text-[15px] font-bold tracking-wide text-ivory-50">DR. HOSSAM LOTFY</span>
            <span className="block text-[11px] font-semibold text-gold-400">مكتب المحاماة — نظام إدارة العمليات</span>
          </span>
        </Link>

        {/* Desktop search */}
        <form onSubmit={doSearch} className="mx-auto hidden w-full max-w-md items-center gap-1.5 lg:flex">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="h-9 shrink-0 rounded-md border border-white/10 bg-navy-900 px-2 text-[12px] font-semibold text-ivory-200 focus:outline-none focus:ring-1 focus:ring-gold-500"
            aria-label="نوع البحث"
          >
            <option value="court">محكمة</option>
            <option value="location">مكان</option>
            <option value="lawyer">محامي</option>
          </select>
          <div className="relative flex-1">
            <Search size={15} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={type === 'lawyer' ? 'ابحث عن محامي…' : type === 'court' ? 'ابحث عن محكمة…' : 'ابحث عن مكان…'}
              className="h-9 w-full rounded-md border border-white/10 bg-navy-900 ps-8 pe-3 text-[13px] text-ivory-100 placeholder:text-navy-300 focus:border-gold-500/60 focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
          </div>
          <button type="submit" className="h-9 shrink-0 rounded-md bg-gold-500 px-3 text-[12px] font-bold text-navy-950 hover:bg-gold-400">
            بحث
          </button>
        </form>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          <div className="relative">
            <button
              onClick={() => setDropdown((d) => (d === 'locations' ? null : 'locations'))}
              className={cn('flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-bold hover:bg-white/10', dropdown === 'locations' && 'bg-white/10')}
            >
              <Landmark size={15} className="text-gold-400" />
              المحاكم والأماكن
              <ChevronDown size={13} className={cn('transition-transform', dropdown === 'locations' && 'rotate-180')} />
            </button>
            {dropdown === 'locations' && <div className="absolute end-0 top-full pt-2">{locationList}</div>}
          </div>
          <div className="relative">
            <button
              onClick={() => setDropdown((d) => (d === 'lawyers' ? null : 'lawyers'))}
              className={cn('flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-bold hover:bg-white/10', dropdown === 'lawyers' && 'bg-white/10')}
            >
              <Scale size={15} className="text-gold-400" />
              المحامون
              <ChevronDown size={13} className={cn('transition-transform', dropdown === 'lawyers' && 'rotate-180')} />
            </button>
            {dropdown === 'lawyers' && <div className="absolute end-0 top-full pt-2">{lawyerList}</div>}
          </div>
          <Link href="/calendar" className={cn('flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-bold hover:bg-white/10', pathname === '/calendar' && 'bg-white/10')}>
            <CalendarClock size={15} className="text-gold-400" />
            التقويم
          </Link>
        </nav>

        {/* Right actions */}
        <div className="ms-auto flex items-center gap-1.5 lg:ms-2">
          {/* Notifications */}
          {session && (
            <div className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative rounded-md p-2 text-ivory-200 hover:bg-white/10"
                aria-label="الإشعارات"
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -start-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[9px] font-bold text-navy-950">
                    {unread > 9 ? '+9' : unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute end-0 top-full w-72 pt-2">
                  <div className="overflow-hidden rounded-xl border border-navy-100 bg-white shadow-xl">
                    <p className="bg-navy-950 px-4 py-2 text-[11px] font-bold text-gold-300">الإشعارات</p>
                    <Link href="/notifications" className="block px-4 py-6 text-center text-[12px] font-bold text-navy-500 hover:bg-ivory-100">
                      عرض كل الإشعارات ←
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin key / user menu */}
          {!session ? (
            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 rounded-md border border-gold-500/40 bg-gold-500/10 px-2.5 py-1.5 text-[12px] font-bold text-gold-300 hover:bg-gold-500/20"
              title="دخول المسؤول"
            >
              <KeyRound size={14} />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          ) : session.role === 'admin' ? (
            <div className="flex items-center gap-2">
              <Link href="/admin" className="flex items-center gap-2 rounded-md border border-gold-500/40 bg-gold-500/10 px-2.5 py-1.5 text-[12px] font-bold text-gold-300 hover:bg-gold-500/20">
                <UserCircle2 size={15} />
                <span className="hidden sm:inline">{session.name}</span>
              </Link>
              <button onClick={logout} className="rounded-md p-2 text-ivory-300 hover:bg-white/10" aria-label="تسجيل الخروج">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link href={`/lawyers/${session.slug}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/10">
                <UserCircle2 size={17} className="text-gold-400" />
                <span className="hidden max-w-32 truncate text-[12px] font-bold sm:inline">{session.name}</span>
              </Link>
              <button onClick={logout} className="rounded-md p-2 text-ivory-300 hover:bg-white/10" aria-label="تسجيل الخروج">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-navy-950 lg:hidden animate-fade-in">
          <div className="space-y-4 px-4 py-4">
            <form onSubmit={doSearch} className="flex items-center gap-1.5">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="h-10 shrink-0 rounded-md border border-white/10 bg-navy-900 px-2 text-[12px] font-semibold text-ivory-200"
              >
                <option value="court">محكمة</option>
                <option value="location">مكان</option>
                <option value="lawyer">محامي</option>
              </select>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث…"
                className="h-10 w-full rounded-md border border-white/10 bg-navy-900 px-3 text-[13px] text-ivory-100 placeholder:text-navy-300 focus:border-gold-500/60 focus:outline-none"
              />
              <button type="submit" className="h-10 shrink-0 rounded-md bg-gold-500 px-3 text-[12px] font-bold text-navy-950">
                بحث
              </button>
            </form>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/locations" className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-[13px] font-bold text-ivory-100">
                <Landmark size={16} className="text-gold-400" /> المحاكم والأماكن
              </Link>
              <Link href="/lawyers" className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-[13px] font-bold text-ivory-100">
                <Scale size={16} className="text-gold-400" /> المحامون
              </Link>
              <Link href="/calendar" className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-[13px] font-bold text-ivory-100">
                <CalendarClock size={16} className="text-gold-400" /> التقويم
              </Link>
              {!session && (
                <Link href="/admin/login" className="flex items-center gap-2 rounded-lg bg-gold-500/15 px-3 py-2.5 text-[13px] font-bold text-gold-300">
                  <KeyRound size={16} /> Admin
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
