'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { X, ChevronDown, Loader2, Inbox } from 'lucide-react';

/* ────────────────────────── Button ────────────────────────── */

type ButtonVariant = 'primary' | 'gold' | 'outline' | 'ghost' | 'danger' | 'subtle';
type ButtonSize = 'sm' | 'md' | 'lg';

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap active:scale-[0.98]';
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-[13px] rounded-lg',
    md: 'h-10 px-4 text-sm rounded-xl',
    lg: 'h-12 px-6 text-base rounded-xl',
  };
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-gradient-to-b from-navy-800 to-navy-900 text-ivory-50 shadow-soft hover:from-navy-700 hover:to-navy-800 hover:shadow-card active:bg-navy-950',
    gold:
      'bg-gradient-to-b from-gold-400 to-gold-500 text-navy-950 shadow-[0_2px_8px_-2px_rgba(200,255,61,0.4)] hover:from-gold-300 hover:to-gold-400 hover:shadow-glow-gold active:from-gold-500 active:to-gold-600',
    outline:
      'border border-navy-200 bg-navy-850 text-ivory-200 shadow-soft hover:border-gold-500/60 hover:text-ivory-50 hover:shadow-card',
    ghost: 'text-ivory-300 hover:bg-white/[0.06]',
    danger:
      'bg-gradient-to-b from-red-600 to-red-700 text-white shadow-soft hover:from-red-500 hover:to-red-600 hover:shadow-card',
    subtle: 'bg-white/[0.06] text-ivory-200 hover:bg-white/[0.1]',
  };
  return cn(base, sizes[size], variants[variant], extra);
}

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...props} />
  ),
);
Button.displayName = 'Button';

/* ────────────────────────── Form controls ────────────────────────── */

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-navy-200/80 bg-navy-800 px-3.5 text-sm text-ivory-100 transition-all placeholder:text-navy-300',
        'focus:border-gold-500/70 focus:bg-navy-850 focus:ring-2 focus:ring-gold-500/20 focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-navy-200/80 bg-navy-800 px-3.5 py-2.5 text-sm text-ivory-100 transition-all placeholder:text-navy-300 min-h-[90px]',
        'focus:border-gold-500/70 focus:bg-navy-850 focus:ring-2 focus:ring-gold-500/20 focus:outline-none resize-y',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full appearance-none rounded-xl border border-navy-200/80 bg-navy-800 px-3.5 pe-9 text-sm text-ivory-100 transition-all cursor-pointer',
        'focus:border-gold-500/70 focus:bg-navy-850 focus:ring-2 focus:ring-gold-500/20 focus:outline-none',
        'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E")] bg-end-3 bg-no-repeat',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Field({ label, hint, error, required, children }: { label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1 text-[13px] font-semibold text-ivory-200">
        {label}
        {required && <span className="text-gold-500">*</span>}
        {hint && <span className="text-[11px] font-normal text-navy-300">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  );
}

/* ────────────────────────── Card / Badge ────────────────────────── */

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-2xl border border-navy-100/80 bg-navy-850 shadow-card', className)} {...props}>
      {children}
    </div>
  );
}

type BadgeTone = 'navy' | 'gold' | 'green' | 'amber' | 'orange' | 'red' | 'gray' | 'outline';

export function Badge({ tone = 'gray', className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    navy: 'bg-navy-800 text-ivory-100 ring-1 ring-white/10',
    gold: 'bg-gold-500/15 text-gold-500 ring-1 ring-gold-500/30',
    green: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25',
    amber: 'bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/30',
    orange: 'bg-orange-400/10 text-orange-400 ring-1 ring-orange-400/30',
    red: 'bg-crit/10 text-crit ring-1 ring-crit/30',
    gray: 'bg-white/5 text-navy-300',
    outline: 'ring-1 ring-navy-200 text-navy-300',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-5', tones[tone], className)}>
      {children}
    </span>
  );
}

/* ────────────────────────── Avatar ────────────────────────── */

/**
 * Command Center avatar: renders the lawyer photo when available — kept
 * grayscale by default and revealed in full color on group hover (ATTORNEYS
 * directory spec) — otherwise a dark initials tile.
 */
export function Avatar({ name, src, size = 40, className, ring }: { name: string; src?: string | null; size?: number; className?: string; ring?: boolean }) {
  const initials = React.useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '');
  }, [name]);
  const box = {
    width: Math.round(size * 1.18),
    height: size,
  };
  if (src) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 select-none overflow-hidden rounded-lg border border-white/10 bg-navy-800 grayscale transition-all duration-300 group-hover:grayscale-0',
          ring && 'ring-2 ring-gold-500/50 ring-offset-2 ring-offset-navy-900',
          className,
        )}
        style={box}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-lg border border-white/10 bg-gradient-to-b from-navy-700 to-navy-800 text-gold-500',
        ring && 'ring-2 ring-gold-500/50 ring-offset-2 ring-offset-navy-900',
        className,
      )}
      style={{
        ...box,
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        fontSize: Math.max(11, size * 0.4),
        letterSpacing: '0.5px',
        lineHeight: 1,
      }}
    >
      {initials}
    </span>
  );
}

/* ────────────────────────── Modal ────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          'relative w-full animate-fade-in-up rounded-t-3xl bg-navy-850 shadow-lift ring-1 ring-navy-950/10 flex flex-col max-h-[92vh] sm:max-h-[85vh] sm:rounded-3xl',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl',
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-navy-100 px-5 py-4">
          <h3 className="text-base font-bold text-ivory-100">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1.5 text-navy-300 hover:bg-white/5 hover:text-ivory-300" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-navy-100 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/* ────────────────────────── EmptyState / Skeleton / Spinner ────────────────────────── */

export function EmptyState({ title, hint, icon, action }: { title: string; hint?: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-200/80 bg-gradient-to-b from-ivory-50 to-white px-6 py-10 text-center">
      <span className="text-navy-300">{icon ?? <Inbox size={34} strokeWidth={1.5} />}</span>
      <p className="text-sm font-bold text-ivory-300">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-6 text-navy-300">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} />;
}

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin', className)} />;
}

/* ────────────────────────── Tabs ────────────────────────── */

export function Tabs({ tabs, active, onChange, className }: { tabs: Array<{ id: string; label: string; count?: number }>; active: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-navy-100', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'relative -mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-[13px] font-bold transition-all',
            active === t.id ? 'text-ivory-50' : 'text-navy-300 hover:text-navy-300',
          )}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span className={cn('rounded-full px-1.5 text-[10px] font-bold transition-colors', active === t.id ? 'bg-gold-500/15 text-gold-500' : 'bg-white/5 text-navy-300')}>{t.count}</span>
          )}
          {active === t.id && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-l from-gold-400 to-gold-600" />}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────── Collapsible ────────────────────────── */

export function Collapsible({ title, count, tone, children, defaultOpen = false }: { title: React.ReactNode; count?: number; tone?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-b border-navy-100 last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-start hover:bg-white/[0.025]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[13px] font-extrabold text-ivory-200">
          <span className={cn('h-2 w-2 rounded-full', tone)} />
          {title}
          {typeof count === 'number' && (
            <span className="rounded-full bg-white/5 px-1.5 py-px text-[10px] font-bold text-navy-400">{count}</span>
          )}
        </span>
        <ChevronDown size={15} className={cn('text-navy-300 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
