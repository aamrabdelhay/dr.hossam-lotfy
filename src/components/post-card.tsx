'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  CalendarDays,
  Clock,
  FileText,
  MessageSquare,
  CheckCheck,
  Pencil,
  Trash2,
  UserRound,
  StickyNote,
} from 'lucide-react';
import {Avatar, Badge, Button, Card, Modal} from './ui';import { cn } from '@/lib/cn';
import { StatusBadge, UrgencyBadge } from './urgency';
import { CommentSection, type CommentVM } from './comment-section';
import { toastSuccess, toastError } from './toasts';
import { formatDay, formatTimeOfDay, formatDateTime } from '@/lib/dates';
import { TITLE_LABEL, getOfficeProfileHref } from '@/lib/constants';
import { canCompleteTask } from '@/lib/tasks';
import { CompleteTaskButton } from './complete-task-button';
import type { TaskVM } from '@/lib/queries';

export type PostCardProps = {
  task: TaskVM;
  comments?: CommentVM[];
  sessionRole?: 'admin' | 'lawyer';
  sessionLawyerId?: string;
  /** Admin writeTasks permission — allows closing on behalf of the lawyer. */
  canWriteTasks?: boolean;
  showComments?: boolean;
  initiallyOpen?: boolean;
};

export function PostCard({ task, comments = [], sessionRole, sessionLawyerId, canWriteTasks, showComments = true, initiallyOpen = false }: PostCardProps) {
  const router = useRouter();
  const [commentsOpen, setCommentsOpen] = React.useState(initiallyOpen);
  const [busy, setBusy] = React.useState(false);
  const [confirmBusy, setConfirmBusy] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [commentsCache, setCommentsCache] = React.useState<CommentVM[]>(comments);
  const fetchedRef = React.useRef(comments.length > 0 || task.commentCount === 0);

  React.useEffect(() => {
    if (initiallyOpen && !fetchedRef.current) {
      fetchedRef.current = true;
      fetch(`/api/tasks/${task.id}/comments`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setCommentsCache(d.comments))
        .catch(() => undefined);
    }
  }, [initiallyOpen, task.id]);

  const toggleComments = async () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && !fetchedRef.current) {
      fetchedRef.current = true;
      try {
        const res = await fetch(`/api/tasks/${task.id}/comments`);
        if (res.ok) {
          const data: { comments: CommentVM[] } = await res.json();
          setCommentsCache(data.comments);
        }
      } catch {
        /* keep current list */
      }
    }
  };

  const iAmAuthor = sessionRole === 'lawyer' && task.author?.id === sessionLawyerId;
  const isAdmin = sessionRole === 'admin';
  const isAssignedLawyer = sessionRole === 'lawyer' && !!sessionLawyerId && task.lawyerIds.includes(sessionLawyerId);
  const canConfirm = isAdmin || isAssignedLawyer;

  const canComplete = canCompleteTask(
    sessionRole
      ? { role: sessionRole, lawyerId: sessionLawyerId, canWriteTasks: isAdmin ? canWriteTasks : undefined }
      : null,
    task,
  );
  const canEdit = isAdmin || iAmAuthor;
  const canDelete = isAdmin;

  const confirmTask = async () => {
    if (confirmBusy || confirmed) return;
    setConfirmBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/confirm`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfirmed(true);
        toastSuccess('تم تأكيد المهمة وإرسال رسالة التأكيد بالبريد.');
        router.refresh();
      } else {
        toastError(data.error ?? 'تعذر إرسال تأكيد المهمة.');
      }
    } catch {
      toastError('تعذر الاتصال بالخادم لإرسال تأكيد المهمة.');
    } finally {
      setConfirmBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) {
      setConfirmDelete(false);
      toastSuccess('تم حذف المهمة.');
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toastError(d.error ?? 'تعذر الحذف.');
    }
  };

  const dateLabel = task.scheduledDate ? formatDay(new Date(`${task.scheduledDate}T12:00:00`)) : null;
  const time = formatTimeOfDay(task.scheduledTime);

  return (
    <Card className="animate-fade-in-up overflow-hidden">
      <div className="flex items-start gap-3 px-4 pt-4">
        <Link href={getOfficeProfileHref(task)} aria-label={task.author ? `صفحة ${task.author.name}` : 'صفحة إدارة المكتب'}>
          {task.author ? (
            <Avatar name={task.author.name} src={task.author.photo} size={42} ring />
          ) : (
            <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-navy-950 text-gold-400 ring-2 ring-gold-500/60 ring-offset-2 ring-offset-white">
              <FileText size={18} />
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link href={getOfficeProfileHref(task)} className="truncate text-[14px] font-extrabold text-navy-950 hover:underline">
              {task.author ? task.author.name : 'إدارة المكتب'}
            </Link>
            {task.author ? (
              <Badge tone="gold">{TITLE_LABEL[task.author.title]}</Badge>
            ) : (
              <Badge tone="navy">إدارة</Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-navy-300">
            <span>{formatDateTime(new Date(task.createdAt))}</span>
            {dateLabel && (
              <span className="flex items-center gap-1">
                <CalendarDays size={11} />
                {dateLabel}
                {time && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {time}
                  </span>
                )}
              </span>
            )}
            <Link href={`/locations/${task.location.slug}`} className="flex items-center gap-1 text-gold-700 hover:underline">
              <MapPin size={11} />
              {task.location.name}
            </Link>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={task.status} />
          {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && task.scheduledDate && (
            <UrgencyBadge urgency={task.urgency} />
          )}
        </div>
      </div>

      <div className="px-4 pb-3 pt-3">
        <Link href={`/sessions/${task.id}`} className="block">
          <p className="text-[14px] font-semibold leading-7 text-navy-800 hover:text-navy-950">{task.description}</p>
        </Link>
        {task.notes && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-gold-500/25 bg-gold-500/[0.06] px-3 py-2">
            <StickyNote size={13} className="mt-1 shrink-0 text-gold-600" />
            <p className="text-[12.5px] leading-6 text-navy-700">{task.notes}</p>
          </div>
        )}
        {(task.caseName || task.caseNumber) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="outline" className="font-latin">
              <FileText size={11} />
              {task.caseName ?? ''} {task.caseNumber ?? ''}
            </Badge>
          </div>
        )}

        {task.lawyers.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-navy-400">المكلّفون:</span>
            {task.lawyers.map((l) => (
              <Link
                key={l.id}
                href={`/lawyers/${l.slug}`}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border py-0.5 pe-2.5 ps-1 text-[11px] font-bold transition',
                  l.completed
                    ? 'border-emerald-600/30 bg-emerald-600/5 text-emerald-700'
                    : 'border-navy-200 bg-ivory-50 text-navy-700 hover:border-gold-500',
                )}
              >
                <Avatar name={l.name} src={l.photo} size={18} />
                {l.name}
                {l.completed && <CheckCheck size={11} className="text-emerald-600" />}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 border-t border-navy-100 px-2 py-1.5">
        {showComments && (
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-bold text-navy-500 hover:bg-navy-900/5"
          >
            <MessageSquare size={14} />
            {commentsCache.length > 0 || task.commentCount > 0 ? `${task.commentCount} تعليق` : 'تعليق'}
          </button>
        )}
        {canConfirm && (
          <button
            onClick={confirmTask}
            disabled={confirmBusy || confirmed}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-bold transition',
              confirmed
                ? 'cursor-default bg-emerald-600/10 text-emerald-700'
                : 'text-navy-600 hover:bg-gold-500/10 hover:text-gold-700',
            )}
            title="إرسال تأكيد المهمة بالبريد الإلكتروني"
          >
            <CheckCheck size={14} />
            {confirmBusy ? 'جارٍ التأكيد...' : confirmed ? 'تم التأكيد' : 'تأكيد'}
          </button>
        )}
        {canComplete && <CompleteTaskButton taskId={task.id} label={isAdmin ? 'إنهاء نيابةً عن المحامي' : 'تم التنفيذ'} />}
        {canEdit && (
          <Link href={`/sessions/${task.id}?edit=1`}>
            <Button size="sm" variant="ghost" className="ms-auto">
              <Pencil size={13} />
              تعديل
            </Button>
          </Link>
        )}
        {canDelete && (
          <button onClick={() => setConfirmDelete(true)} className="rounded-md p-2 text-navy-300 hover:bg-red-600/10 hover:text-red-600" title="حذف">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {showComments && commentsOpen && (
        <CommentSection
          taskId={task.id}
          comments={commentsCache}
          sessionRole={sessionRole}
          sessionLawyerId={sessionLawyerId}
          onChanged={setCommentsCache}
        />
      )}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="تأكيد الحذف"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>إلغاء</Button>
            <Button variant="danger" onClick={remove} disabled={busy}>حذف نهائي</Button>
          </div>
        }
      >
        <p className="text-sm leading-7 text-navy-700">
          سيتم حذف المهمة وجميع تعليقاتها نهائياً من الفيد وصفحات المحامين والمواقع. لا يمكن التراجع عن هذا الإجراء.
        </p>
      </Modal>
    </Card>
  );
}
