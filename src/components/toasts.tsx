'use client';

import * as React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type Toast = { id: number; kind: 'success' | 'error' | 'info'; text: string };

let pushId = 0;
type Listener = (t: Toast) => void;
const listeners = new Set<Listener>();

/** Fire a toast from anywhere (client-side only). */
export function toast(kind: Toast['kind'], text: string) {
  const t = { id: ++pushId, kind, text };
  listeners.forEach((l) => l(t));
}

export const toastSuccess = (text: string) => toast('success', text);
export const toastError = (text: string) => toast('error', text);

export function Toaster() {
  const [items, setItems] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    const on: Listener = (t) => {
      setItems((prev) => [...prev.slice(-3), t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 4200);
    };
    listeners.add(on);
    return () => {
      listeners.delete(on);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 start-5 z-[200] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-2" dir="rtl">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-navy-100 bg-white px-4 py-3 shadow-lg animate-fade-in-up"
        >
          {t.kind === 'success' && <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />}
          {t.kind === 'error' && <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />}
          {t.kind === 'info' && <Info size={18} className="mt-0.5 shrink-0 text-gold-600" />}
          <p className="text-[13px] font-semibold leading-6 text-navy-800">{t.text}</p>
        </div>
      ))}
    </div>
  );
}
