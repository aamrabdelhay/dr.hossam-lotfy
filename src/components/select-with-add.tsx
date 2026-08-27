'use client';

import * as React from 'react';
import { Plus, Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Select with an inline «إضافة» affordance. Every dropdown in the app exposes
 * a small "+ إضافة" action that opens a dedicated input to create & select a
 * new option on the fly. RTL-native; supports both id/name and value/label
 * option shapes.
 */

export type SelectWithAddOption = {
  value: string;
  label: string;
};

type SelectWithAddProps = {
  /** id/name passthrough for forms & tests */
  id?: string;
  name?: string;
  options: SelectWithAddOption[];
  value: string;
  onChange: (value: string) => void;
  onAdd?: (label: string) => Promise<string | void> | string | void;
  /** Fallback when no onAdd is provided — the new value is selected locally. */
  placeholder?: string;
  addLabel?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  ariaLabel?: string;
};

export function SelectWithAdd({
  id,
  name,
  options,
  value,
  onChange,
  onAdd,
  placeholder = 'اختر…',
  addLabel = 'إضافة',
  disabled,
  className,
  required,
  ariaLabel,
}: SelectWithAddProps) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const startAdd = () => {
    setAdding(true);
    setDraft('');
  };

  const cancelAdd = () => {
    setAdding(false);
    setDraft('');
  };

  const confirmAdd = async () => {
    const label = draft.trim();
    if (!label || busy) return;
    if (onAdd) {
      setBusy(true);
      try {
        const maybeId = await onAdd(label);
        const newId = typeof maybeId === 'string' && maybeId ? maybeId : value;
        onChange(typeof maybeId === 'string' && maybeId ? maybeId : label);
        void newId;
        setAdding(false);
        setDraft('');
      } finally {
        setBusy(false);
      }
    } else {
      onChange(label);
      setAdding(false);
      setDraft('');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void confirmAdd();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelAdd();
    }
  };

  return (
    <div className={cn('relative flex items-stretch gap-1.5', className)}>
      {adding ? (
        <>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
            dir="auto"
            placeholder="اكتب الاسم الجديد…"
            aria-label={ariaLabel ? `${ariaLabel} — إدخال جديد` : 'إدخال جديد'}
            className="h-10 min-w-0 flex-1 rounded-lg border border-gold-500 bg-white px-3 text-sm text-navy-900 placeholder:text-navy-300 focus:ring-2 focus:ring-gold-500/25 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void confirmAdd()}
            disabled={busy || !draft.trim()}
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-2.5 text-[12px] font-extrabold text-white disabled:opacity-40"
            title="تأكيد"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={cancelAdd}
            className="inline-flex h-10 shrink-0 items-center rounded-lg border border-navy-200 px-2.5 text-navy-400 hover:text-navy-700"
            title="إلغاء"
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <select
            id={id}
            name={name}
            value={value}
            required={required}
            disabled={disabled}
            aria-label={ariaLabel}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'h-10 w-full min-w-0 flex-1 appearance-none rounded-lg border border-navy-200 bg-white px-3 pe-9 text-sm text-navy-900',
              'focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25 focus:outline-none transition cursor-pointer',
              !value && 'text-navy-300',
            )}
          >
            <option value="">{placeholder}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={startAdd}
            disabled={disabled}
            title={addLabel}
            aria-label={addLabel}
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg border border-dashed border-gold-500/60 bg-gold-500/10 px-2.5 text-[12px] font-extrabold text-gold-700 transition hover:bg-gold-500/20 disabled:opacity-40"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">{addLabel}</span>
          </button>
        </>
      )}
    </div>
  );
}
