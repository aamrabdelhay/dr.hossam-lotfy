'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Landmark,
  CalendarDays,
  Search,
  ShieldCheck,
  BookOpenText,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type SideNavProps = {
  role: 'admin' | 'lawyer' | null;
};

const ADMIN_ITEMS = [
  { n: '01', label: 'OVERVIEW', href: '/', icon: LayoutDashboard },
  { n: '02', label: 'SESSIONS', href: '/sessions', icon: CalendarClock },
  { n: '03', label: 'ATTORNEYS', href: '/lawyers', icon: Users },
  { n: '04', label: 'LOCATIONS', href: '/locations', icon: Landmark },
  { n: '05', label: 'CALENDAR', href: '/calendar', icon: CalendarDays },
  { n: '06', label: 'SEARCH', href: '/search', icon: Search },
  { n: '07', label: 'ADMIN', href: '/admin', icon: ShieldCheck },
];

const LAWYER_ITEMS = [
  ...ADMIN_ITEMS.slice(0, 6),
  { n: '07', label: 'GUIDE', href: '/lawyer-guide', icon: BookOpenText },
];

/**
 * LEGAL COMMAND CENTER — numbered operations rail (01–07) with the system
 * status block pinned to the bottom. Desktop only; mobile uses BottomNav.
 */
export function SideNav({ role }: SideNavProps) {
  const pathname = usePathname() ?? '/';
  const items = role === 'admin' ? ADMIN_ITEMS : LAWYER_ITEMS;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-[200px] flex-col border-e border-white/[0.06] bg-navy-950/85 backdrop-blur-xl xl:flex">
      <nav className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-3" aria-label="القائمة الرئيسية">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.n}
              href={item.href}
              className={cn(
                'group flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-all duration-150',
                active
                  ? 'bg-gold-500/[0.08] text-gold-500 ring-1 ring-inset ring-gold-500/25'
                  : 'text-navy-300 hover:bg-white/[0.04] hover:text-ivory-100',
              )}
            >
              <span
                className={cn(
                  'w-7 shrink-0 font-mono text-[10px] font-semibold tracking-widest transition-colors',
                  active ? 'text-gold-500' : 'text-navy-400 group-hover:text-gold-500',
                )}
              >
                {item.n}
              </span>
              <Icon size={14} strokeWidth={2} className={cn('shrink-0', active ? 'text-gold-500' : 'text-navy-400')} />
              <span className="font-mono text-[10.5px] font-semibold tracking-[0.14em]">{item.label}</span>
              {active && <span className="ms-auto h-1.5 w-1.5 rounded-full bg-gold-500 signal-live" />}
            </Link>
          );
        })}
      </nav>

      {/* System status block */}
      <div className="border-t border-white/[0.06] p-4">
        <p className="font-mono text-[9px] font-semibold tracking-[0.28em] text-navy-400">SYSTEM</p>
        <p className="mt-2 flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.14em] text-ivory-200">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-500 opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-500" />
          </span>
          ONLINE
        </p>
        <p className="mt-1.5 font-mono text-[9px] tracking-[0.2em] text-navy-400">VERSION 2.0</p>
      </div>
    </aside>
  );
}
