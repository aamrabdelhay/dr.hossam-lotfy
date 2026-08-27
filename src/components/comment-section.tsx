'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Pencil, Trash2, Send } from 'lucide-react';
import {Avatar, Button, Input} from './ui';import { cn } from '@/lib/cn';
import { toastSuccess, toastError } from './toasts';
import { formatDateTime } from '@/lib/dates';

export type CommentVM = {
  id: string;
  text: string;
  createdAt: string;
  author: { name: string; photo: string | null } | null;
  authorRole: 'lawyer' | 'admin' | 'guest';
  isMine: boolean;
  canDelete: boolean;
};

export function CommentSection({ taskId, comments, sessionRole, sessionLawyerId, onChanged }: {
  taskId: string;
  comments: CommentVM[];
  sessionRole?: 'admin' | 'lawyer';
  sessionLawyerId?: string;
  onChanged?: (comments: CommentVM[]) => void;
}) {
  const router = useRouter();
  const [text, setText] = React.useState('');
  const [guestName, setGuestName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);

  // إشعار التعليق يفتح الرابط العميق /sessions/<id>#comment-<id> —
  // أبرِز التعليق المستهدف ومرّر إليه (يتعامل أيضاً مع تغيّر الهاش
  // بعد التنقل أو بعد تحميل التعليقات).
  React.useEffect(() => {
    const match = /^#comment-(.+)$/.exec(window.location.hash);
    if (!match) return;
    const id = decodeURIComponent(match[1]);
    setHighlightId(id);
    const target = document.getElementById(`comment-${id}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  React.useEffect(() => {
    if (!highlightId) return;
    const target = document.getElementById(`comment-${highlightId}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId, comments, expanded]);

  React.useEffect(() => {
    const onHash = () => {
      const match = /^#comment-(.+)$/.exec(window.location.hash);
      if (match) {
        setHighlightId(decodeURIComponent(match[1]));
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const refetch = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      if (res.ok) {
        const data: { comments: CommentVM[] } = await res.json();
        onChanged?.(data.comments);
      }
    } catch {
      /* ignore */
    }
  };

  const canComment = true; // guests may comment with a name
  const isGuest = !sessionRole;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (isGuest && !guestName.trim()) {
      toastError('من فضلك أدخل اسمك لإضافة التعليق.');
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: body, ...(isGuest ? { name: guestName.trim() } : {}) }),
    });
    setBusy(false);
    if (res.ok) {
      setText('');
      toastSuccess('تمت إضافة التعليق.');
      await refetch();
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toastError(d.error ?? 'تعذر إضافة التعليق.');
    }
  };

  const saveEdit = async (id: string) => {
    const body = editText.trim();
    if (!body) return;
    setBusy(true);
    const res = await fetch(`/api/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: body }),
    });
    setBusy(false);
    if (res.ok) {
      setEditingId(null);
      toastSuccess('تم تعديل التعليق.');
      await refetch();
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toastError(d.error ?? 'تعذر تعديل التعليق.');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;
    setBusy(true);
    const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) {
      toastSuccess('تم حذف التعليق.');
      await refetch();
      router.refresh();
    } else {
      toastError('تعذر حذف التعليق.');
    }
  };

  return (
    <div className="border-t border-navy-100 bg-ivory-50/60 px-4 py-3">
      {comments.length > 0 && (
        <div className="mb-3 space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              id={`comment-${c.id}`}
              className={cn(
                'flex scroll-mt-28 gap-2.5 rounded-lg px-2 py-1.5 -mx-2 transition-colors',
                highlightId === c.id && 'comment-highlight bg-gold-500/15 ring-1 ring-gold-500/40',
              )}
            >
              <Avatar name={c.author?.name ?? 'زائر'} src={c.author?.photo} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[12px] font-extrabold text-navy-900">{c.author?.name ?? 'زائر'}</span>
                  {c.authorRole === 'admin' && <span className="rounded bg-navy-900 px-1 text-[9px] font-bold text-ivory-100">مسؤول</span>}
                  <span className="text-[10px] font-medium text-navy-300">{formatDateTime(new Date(c.createdAt))}</span>
                  <span className="ms-auto flex items-center gap-1">
                    {c.isMine && (
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setEditText(c.text);
                        }}
                        className="rounded p-1 text-navy-300 hover:text-navy-600"
                        title="تعديل"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                    {c.canDelete && (
                      <button onClick={() => remove(c.id)} className="rounded p-1 text-navy-300 hover:text-red-600" title="حذف">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </span>
                </div>
                {editingId === c.id ? (
                  <div className="mt-1 flex gap-1.5">
                    <Input value={editText} onChange={(e) => setEditText(e.target.value)} className="h-8 text-[12px]" />
                    <Button size="sm" onClick={() => saveEdit(c.id)} disabled={busy}>حفظ</Button>
                  </div>
                ) : (
                  <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-6 text-navy-700">{c.text}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="flex-1">
          {isGuest && (
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="اسمك (للعرض فقط)"
              className="mb-1.5 h-8 text-[12px]"
            />
          )}
          <div className="flex gap-1.5">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="أضف ملاحظة أو تنبيهاً…"
              className="h-9 text-[13px]"
            />
            <Button type="submit" size="sm" className="h-9" disabled={busy || !text.trim()}>
              <Send size={14} className="-scale-x-100" />
            </Button>
          </div>
        </div>
      </form>
      {comments.length > 4 && !expanded && (
        <button onClick={() => setExpanded(true)} className="mt-2 flex items-center gap-1 text-[11px] font-bold text-gold-700 hover:underline">
          <MessageSquare size={12} />
          عرض كل التعليقات
        </button>
      )}
    </div>
  );
}
