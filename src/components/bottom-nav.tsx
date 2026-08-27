'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarClock, Users, Landmark, CalendarDays, Search } from 'lucide-react';
import { useSessionsUI } from './sessions-ui';
import { cn } from '@/lib/cn';

const ITEMS = [
  { label: 'الرئيسية', href: '/', icon: LayoutDashboard },
  { label: 'الجلسات', href: '/sessions', icon: CalendarClock, drawer: true },
  { label: 'المحامون', href: '/lawyers', icon: Users },
  { label: 'الأماكن', href: '/locations', icon: Landmark },
  { label: 'التقويم', href: '/calendar', icon: CalendarDays },
  { label: 'البحث', href: '/search', icon: Search },
];

/** Mobile / tablet bottom navigation — mirrors the numbered SideNav. */
export function BottomNav() {
  const pathname = usePathname() ?? '/';
  const { setOpen } = useSessionsUI();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-white/[0.06] bg-navy-950/92 backdrop-blur-xl xl:hidden"
      aria-label="قائمة الجوال"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid max-w-[640px] grid-cols-6">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const cls = cn(
            'flex flex-col items-center gap-1 py-2.5 text-[9.5px] font-bold transition-colors',
            active ? 'text-gold-500' : 'text-navy-300 hover:text-ivory-100',
          );
          const inner = (
            <>
              <span className="relative">
                <Icon size={17} strokeWidth={2} />
                {active && <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-gold-500" />}
              </span>
              {item.label}
            </>
          );
          return item.drawer ? (
            <button key={item.label} type="button" onClick={() => setOpen(true)} className={cls}>
              {inner}
            </button>
          ) : (
            <Link key={item.label} href={item.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
