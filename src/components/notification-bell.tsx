'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

type BellNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const TYPE_LABEL: Record<string, string> = {
  TASK_ASSIGNED: 'مهمة جديدة',
  TASK_EDITED: 'تعديل مهمة',
  SESSION_CRITICAL: 'جلسة حرجة',
  SESSION_TOMORROW: 'جلسة غداً',
  COMMENT: 'تعليق',
  TASK_COMPLETED: 'تم التنفيذ',
  TASK_DELETED: 'حذف مهمة',
  POST_CREATED: 'بوست جديد',
  ANNOUNCEMENT: 'إعلان',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'الآن';
  if (min < 60) return `منذ ${min} د`;
  const h = Math.floor(min / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}

/**
 * جرس الإشعارات في الهيدر: يعرض آخر 6 إشعارات بروابط عميقة (تعليق →
 * /sessions/<id>#comment-<id>) مع تعليم الإشعار كمقروء عند فتحه وزر
 * «تعليم الكل كمقروء».
 */
export function NotificationBell({ unread }: { unread: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<BellNotification[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [markingAll, setMarkingAll] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setItems((data.notifications ?? []).slice(0, 6));
      }
    } catch {
      /* keep list as-is */
    }
    setLoaded(true);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) void load();
  };

  const openItem = async (n: BellNotification) => {
    setBusyId(n.id);
    if (!n.readAt) {
      await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' }).catch(() => undefined);
    }
    setBusyId(null);
    setOpen(false);
    if (n.link) {
      router.push(n.link);
      router.refresh();
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    const res = await fetch('/api/notifications', { method: 'POST' });
    setMarkingAll(false);
    if (res.ok) {
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      router.refresh();
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggle}
        className="relative rounded-full p-2 text-navy-400 transition-colors hover:bg-white/[0.06] hover:text-ivory-100"
        aria-label="الإشعارات"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -start-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-bold text-white">
            {unread > 9 ? '+9' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 top-full w-80 pt-3">
          <div className="overflow-hidden rounded-2xl border border-navy-100 bg-navy-850 shadow-lift ring-1 ring-navy-950/5">
            <div className="flex items-center justify-between bg-navy-900 px-4 py-2.5">
              <p className="text-[10px] font-bold tracking-[1.5px] uppercase text-gold-300" style={{ fontFamily: 'var(--font-arabic)' }}>
                الإشعارات
              </p>
              {unread > 0 && (
                <button
                  onClick={() => void markAll()}
                  disabled={markingAll}
                  className="flex items-center gap-1 text-[10px] font-bold text-white/60 hover:text-white disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-arabic)' }}
                >
                  <CheckCheck size={11} />
                  تعليم الكل كمقروء
                </button>
              )}
            </div>
            <ul className="max-h-80 overflow-y-auto overscroll-contain py-1">
              {!loaded ? (
                <li className="px-4 py-6 text-center text-[11px] text-navy-300">جارٍ التحميل…</li>
              ) : items.length === 0 ? (
                <li className="px-4 py-6 text-center text-[11px] text-navy-300" style={{ fontFamily: 'var(--font-arabic)' }}>
                  لا توجد إشعارات بعد
                </li>
              ) : (
                items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => void openItem(n)}
                      disabled={busyId === n.id}
                      className={cn(
                        'flex w-full items-start gap-2.5 px-4 py-3 text-start hover:bg-navy-800 disabled:opacity-60',
                        !n.readAt && 'bg-gold-500/[0.06]',
                      )}
                      style={{ fontFamily: 'var(--font-arabic)' }}
                    >
                      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded', !n.readAt ? 'bg-gold-500/15 text-gold-500' : 'bg-white/5 text-navy-400')}>
                        {n.type === 'TASK_COMPLETED' ? <CheckCheck size={14} /> : <Bell size={14} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className={cn('text-[12px] font-bold', n.readAt ? 'text-navy-300' : 'text-ivory-100')}>{n.title}</span>
                          <span className="rounded bg-white/5 px-1 py-px text-[9px] font-bold text-navy-400">{TYPE_LABEL[n.type] ?? n.type}</span>
                        </span>
                        {n.body && <span className="mt-0.5 line-clamp-1 block text-[11px] text-navy-300">{n.body}</span>}
                        <span className="mt-0.5 block text-[9.5px] text-navy-300">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-navy-100 bg-navy-800 px-4 py-2.5 text-center text-[11px] font-bold text-gold-500 transition-colors hover:bg-gold-500/10"
              style={{ fontFamily: 'var(--font-arabic)' }}
            >
              عرض كل الإشعارات ←
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
