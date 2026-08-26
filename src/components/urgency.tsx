import { cn } from '@/lib/cn';
import { URGENCY_LABEL, type Urgency } from '@/lib/dates';

export const URGENCY_DOT: Record<Urgency, string> = {
  past: 'bg-navy-300',
  today: 'bg-red-600',
  tomorrow: 'bg-red-600',
  critical: 'bg-orange-600',
  important: 'bg-amber-500',
  upcoming: 'bg-gold-500',
  normal: 'bg-emerald-600',
};

export const URGENCY_BORDER: Record<Urgency, string> = {
  past: 'border-s-navy-200',
  today: 'border-s-red-600 bg-red-600/[0.03]',
  tomorrow: 'border-s-red-600 bg-gradient-to-l from-red-600/[0.05] to-transparent',
  critical: 'border-s-orange-500 bg-orange-500/[0.04]',
  important: 'border-s-amber-500 bg-amber-500/[0.04]',
  upcoming: 'border-s-gold-500 bg-gold-500/[0.04]',
  normal: 'border-s-emerald-600/50',
};

/** Static start-border color classes (safe for Tailwind scanning). */
export const URGENCY_EDGE: Record<Urgency, string> = {
  past: 'border-s-navy-200',
  today: 'border-s-red-600',
  tomorrow: 'border-s-red-600',
  critical: 'border-s-orange-500',
  important: 'border-s-amber-500',
  upcoming: 'border-s-gold-500',
  normal: 'border-s-emerald-600/60',
};

export const URGENCY_BADGE: Record<Urgency, { cls: string; label: string }> = {
  past: { cls: 'bg-navy-900/5 text-navy-400 ring-1 ring-navy-200', label: URGENCY_LABEL.past },
  today: { cls: 'bg-red-600 text-white', label: 'اليوم' },
  tomorrow: { cls: 'bg-red-600/10 text-red-700 ring-1 ring-red-600/40', label: 'غداً' },
  critical: { cls: 'bg-orange-600/10 text-orange-700 ring-1 ring-orange-600/40', label: 'حرجة' },
  important: { cls: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/40', label: 'مهمة' },
  upcoming: { cls: 'bg-gold-500/10 text-gold-700 ring-1 ring-gold-500/40', label: 'قريبة' },
  normal: { cls: 'bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-600/30', label: 'عادية' },
};

export function UrgencyBadge({ urgency, className }: { urgency: Urgency; className?: string }) {
  const b = URGENCY_BADGE[urgency];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold', b.cls, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', urgency === 'past' ? 'bg-navy-300' : 'bg-current')} />
      {b.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' }) {
  const map = {
    PENDING: { cls: 'bg-navy-900/5 text-navy-500 ring-1 ring-navy-200', label: 'قيد الجدولة' },
    IN_PROGRESS: { cls: 'bg-gold-500/10 text-gold-700 ring-1 ring-gold-500/40', label: 'جاري التنفيذ' },
    COMPLETED: { cls: 'bg-emerald-600 text-white', label: '✓ تم التنفيذ' },
    CANCELLED: { cls: 'bg-red-600/10 text-red-600 ring-1 ring-red-600/30 line-through', label: 'ملغي' },
  } as const;
  const m = map[status];
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold', m.cls)}>{m.label}</span>;
}
