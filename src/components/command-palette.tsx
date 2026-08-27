'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft, ArrowUpDown, X, Landmark, Users, CalendarClock, LayoutDashboard, CalendarDays, BookOpenText, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

type PaletteEntry = {
  id: string;
  kind: 'link' | 'lawyer' | 'location' | 'session';
  label: string;
  sub?: string;
  href: string;
  icon?: React.ReactNode;
};

const QUICK_LINKS: PaletteEntry[] = [
  { id: 'link-overview', kind: 'link', label: 'نظرة عامة — OVERVIEW', href: '/', icon: <LayoutDashboard size={14} /> },
  { id: 'link-sessions', kind: 'link', label: 'الجلسات — SESSIONS', href: '/sessions', icon: <CalendarClock size={14} /> },
  { id: 'link-lawyers', kind: 'link', label: 'المحامون — ATTORNEYS', href: '/lawyers', icon: <Users size={14} /> },
  { id: 'link-locations', kind: 'link', label: 'المحاكم والأماكن — LOCATIONS', href: '/locations', icon: <Landmark size={14} /> },
  { id: 'link-calendar', kind: 'link', label: 'التقويم — CALENDAR', href: '/calendar', icon: <CalendarDays size={14} /> },
  { id: 'link-search', kind: 'link', label: 'البحث المتقدم — SEARCH', href: '/search', icon: <Search size={14} /> },
  { id: 'link-guide', kind: 'link', label: 'دليل المحامي — GUIDE', href: '/lawyer-guide', icon: <BookOpenText size={14} /> },
  { id: 'link-admin', kind: 'link', label: 'منطقة الإدارة — ADMIN', href: '/admin', icon: <ShieldCheck size={14} /> },
];

type SearchResults = {
  locations: Array<{ id: string; slug: string; name: string; type: string }>;
  lawyers: Array<{ id: string; slug: string; fullName: string; title: string }>;
  sessions: Array<{ id: string; description: string; scheduledDate: string | null; scheduledTime: string | null; location: { name: string } }>;
};

