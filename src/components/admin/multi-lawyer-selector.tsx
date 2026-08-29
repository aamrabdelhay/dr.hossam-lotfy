'use client';

import * as React from 'react';
import { Search, Check, X } from 'lucide-react';
import { Input } from '../ui';
import { cn } from '@/lib/cn';

const MAX = 20;

export function MultiLawyerSelector({ lawyers, selected, onChange }: {
  lawyers: Array<{ id: string; name: string; title?: string; isPrincipal?: boolean; photo?: string | null }>;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [filter, setFilter] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick); }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < MAX) { onChange([...selected, id]); setOpen(false); setFilter(''); }
  };
  const filtered = lawyers.filter((l) => !filter.trim() || l.name.toLowerCase().includes(filter.trim().toLowerCase()) || l.name.includes(filter.trim()));

  return (
    <div ref={ref} className="relative">
      <div className="flex min-h-10 cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-2.5 py-2" onClick={() => setOpen((v) => !v)}>
        {selected.length === 0 && <span className="text-[13px] font-semibold text-navy-300">اختر المحامي</span>}
        {selected.map((id) => { const l = lawyers.find((x) => x.id === id); return <span key={id} className="flex items-center gap-1 rounded-full bg-navy-950 py-0.5 pe-1 ps-2.5 text-[11px] font-bold text-ivory-100">{l?.name ?? id}<button type="button" onClick={(e) => { e.stopPropagation(); toggle(id); }} className="rounded-full p-0.5 hover:bg-white/20"><X size={11} /></button></span>; })}
        <span className="ms-auto text-[10px] font-bold text-navy-300">{selected.length}/{MAX}</span>
      </div>
      {open && <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-navy-100 bg-white shadow-xl">
        <div className="border-b border-navy-100 p-2"><div className="relative"><Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-navy-300" /><Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="بحث عن محامي…" className="h-8 ps-8 text-[12px]" autoFocus /></div></div>
        <ul className="max-h-52 overflow-y-auto py-1">
          {filtered.map((l) => { const checked = selected.includes(l.id); return <li key={l.id}><button type="button" onClick={() => toggle(l.id)} disabled={!checked && selected.length >= MAX} className={cn('flex w-full items-center gap-2.5 px-3 py-2 text-start text-[13px] font-semibold hover:bg-ivory-100 disabled:opacity-40', l.isPrincipal && 'bg-gold-500/[0.05]')}><span className={cn('flex h-[18px] w-[18px] items-center justify-center rounded border', checked ? 'border-gold-500 bg-gold-500 text-navy-950' : 'border-navy-200 bg-white')}>{checked && <Check size={12} />}</span><span className="min-w-0 flex-1 truncate text-navy-800">{l.name}</span>{l.isPrincipal && <span className="rounded bg-gold-500/15 px-1.5 text-[9px] font-bold text-gold-700">رئيس المكتب</span>}</button></li>; })}
          {filtered.length === 0 && <li className="px-3 py-4 text-center text-[12px] font-bold text-navy-300">لا نتائج</li>}
        </ul>
      </div>}
    </div>
  );
}
