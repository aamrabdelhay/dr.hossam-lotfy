import { ACTIVITY_LABEL } from '@/lib/activity';
import { formatDateTime } from '@/lib/dates';
import type { ActivityLog } from '@/lib/prisma';

const ACTION_COLOR: Record<string, string> = {
  CREATED: 'bg-gold-500',
  EDITED: 'bg-white/[0.04]0',
  ASSIGNED: 'bg-gold-500',
  REASSIGNED: 'bg-white/[0.04]0',
  COMPLETED: 'bg-emerald-600',
  COMMENTED: 'bg-navy-300',
  DELETED: 'bg-red-500',
  PHOTO_UPDATED: 'bg-navy-300',
  PROFILE_UPDATED: 'bg-navy-300',
  LOCATION_ADDED: 'bg-gold-500',
  LAWYER_ADDED: 'bg-gold-500',
};

export function ActivityTimeline({ items }: { items: ActivityLog[] }) {
  return (
    <ol className="relative space-y-4 border-s-2 border-navy-100 ps-5">
      {items.map((a) => (
        <li key={a.id} className="relative">
          <span className={`absolute -start-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${ACTION_COLOR[a.action] ?? 'bg-navy-300'}`} />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="rounded bg-white/5 px-1.5 py-px text-[10px] font-extrabold text-navy-400">{ACTIVITY_LABEL[a.action] ?? a.action}</span>
            <p className="text-[13px] font-semibold leading-6 text-ivory-200">{a.summary}</p>
          </div>
          <p className="mt-0.5 text-[11px] font-semibold text-navy-300">{formatDateTime(a.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}
