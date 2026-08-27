'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { KeyRound, LogOut, Menu, X, Landmark, Users, CalendarClock, Search, CalendarDays, BookOpenText, ShieldCheck } from 'lucide-react';
import { Avatar } from './ui';
import { NotificationBell } from './notification-bell';
import { CommandPaletteTrigger } from './command-palette';
import { cn } from '@/lib/cn';

type NavbarProps = {
  session: { role: 'admin' | 'lawyer'; name: string; slug?: string; photo?: string | null } | null;
  unread: number;
};

const MOBILE_LINKS = [
  { label: 'الرئيسية', href: '/', icon: null },
  { label: 'الجلسات', href: '/sessions', icon: CalendarClock },
  { label: 'المحامون', href: '/lawyers', icon: Users },
  { label: 'المحاكم والأماكن', href: '/locations', icon: Landmark },
  { label: 'التقويم', href: '/calendar', icon: CalendarDays },
  { label: 'البحث', href: '/search', icon: Search },
  { label: 'دليل المحامي', href: '/lawyer-guide', icon: BookOpenText },
  { label: 'الإشعارات', href: '/notifications', icon: null },
];

/**
 * LEGAL COMMAND CENTER — slim top command bar. Navigation lives in the
 * numbered SideNav (desktop) and BottomNav (mobile); this bar carries the
 * monogram, the ⌘K command palette trigger, notifications and identity.
 */
export function Navbar({ session, unread }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [userOpen, setUserOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
    setUserOpen(false);
  }, [pathname]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
    router.push('/');
  };

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/[0.06]" ref={wrapRef}>
      <span aria-hidden className="gold-hairline absolute inset-x-0 bottom-0 opacity-40" />
      <div className="relative mx-auto flex h-16 max-w-[1440px] items-center gap-2.5 px-4 sm:gap-3 sm:px-6">
        {/* Mobile menu button */}
        <button
          className="rounded-lg p-2 text-navy-300 transition-colors hover:bg-white/[0.06] hover:text-ivory-100 xl:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="القائمة"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Monogram + wordmark */}
        <Link href="/" className="group flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold-500/40 bg-gold-500/10 font-mono text-[13px] font-bold text-gold-500 transition-shadow group-hover:shadow-glow-gold">
            HL
          </span>
          <span className="block min-w-0 leading-none">
            <span className="block truncate font-mono text-[11.5px] font-semibold tracking-[0.18em] text-ivory-50">
              DR. HOSSAM LOTFY
            </span>
            <span className="mt-1 block font-mono text-[8.5px] font-semibold tracking-[0.32em] text-gold-500">
              LAW FIRM
            </span>
          </span>
        </Link>

        <span className="hidden h-6 w-px bg-white/10 sm:block" />
        <p className="hidden font-mono text-[9.5px] font-semibold tracking-[0.26em] text-navy-400 sm:block">
          LEGAL COMMAND CENTER
        </p>

        {/* Command palette trigger */}
        <div className="ms-auto">
          <CommandPaletteTrigger />
        </div>

        {/* Notifications */}
        <NotificationBell unread={unread} />

        {/* Identity / login */}
        {session ? (
          <div className="relative">
            <button
              onClick={() => setUserOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] py-1 pe-2.5 ps-1 transition-colors hover:border-gold-500/40"
              aria-label="حسابي"
            >
              <Avatar name={session.name} src={session.photo} size={24} />
              <span className="hidden max-w-[110px] truncate text-[11px] font-bold text-ivory-200 md:block">
                {session.name}
              </span>
            </button>
            {userOpen && (
              <div className="absolute end-0 top-full w-56 pt-2">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-navy-900 shadow-lift">
                  {session.role === 'lawyer' && session.slug && (
                    <Link
                      href={`/lawyers/${session.slug}`}
                      className="block border-b border-white/[0.06] px-4 py-3 text-[12px] font-bold text-ivory-200 transition-colors hover:bg-white/[0.04]"
                    >
                      صفحتي الشخصية
                    </Link>
                  )}
                  {session.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3 text-[12px] font-bold text-ivory-200 transition-colors hover:bg-white/[0.04]"
                    >
                      <ShieldCheck size={13} className="text-gold-500" />
                      منطقة الإدارة
                    </Link>
                  )}
                  <button
                    onClick={() => void logout()}
                    className="flex w-full items-center gap-2 px-4 py-3 text-[12px] font-bold text-crit transition-colors hover:bg-white/[0.04]"
                  >
                    <LogOut size={13} />
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/api/auth/login"
            prefetch={false}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-gold-500 px-3.5 text-[11.5px] font-extrabold text-navy-950 shadow-glow-gold transition-all hover:bg-gold-400 active:scale-[0.98]"
          >
            <KeyRound size={13} />
            <span className="hidden sm:inline">دخول الإدارة</span>
          </Link>
        )}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="max-h-[calc(100vh-64px)] overflow-y-auto overscroll-contain border-t border-white/[0.06] bg-navy-950/95 backdrop-blur-xl xl:hidden [scrollbar-gutter:stable]">
          <div className="space-y-1 px-4 py-4">
            {MOBILE_LINKS.map((l) => {
              const active = l.href === '/' ? pathname === '/' : pathname?.startsWith(l.href);
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-[12.5px] font-bold transition-colors',
                    active ? 'bg-gold-500/[0.08] text-gold-500' : 'text-ivory-200 hover:bg-white/[0.04] hover:text-ivory-50',
                  )}
                >
                  {Icon && <Icon size={15} className={active ? 'text-gold-500' : 'text-navy-400'} />}
                  {l.label}
                </Link>
              );
            })}
            <div className="mt-2 border-t border-white/[0.06] pt-3">
              {session ? (
                <div className="flex items-center gap-3 px-3 py-1">
                  <Avatar name={session.name} src={session.photo} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-bold text-ivory-100">{session.name}</span>
                    <span className="block text-[10px] font-semibold text-navy-400">
                      {session.role === 'admin' ? 'إدارة المكتب' : 'محامٍ بالمكتب'}
                    </span>
                  </span>
                  <button
                    onClick={() => void logout()}
                    className="rounded-lg p-2 text-navy-300 transition-colors hover:bg-white/[0.06] hover:text-crit"
                    aria-label="تسجيل الخروج"
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              ) : (
                <Link
                  href="/api/auth/login"
                  prefetch={false}
                  className="flex items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-3 text-[12.5px] font-extrabold text-navy-950"
                >
                  <KeyRound size={14} />
                  دخول الإدارة بمفتاح واحد
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
