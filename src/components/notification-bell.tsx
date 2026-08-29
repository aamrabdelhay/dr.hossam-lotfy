'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

type BellNotification = { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };
const TYPE_LABEL: Record<string, string> = { TASK_ASSIGNED: 'مهمة جديدة', TASK_EDITED: 'تعديل', SESSION_CRITICAL: 'جلسة حرجة', SESSION_TOMORROW: 'جلسة غداً', COMMENT: 'تعليق', TASK_COMPLETED: 'تم التنفيذ', TASK_COMPLETION_REQUEST: 'طلب موافقة', TASK_DELETED: 'حذف مهمة', POST_CREATED: 'بوست جديد', ANNOUNCEMENT: 'إعلان' };
function timeAgo(iso: string): string { const diff = Date.now() - new Date(iso).getTime(); const min = Math.floor(diff / 60000); if (min < 1) return 'الآن'; if (min < 60) return `منذ ${min} د`; const h = Math.floor(min / 60); if (h < 24) return `منذ ${h} س`; const d = Math.floor(h / 24); return `منذ ${d} يوم`; }

export function NotificationBell({ unread }: { unread: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<BellNotification[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [markingAll, setMarkingAll] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { const onClick = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick); }, []);
  const load = React.useCallback(async () => { try { const res = await fetch('/api/notifications'); if (res.ok) { const data = await res.json(); setItems((data.notifications ?? []).slice(0, 6)); } } catch {} setLoaded(true); }, []);
  const toggle = () => { const next = !open; setOpen(next); if (next && !loaded) void load(); };

  const respondToRequest = async (n: BellNotification, action: 'approve' | 'reject') => {
    setBusyId(n.id);
    const taskId = n.link?.split('/').filter(Boolean).pop();
    if (!taskId) { setBusyId(null); return; }
    const res = await fetch(`/api/tasks/${taskId}/complete-request`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: n.id, action }) });
    const d = await res.json().catch(() => ({}));
    setBusyId(null);
    if (res.ok) { setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)); router.refresh(); }
    else if (d.error) window.alert(d.error);
  };

  const openItem = async (n: BellNotification) => {
    if (n.type === 'TASK_COMPLETION_REQUEST' && !n.readAt) return;
    setBusyId(n.id);
    if (!n.readAt) await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' }).catch(() => undefined);
    setBusyId(null); setOpen(false); if (n.link) { router.push(n.link); router.refresh(); }
  };
  const markAll = async () => { setMarkingAll(true); const res = await fetch('/api/notifications', { method: 'POST' }); setMarkingAll(false); if (res.ok) { setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))); router.refresh(); } };

  return <div className="relative" ref={wrapRef}>
    <button onClick={toggle} className="relative rounded-full p-2 text-muted transition-colors hover:bg-accent-soft hover:text-accent" aria-label="الإشعارات"><Bell size={16} />{unread > 0 && <span className="absolute -top-0.5 -start-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-bold text-white">{unread > 9 ? '+9' : unread}</span>}</button>
    {open && <div className="absolute end-0 top-full w-80 pt-3"><div className="overflow-hidden rounded-xl border border-line bg-surface shadow-lift ring-1 ring-line">
      <div className="masthead flex items-center justify-between px-4 py-2.5"><p className="text-[10px] font-bold tracking-[1.5px] uppercase text-[var(--masthead-fg)]">الإشعارات</p>{unread > 0 && <button onClick={() => void markAll()} disabled={markingAll} className="flex items-center gap-1 text-[10px] font-bold text-[var(--masthead-muted)] transition-colors hover:text-[var(--masthead-fg)] disabled:opacity-50"><CheckCheck size={11} />تعليم الكل كمقروء</button>}</div>
      <ul className="max-h-80 overflow-y-auto overscroll-contain py-1">{!loaded ? <li className="px-4 py-6 text-center text-[11px] text-muted">جارٍ التحميل…</li> : items.length === 0 ? <li className="px-4 py-6 text-center text-[11px] text-muted">لا توجد إشعارات بعد</li> : items.map((n) => <li key={n.id}>
        <div className={cn('flex w-full items-start gap-2.5 px-4 py-3 text-start hover:bg-surface-alt/70', !n.readAt && 'bg-accent-soft')}>
          <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', !n.readAt ? 'bg-brass-soft text-brass-strong' : 'bg-surface-alt text-muted')}><Bell size={14} /></span>
          <span className="min-w-0 flex-1">
            <button onClick={() => void openItem(n)} disabled={busyId === n.id} className="block w-full text-start disabled:opacity-60">
              <span className="flex flex-wrap items-center gap-1.5"><span className={cn('text-[12px] font-bold', n.readAt ? 'text-muted' : 'text-ink-strong')}>{n.title}</span><span className="rounded bg-surface-alt px-1 py-px text-[9px] font-bold text-muted">{TYPE_LABEL[n.type] ?? n.type}</span></span>
              {n.body && <span className="mt-0.5 line-clamp-1 block text-[11px] text-muted">{n.body}</span>}
              <span className="mt-0.5 block text-[9.5px] text-faint">{timeAgo(n.createdAt)}</span>
            </button>
            {n.type === 'TASK_COMPLETION_REQUEST' && !n.readAt && <div className="mt-2 flex gap-1.5"><button onClick={() => void respondToRequest(n, 'approve')} disabled={busyId === n.id} className="rounded-lg bg-accent px-2 py-1 text-[10px] font-bold text-on-accent disabled:opacity-50">موافقة</button><button onClick={() => void respondToRequest(n, 'reject')} disabled={busyId === n.id} className="rounded-lg border border-red-600/30 bg-surface px-2 py-1 text-[10px] font-bold text-red-700 disabled:opacity-50">رفض</button></div>}
          </span>
          {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
        </div>
      </li>)}</ul>
      <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-line bg-inset px-4 py-2.5 text-center text-[11px] font-bold text-accent transition-colors hover:bg-accent-soft">عرض كل الإشعارات ←</Link>
    </div></div>}
  </div>;
}
