'use client';
import Link from 'next/link';
import { useState } from 'react';
import { PlatformTour } from '@/components/platform-tour';
import { Star, Clock3, Undo2, Search } from 'lucide-react';

type Item = { id: string; kind: 'RECENT' | 'FAVORITE'; label: string; href: string };
type Undo = { id: string; label: string };
const QUICK: Record<string, { label: string; href: string }> = {
  'new-session': { label: 'جلسة جديدة', href: '/#task-composer' }, 'new-client': { label: 'عميل جديد', href: '/admin/clients' },
  'new-case': { label: 'قضية جديدة', href: '/case-archive' }, search: { label: 'بحث', href: '/search' },
  'my-day': { label: 'يومي', href: '/my-day' }, requests: { label: 'الطلبات', href: '/notifications' },
};
export function MyDayPersonalPanel({ items, undo, quick }: { items: Item[]; undo: Undo[]; quick: string[] }) {
  const [undos, setUndos] = useState(undo);
  const [msg, setMsg] = useState('');
  async function doUndo(id: string) {
    const r = await fetch('/api/me/undo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    if (r.ok) { setUndos((u) => u.filter((x) => x.id !== id)); setMsg('تم التراجع عن التعديل'); } else setMsg('لا يمكن التراجع الآن');
  }
  const favs = items.filter((i) => i.kind === 'FAVORITE'), recents = items.filter((i) => i.kind === 'RECENT').slice(0, 8);
  const quickList = (quick.length ? quick : ['new-session', 'search', 'requests']).filter((k) => QUICK[k]);
  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-2" aria-label="مساحتي">
      <div className="rounded-2xl border border-navy-100 bg-white p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-navy-900"><Search size={15} />اختصارات سريعة</h2>
        <div className="flex flex-wrap gap-2">{quickList.map((k) => <Link key={k} href={QUICK[k].href} className="rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white">{QUICK[k].label}</Link>)}</div>
        <div className="mt-3"><PlatformTour /></div>
      </div>
      <div className="rounded-2xl border border-navy-100 bg-white p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-navy-900"><Undo2 size={15} />تراجع عن آخر تعديل</h2>
        {undos.length === 0 ? <p className="text-xs font-semibold text-navy-400">لا توجد تعديلات يمكن التراجع عنها (المدة 15 دقيقة).</p> :
          <ul className="space-y-2">{undos.slice(0, 5).map((u) => <li key={u.id} className="flex items-center justify-between gap-2 text-xs font-semibold text-navy-700"><span className="truncate">{u.label}</span><button type="button" onClick={() => doUndo(u.id)} className="shrink-0 rounded-lg border border-navy-200 px-2 py-1 font-extrabold">تراجع</button></li>)}</ul>}
        {msg && <p role="status" className="mt-2 text-xs font-bold text-navy-600">{msg}</p>}
      </div>
      <div className="rounded-2xl border border-navy-100 bg-white p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-navy-900"><Star size={15} />المفضلة</h2>
        {favs.length === 0 ? <p className="text-xs font-semibold text-navy-400">لم تضف شيئاً للمفضلة بعد.</p> : <ul className="space-y-1">{favs.map((i) => <li key={i.id}><Link href={i.href} className="text-xs font-bold text-navy-700 hover:underline">{i.label}</Link></li>)}</ul>}
      </div>
      <div className="rounded-2xl border border-navy-100 bg-white p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-navy-900"><Clock3 size={15} />آخر ما فتحته</h2>
        {recents.length === 0 ? <p className="text-xs font-semibold text-navy-400">لا يوجد سجل بعد.</p> : <ul className="space-y-1">{recents.map((i) => <li key={i.id}><Link href={i.href} className="text-xs font-bold text-navy-700 hover:underline">{i.label}</Link></li>)}</ul>}
      </div>
    </section>
  );
}
