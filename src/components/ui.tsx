'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { X, ChevronDown, Loader2, Inbox } from 'lucide-react';

/* ────────────────────────── Button ────────────────────────── */

type ButtonVariant = 'primary' | 'gold' | 'outline' | 'ghost' | 'danger' | 'subtle';
type ButtonSize = 'sm' | 'md' | 'lg';

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string) {
  const base =
    'btn-bubble inline-flex items-center justify-center gap-2 font-semibold select-none whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none';
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-8 px-3.5 text-[13px] rounded-lg',
    md: 'h-10 px-5 text-sm rounded-lg',
    lg: 'h-12 px-7 text-base rounded-xl',
  };
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-accent text-on-accent shadow-soft hover:bg-accent-hover hover:shadow-card',
    gold:
      'bg-brass text-on-brass shadow-soft hover:bg-brass-strong hover:shadow-card',
    outline:
      'border border-line-strong bg-surface text-ink shadow-soft hover:border-accent/60 hover:text-accent',
    ghost: 'text-muted hover:bg-accent-soft hover:text-accent',
    danger:
      'bg-[var(--danger-solid)] text-white shadow-soft hover:opacity-90 hover:shadow-card',
    subtle: 'bg-surface-alt text-ink hover:bg-sunken',
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

const fieldBase =
  'rounded-lg border border-line-strong bg-[var(--field-bg)] text-ink transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-faint ' +
  'focus:border-accent/70 focus:ring-[3px] focus:ring-[var(--accent-ring)] focus:outline-none';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn('h-10 w-full px-3.5 text-sm', fieldBase, className)}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn('w-full px-3.5 py-2.5 text-sm min-h-[90px] resize-y', fieldBase, className)}
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
        'h-10 w-full appearance-none px-3.5 pe-9 text-sm cursor-pointer',
        fieldBase,
        'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2377827a%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E")] bg-end-3 bg-no-repeat',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Field({
  label,
  hint,
  error,
  required,
  status,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Validation state: undefined = no indicator, true = complete, false = missing/invalid. */
  status?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
        {typeof status === 'boolean' && <FieldStatusDot ok={status} label={label} />}
        <span className="flex items-baseline gap-1">
          {label}
          {required && <span className="text-accent">*</span>}
          {hint && <span className="text-[11px] font-normal text-muted">{hint}</span>}
        </span>
      </span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  );
}

/** Accessible red/green status indicator for a validated form field. */
export function FieldStatusDot({ ok, label }: { ok: boolean; label: string }) {
  const text = ok ? `مكتمل: ${label}` : `ناقص أو غير صالح: ${label}`;
  return (
    <span
      className="inline-flex items-center"
      title={text}
      aria-label={text}
      role="img"
    >
      <span className={cn('h-2 w-2 rounded-full ring-2 transition-colors duration-200', ok ? 'bg-emerald-500 ring-emerald-500/20' : 'bg-red-500 ring-red-500/20')} />
    </span>
  );
}

/* ────────────────────────── Card / Badge ────────────────────────── */

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-xl border border-line bg-surface shadow-card', className)} {...props}>
      {children}
    </div>
  );
}

type BadgeTone = 'navy' | 'gold' | 'green' | 'amber' | 'orange' | 'red' | 'gray' | 'outline';

export function Badge({ tone = 'gray', className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    navy: 'bg-ink-strong text-background',
    gold: 'bg-accent-soft text-accent ring-1 ring-accent/25',
    green: 'bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-600/25',
    amber: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30',
    orange: 'bg-orange-600/10 text-orange-700 ring-1 ring-orange-600/30',
    red: 'bg-red-600/10 text-red-700 ring-1 ring-red-600/30',
    gray: 'bg-surface-alt text-muted',
    outline: 'ring-1 ring-line-strong text-muted',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-5', tones[tone], className)}>
      {children}
    </span>
  );
}

/* ────────────────────────── Avatar ────────────────────────── */

/**
 * Rectangular initials avatar — letters only. Never renders a photo and never
 * a circle: themed border/surface, serif initials.
 */
export function Avatar({ name, src: _src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string; ring?: boolean }) {
  const initials = React.useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '');
  }, [name]);
  void _src; // photos intentionally unused — letters-only design
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-lg border border-line-strong bg-surface-alt text-ink-strong shadow-soft', className)}
      style={{
        width: Math.round(size * 1.18),
        height: size,
        fontFamily: 'var(--font-serif-en)',
        fontWeight: 600,
        fontSize: Math.max(11, size * 0.42),
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
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          'relative w-full animate-fade-in-up rounded-t-2xl bg-surface shadow-lift ring-1 ring-line flex flex-col max-h-[92vh] sm:max-h-[85vh] sm:rounded-2xl',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl',
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h3 className="text-base font-bold text-ink-strong">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-alt hover:text-ink" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/* ────────────────────────── EmptyState / Skeleton / Spinner ────────────────────────── */

export function EmptyState({ title, hint, icon, action }: { title: string; hint?: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-inset px-6 py-10 text-center">
      <span className="text-faint">{icon ?? <Inbox size={34} strokeWidth={1.5} />}</span>
      <p className="text-sm font-bold text-ink-2">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-6 text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} />;
}

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin', className)} />;
}

/* ────────────────────────── Tabs ────────────────────────── */

export function Tabs({ tabs, active, onChange, className }: { tabs: Array<{ id: string; label: string; count?: number }>; active: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-line', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'relative -mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-[13px] font-bold transition-colors',
            active === t.id ? 'text-accent' : 'text-muted hover:text-ink-2',
          )}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span className={cn('rounded-full px-1.5 text-[10px] font-bold transition-colors', active === t.id ? 'bg-accent-soft text-accent' : 'bg-surface-alt text-muted')}>{t.count}</span>
          )}
          {active === t.id && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────── Collapsible ────────────────────────── */

export function Collapsible({ title, count, tone, children, defaultOpen = false }: { title: React.ReactNode; count?: number; tone?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-start hover:bg-surface-alt/60"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[13px] font-extrabold text-ink-2">
          <span className={cn('h-2 w-2 rounded-full', tone)} />
          {title}
          {typeof count === 'number' && (
            <span className="rounded-full bg-surface-alt px-1.5 py-px text-[10px] font-bold text-muted">{count}</span>
          )}
        </span>
        <ChevronDown size={15} className={cn('text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
