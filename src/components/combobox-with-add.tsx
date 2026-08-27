'use client';

import * as React from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * ComboboxWithAdd — اختيار بالبحث والكتابة (بحث فوري أثناء الكتابة) مع
 * إضافة سريعة بنفس نمط SelectWithAdd («+ إضافة»). يُستخدم في اختيار
 * المحكمة/المكان والقضية. RTL-native.
 */

export type ComboboxWithAddOption = {
  value: string;
  label: string;
};

type ComboboxWithAddProps = {
  id?: string;
  name?: string;
  options: ComboboxWithAddOption[];
  value: string;
  onChange: (value: string) => void;
  onAdd?: (label: string) => Promise<string | void> | string | void;
  placeholder?: string;
  addLabel?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  ariaLabel?: string;
};

function normalize(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u0622\u0623\u0625\u0627]/g, 'ا')
    .replace(/\u0649/g, 'ي')
    .replace(/\u0629/g, 'ه')
    .replace(/\u0640/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function ComboboxWithAdd({
  id,
  name,
  options,
  value,
  onChange,
  onAdd,
  placeholder = 'ابحث أو اختر…',
  addLabel = 'إضافة',
  disabled,
  className,
  required,
  ariaLabel,
}: ComboboxWithAddProps) {
  const selected = options.find((o) => o.value === value);
  const [query, setQuery] = React.useState(selected?.label ?? '');
  const [open, setOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setQuery(selected?.label ?? '');
  }, [value, selected?.label]);

  React.useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setQuery(selected?.label ?? '');
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [selected?.label]);

  const filtered = React.useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    return options.filter((o) => normalize(o.label).includes(q));
  }, [options, query]);

  React.useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  const selectOption = (o: ComboboxWithAddOption) => {
    onChange(o.value);
    setQuery(o.label);
    setOpen(false);
  };

  const startAdd = () => {
    setOpen(false);
    setAdding(true);
    setDraft(query.trim());
    setHighlight(0);
  };

  const cancelAdd = () => {
    setAdding(false);
    setDraft('');
    setOpen(true);
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
        setQuery(typeof maybeId === 'string' && maybeId ? label : label);
      } finally {
        setBusy(false);
      }
    } else {
      onChange(label);
      setQuery(label);
    }
    setAdding(false);
    setDraft('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (adding) {
      if (e.key === 'Enter') {
        e.preventDefault();
        void confirmAdd();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelAdd();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtered[highlight];
      if (open && o) selectOption(o);
      else setOpen(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery(selected?.label ?? '');
    }
  };

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <div className="relative flex items-stretch gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            ref={inputRef}
            id={id}
            value={adding ? draft : query}
            onChange={(e) => {
              if (adding) setDraft(e.target.value);
              else {
                setQuery(e.target.value);
                setOpen(true);
              }
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            disabled={disabled || busy}
            dir="auto"
            placeholder={adding ? 'اكتب الاسم الجديد…' : placeholder}
            aria-label={ariaLabel}
            className="h-10 w-full rounded-lg border border-navy-200 bg-white pe-9 ps-8 text-sm text-navy-900 placeholder:text-navy-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25 focus:outline-none disabled:opacity-60"
          />
          {query && !adding && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setQuery('');
                onChange('');
                setOpen(true);
                inputRef.current?.focus();
              }}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-navy-300 hover:text-navy-600"
              title="مسح"
              aria-label="مسح الاختيار"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {adding ? (
          <>
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
        )}
      </div>
      {name && <input type="hidden" name={name} value={value} />}
      {open && !adding && (
        <div className="absolute z-30 mt-1.5 max-h-56 w-full overflow-y-auto overscroll-contain rounded-lg border border-navy-200 bg-white shadow-xl">
          {filtered.length === 0 ? (
            <div className="px-3 py-3">
              <p className="text-[12px] font-bold text-navy-400">لا توجد نتائج مطابقة</p>
              {onAdd && (
                <button
                  type="button"
                  onClick={startAdd}
                  className="mt-1.5 flex items-center gap-1 text-[12px] font-extrabold text-gold-700 hover:underline"
                >
                  <Plus size={13} />
                  إضافة «{query.trim()}»
                </button>
              )}
            </div>
          ) : (
            filtered.map((o, i) => (
              <button
                key={o.value}
                type="button"
                onClick={() => selectOption(o)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-start text-[13px] font-semibold',
                  o.value === value ? 'text-gold-700' : 'text-navy-800',
                  i === highlight && 'bg-ivory-100',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.value === value && <Check size={13} className="shrink-0 text-gold-600" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
