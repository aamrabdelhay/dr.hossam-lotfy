'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { X, ChevronDown, Loader2, Inbox } from 'lucide-react';

/* ────────────────────────── Button ────────────────────────── */

type ButtonVariant = 'primary' | 'gold' | 'outline' | 'ghost' | 'danger' | 'subtle';
type ButtonSize = 'sm' | 'md' | 'lg';

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap';
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-[13px] rounded-md',
    md: 'h-10 px-4 text-sm rounded-lg',
    lg: 'h-12 px-6 text-base rounded-lg',
  };
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-navy-900 text-ivory-50 hover:bg-navy-800 active:bg-navy-950',
    gold: 'bg-gold-500 text-navy-950 hover:bg-gold-400 active:bg-gold-600',
    outline: 'border border-navy-200 bg-white text-navy-800 hover:border-gold-500 hover:text-navy-950',
    ghost: 'text-navy-700 hover:bg-navy-900/5',
    danger: 'bg-red-700 text-white hover:bg-red-800',
    subtle: 'bg-navy-900/5 text-navy-800 hover:bg-navy-900/10',
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
        'h-10 w-full rounded-lg border border-navy-200 bg-white px-3 text-sm text-navy-900 placeholder:text-navy-300',
        'focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25 focus:outline-none transition',
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
        'w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-300 min-h-[90px]',
        'focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25 focus:outline-none transition resize-y',
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
        'h-10 w-full appearance-none rounded-lg border border-navy-200 bg-white px-3 pe-9 text-sm text-navy-900',
        'focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25 focus:outline-none transition cursor-pointer',
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
      <span className="mb-1.5 flex items-baseline gap-1 text-[13px] font-semibold text-navy-800">
        {label}
        {required && <span className="text-gold-600">*</span>}
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
    <div className={cn('rounded-xl border border-navy-100 bg-white shadow-[0_1px_3px_rgba(7,17,28,0.06)]', className)} {...props}>
      {children}
    </div>
  );
}

type BadgeTone = 'navy' | 'gold' | 'green' | 'amber' | 'orange' | 'red' | 'gray' | 'outline';

export function Badge({ tone = 'gray', className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    navy: 'bg-navy-900 text-ivory-100',
    gold: 'bg-gold-500/15 text-gold-700 ring-1 ring-gold-500/30',
    green: 'bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-600/25',
    amber: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30',
    orange: 'bg-orange-600/10 text-orange-700 ring-1 ring-orange-600/30',
    red: 'bg-red-600/10 text-red-700 ring-1 ring-red-600/30',
    gray: 'bg-navy-900/5 text-navy-600',
    outline: 'ring-1 ring-navy-200 text-navy-600',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-5', tones[tone], className)}>
      {children}
    </span>
  );
}

/* ────────────────────────── Avatar ────────────────────────── */

const AVATAR_BG = [
  'linear-gradient(135deg,#0b1623,#24354a)',
  'linear-gradient(135deg,#111827,#33475e)',
  'linear-gradient(135deg,#8a6e18,#c9a227)',
  'linear-gradient(135deg,#0e1a2b,#4a3b18)',
];

export function Avatar({ name, src, size = 40, className, ring }: { name: string; src?: string | null; size?: number; className?: string; ring?: boolean }) {
  const initials = React.useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '');
  }, [name]);
  const hash = React.useMemo(() => name.split('').reduce((a, c) => a + c.charCodeAt(0), 0), [name]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={cn('rounded-full object-cover shrink-0 bg-navy-100', ring && 'ring-2 ring-gold-500/60 ring-offset-2 ring-offset-white', className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-latin font-semibold text-ivory-100', ring && 'ring-2 ring-gold-500/60 ring-offset-2 ring-offset-white', className)}
      style={{ width: size, height: size, background: AVATAR_BG[hash % AVATAR_BG.length], fontSize: Math.max(11, size * 0.34) }}
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
          'relative w-full animate-fade-in-up rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl',
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-navy-100 px-5 py-4">
          <h3 className="text-base font-bold text-navy-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1.5 text-navy-300 hover:bg-navy-900/5 hover:text-navy-700" aria-label="إغلاق">
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
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-navy-200 bg-ivory-50/60 px-6 py-10 text-center">
      <span className="text-navy-200">{icon ?? <Inbox size={34} strokeWidth={1.5} />}</span>
      <p className="text-sm font-bold text-navy-700">{title}</p>
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
            'relative -mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-[13px] font-bold transition-colors',
            active === t.id ? 'text-navy-950' : 'text-navy-300 hover:text-navy-600',
          )}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span className={cn('rounded-full px-1.5 text-[10px] font-bold', active === t.id ? 'bg-gold-500/15 text-gold-700' : 'bg-navy-900/5 text-navy-300')}>{t.count}</span>
          )}
          {active === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold-500" />}
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
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-start hover:bg-navy-900/[0.025]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[13px] font-extrabold text-navy-800">
          <span className={cn('h-2 w-2 rounded-full', tone)} />
          {title}
          {typeof count === 'number' && (
            <span className="rounded-full bg-navy-900/5 px-1.5 py-px text-[10px] font-bold text-navy-500">{count}</span>
          )}
        </span>
        <ChevronDown size={15} className={cn('text-navy-300 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