/**
 * LEGAL COMMAND CENTER — global command palette.
 * Open with ⌘K / Ctrl+K (or the header trigger). Searches everything through
 * the existing /api/search endpoint — no new APIs.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [results, setResults] = React.useState<SearchResults>({ locations: [], lawyers: [], sessions: [] });
  const [loading, setLoading] = React.useState(false);
  const [authMissing, setAuthMissing] = React.useState(false);
  const [idx, setIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Global ⌘K / Ctrl+K */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onEvent = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onEvent);
    };
  }, []);

  /* Focus input on open, lock scroll */
  React.useEffect(() => {
    if (open) {
      setQ('');
      setResults({ locations: [], lawyers: [], sessions: [] });
      setAuthMissing(false);
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  /* Debounced search */
  React.useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    const term = q.trim();
    if (!term) {
      setResults({ locations: [], lawyers: [], sessions: [] });
      setAuthMissing(false);
      setLoading(false);
      setIdx(0);
      return;
    }
    setLoading(true);
    searchRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}&type=all`)
        .then((r) => {
          if (r.status === 401) {
            setAuthMissing(true);
            return null;
          }
          return r.json();
        })
        .then((d) => {
          setAuthMissing(false);
          setResults(
            d ?? { locations: [], lawyers: [], sessions: [] },
          );
        })
        .catch(() => setResults({ locations: [], lawyers: [], sessions: [] }))
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [q]);

  const entries = React.useMemo<PaletteEntry[]>(() => {
    const list: PaletteEntry[] = [];
    if (!q.trim()) {
      list.push(...QUICK_LINKS);
      return list;
    }
    for (const l of results.lawyers) {
      list.push({ id: `lawyer-${l.id}`, kind: 'lawyer', label: l.fullName, sub: l.title === 'DOCTOR' ? 'دكتور' : 'محامي', href: `/lawyers/${l.slug}`, icon: <Users size={14} /> });
    }
    for (const l of results.locations) {
      list.push({ id: `location-${l.id}`, kind: 'location', label: l.name, sub: l.type, href: `/locations/${l.slug}`, icon: <Landmark size={14} /> });
    }
    for (const s of results.sessions) {
      list.push({
        id: `session-${s.id}`,
        kind: 'session',
        label: s.description,
        sub: `${s.scheduledDate ?? ''} ${s.scheduledTime ?? ''} — ${s.location.name}`,
        href: `/sessions/${s.id}`,
        icon: <CalendarClock size={14} />,
      });
    }
    return list;
  }, [q, results]);

  const go = (entry: PaletteEntry) => {
    setOpen(false);
    router.push(entry.href);
    router.refresh();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, entries.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = entries[Math.max(0, Math.min(idx, entries.length - 1))];
      if (entry) go(entry);
    }
  };

  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-palette-idx="${idx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  if (!open) return null;

  const hasResults = entries.length > 0 || q.trim();

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="البحث السريع"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px] animate-fade-in" />
      <div className="relative w-full max-w-[640px] overflow-hidden rounded-2xl border border-white/10 bg-navy-900 shadow-lift animate-fade-in-up">
        {/* Input row */}
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4">
          <Search size={16} className="shrink-0 text-gold-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ابحث عن محكمة، محامٍ، جلسة، قضية…"
            className="h-14 w-full bg-transparent text-[14px] text-ivory-50 placeholder:text-navy-400 focus:outline-none"
            style={{ fontFamily: 'var(--font-arabic)' }}
          />
          {loading && <span className="h-3 w-3 shrink-0 animate-spin rounded-full border border-navy-400 border-t-gold-500" />}
          <button
            onClick={() => setOpen(false)}
            className="kbd shrink-0 text-navy-300 transition-colors hover:text-ivory-100"
            aria-label="إغلاق"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[46vh] overflow-y-auto overscroll-contain p-2 [scrollbar-gutter:stable]">
          {authMissing ? (
            <p className="px-3 py-6 text-center text-[12px] font-semibold text-navy-300">
              سجّل الدخول بمفتاح الإدارة لعرض نتائج البحث — التنقل المباشر متاح دائماً.
            </p>
          ) : !hasResults ? (
            <p className="px-3 py-6 text-center text-[12px] font-semibold text-navy-300">ابدأ الكتابة للبحث في كل شيء…</p>
          ) : entries.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] font-semibold text-navy-300">لا توجد نتائج مطابقة.</p>
          ) : (
            entries.map((entry, i) => (
              <button
                key={entry.id}
                data-palette-idx={i}
                onMouseEnter={() => setIdx(i)}
                onClick={() => go(entry)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors',
                  i === idx ? 'bg-gold-500/[0.09] ring-1 ring-inset ring-gold-500/25' : 'hover:bg-white/[0.04]',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                    i === idx ? 'border-gold-500/40 bg-gold-500/10 text-gold-500' : 'border-white/10 bg-white/[0.04] text-navy-300',
                  )}
                >
                  {entry.icon ?? <Search size={13} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[13px] font-bold', i === idx ? 'text-gold-500' : 'text-ivory-100')}>{entry.label}</span>
                  {entry.sub && <span className="mt-0.5 block truncate text-[10.5px] font-semibold text-navy-400">{entry.sub}</span>}
                </span>
                <CornerDownLeft size={12} className={cn('shrink-0', i === idx ? 'text-gold-500' : 'text-navy-400')} />
              </button>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-white/[0.08] bg-navy-950/60 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-navy-300">
            <ArrowUpDown size={11} className="text-navy-400" /> تنقّل
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-navy-300">
            <CornerDownLeft size={11} className="text-navy-400" /> دخول
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-navy-300">
            <X size={11} className="text-navy-400" /> إغلاق
          </span>
          <span className="ms-auto font-mono text-[9px] tracking-[0.2em] text-navy-400">LEGAL COMMAND CENTER</span>
        </div>
      </div>
    </div>
  );
}

/** Trigger button shown in the header (⌘K). */
export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
      className="group flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[11.5px] font-semibold text-navy-300 transition-all hover:border-gold-500/40 hover:text-ivory-100"
    >
      <Search size={13} className="text-navy-400 transition-colors group-hover:text-gold-500" />
      <span className="hidden md:inline">بحث سريع…</span>
      <span className="kbd ms-1 hidden sm:inline-flex">⌘K</span>
    </button>
  );
}
