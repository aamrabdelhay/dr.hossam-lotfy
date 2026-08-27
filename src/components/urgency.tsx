import { cn } from '@/lib/cn';
import type { Urgency } from '@/lib/dates';

/**
 * LEGAL COMMAND CENTER — 4-level priority ladder.
 * Presentation-only mapping over the existing date-derived `Urgency`
 * (the API / database model is untouched):
 *
 *   CRITICAL   ← today / tomorrow / within 3 days   (#FF5A5F)
 *   IMPORTANT  ← within 14 days                     (orange)
 *   ATTENTION  ← within 30 days                     (electric lime)
 *   NORMAL     ← further out / past                 (neutral)
 */
export type Priority = 'NORMAL' | 'ATTENTION' | 'IMPORTANT' | 'CRITICAL';

export const PRIORITY_OF: Record<Urgency, Priority> = {
  past: 'NORMAL',
  today: 'CRITICAL',
  tomorrow: 'CRITICAL',
  critical: 'CRITICAL',
  important: 'IMPORTANT',
  upcoming: 'ATTENTION',
  normal: 'NORMAL',
};

const PRIORITY_DOT: Record<Priority, string> = {
  NORMAL: 'bg-navy-400',
  ATTENTION: 'bg-gold-500',
  IMPORTANT: 'bg-orange-400',
  CRITICAL: 'bg-crit',
};

export const URGENCY_DOT: Record<Urgency, string> = {
  past: PRIORITY_DOT.NORMAL,
  today: PRIORITY_DOT.CRITICAL,
  tomorrow: PRIORITY_DOT.CRITICAL,
  critical: PRIORITY_DOT.CRITICAL,
  important: PRIORITY_DOT.IMPORTANT,
  upcoming: PRIORITY_DOT.ATTENTION,
  normal: PRIORITY_DOT.NORMAL,
};

const PRIORITY_BORDER: Record<Priority, string> = {
  NORMAL: 'border-s-navy-600',
  ATTENTION: 'border-s-gold-500 bg-gold-500/[0.04]',
  IMPORTANT: 'border-s-orange-400 bg-orange-400/[0.05]',
  CRITICAL: 'border-s-crit bg-crit/[0.06]',
};

export const URGENCY_BORDER: Record<Urgency, string> = {
  past: PRIORITY_BORDER.NORMAL,
  today: PRIORITY_BORDER.CRITICAL,
  tomorrow: PRIORITY_BORDER.CRITICAL,
  critical: PRIORITY_BORDER.CRITICAL,
  important: PRIORITY_BORDER.IMPORTANT,
  upcoming: PRIORITY_BORDER.ATTENTION,
  normal: PRIORITY_BORDER.NORMAL,
};

/** Static start-border color classes (safe for Tailwind scanning). */
export const URGENCY_EDGE: Record<Urgency, string> = {
  past: 'border-s-navy-600',
  today: 'border-s-crit',
  tomorrow: 'border-s-crit',
  critical: 'border-s-crit',
  important: 'border-s-orange-400',
  upcoming: 'border-s-gold-500',
  normal: 'border-s-navy-600',
};

const PRIORITY_BADGE: Record<Priority, { cls: string; label: string }> = {
  NORMAL: { cls: 'bg-white/[0.05] text-navy-300 ring-1 ring-white/10', label: 'NORMAL' },
  ATTENTION: { cls: 'bg-gold-500/10 text-gold-500 ring-1 ring-gold-500/30', label: 'ATTENTION' },
  IMPORTANT: { cls: 'bg-orange-400/10 text-orange-400 ring-1 ring-orange-400/30', label: 'IMPORTANT' },
  CRITICAL: { cls: 'bg-crit/10 text-crit ring-1 ring-crit/40', label: 'CRITICAL' },
};

export const URGENCY_BADGE: Record<Urgency, { cls: string; label: string }> = {
  past: { ...PRIORITY_BADGE.NORMAL, label: 'NORMAL' },
  today: PRIORITY_BADGE.CRITICAL,
  tomorrow: PRIORITY_BADGE.CRITICAL,
  critical: PRIORITY_BADGE.CRITICAL,
  important: PRIORITY_BADGE.IMPORTANT,
  upcoming: PRIORITY_BADGE.ATTENTION,
  normal: PRIORITY_BADGE.NORMAL,
};

export function UrgencyBadge({ urgency, className }: { urgency: Urgency; className?: string }) {
  const b = URGENCY_BADGE[urgency];
  const critical = b.label === 'CRITICAL';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.08em]',
        b.cls,
        critical && 'crit-live',
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', URGENCY_DOT[urgency], critical && 'animate-pulse')} />
      {b.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' }) {
  const map = {
    PENDING: { cls: 'bg-white/[0.05] text-navy-300 ring-1 ring-white/10', label: 'قيد الجدولة' },
    IN_PROGRESS: { cls: 'bg-gold-500/10 text-gold-500 ring-1 ring-gold-500/30', label: 'جاري التنفيذ' },
    COMPLETED: { cls: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30', label: '✓ تم التنفيذ' },
    CANCELLED: { cls: 'bg-crit/10 text-crit ring-1 ring-crit/30 line-through', label: 'ملغي' },
  } as const;
  const m = map[status];
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold', m.cls)}>{m.label}</span>;
}
