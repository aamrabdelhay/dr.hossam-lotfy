'use client';

import Link from 'next/link';
import { Clock, MapPin, MessageSquare, UserRound, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from './ui';
import { URGENCY_BORDER, URGENCY_DOT, UrgencyBadge } from './urgency';
import { formatDay, formatTimeOfDay } from '@/lib/dates';
import { TITLE_LABEL } from '@/lib/constants';
import type { TaskVM } from '@/lib/queries';

export function SessionCard({ task, showCase = true }: { task: TaskVM; showCase?: boolean }) {
  const dateLabel = task.scheduledDate
    ? formatDay(new Date(`${task.scheduledDate}T12:00:00`))
    : 'بالتنسيق';
  const time = formatTimeOfDay(task.scheduledTime);
  const done = task.status === 'COMPLETED';

  return (
    <Link
      href={`/sessions/${task.id}`}
      className={cn(
        'group block rounded-lg border border-navy-100 border-s-[3px] bg-white px-3 py-2.5 transition hover:shadow-md hover:border-navy-200',
        URGENCY_BORDER[task.urgency],
        done && 'opacity-70',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] font-extrabold text-navy-800">
          <span className={cn('h-1.5 w-1.5 rounded-full', URGENCY_DOT[task.urgency])} />
          {dateLabel}
          {time && (
            <span className="flex items-center gap-1 font-semibold text-navy-400">
              <Clock size={11} />
              {time}
            </span>
          )}
        </span>
        {!done && task.urgency !== 'past' && <UrgencyBadge urgency={task.urgency} />}
        {done && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <CheckCircle2 size={13} /> تم التنفيذ
          </span>
        )}
      </div>
      <p className="mt-1 line-clamp-1 text-[13px] font-semibold text-navy-700 group-hover:text-navy-950">
        <MapPin size={12} className="me-1 inline text-gold-600" />
        {task.location.name}
      </p>
      <div className="mt-1.5 flex items-center gap-1.5">
        {task.lawyers.slice(0, 3).map((l) => (
          <span key={l.id} className="flex items-center gap-1 rounded-full bg-ivory-100 py-0.5 pe-2 ps-0.5 text-[10px] font-bold text-navy-600">
            <Avatar name={l.name} src={l.photo} size={16} />
            {l.name.split(' ').slice(0, 2).join(' ')}
          </span>
        ))}
        {task.lawyers.length > 3 && (
          <span className="text-[10px] font-bold text-navy-300">+{task.lawyers.length - 3}</span>
        )}
        {task.lawyers.length === 0 && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-navy-300">
            <UserRound size={11} /> غير مسند
          </span>
        )}
        {task.commentCount > 0 && (
          <span className="ms-auto flex items-center gap-1 text-[10px] font-semibold text-navy-300">
            <MessageSquare size={11} />
            {task.commentCount}
          </span>
        )}
      </div>
      {showCase && (task.caseName || task.caseNumber) && (
        <p className="mt-1 truncate text-[10px] font-semibold text-navy-300">
          {task.caseName ? `${task.caseName} — ` : ''}
          {task.caseNumber}
        </p>
      )}
    </Link>
  );
}
