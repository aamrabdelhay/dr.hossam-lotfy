'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { PostCard } from './post-card';
import { Button } from './ui';
import type { TaskVM } from '@/lib/queries';

export function FeedWindow({ tasks, sessionRole, sessionLawyerId, canWriteTasks }: { tasks: TaskVM[]; sessionRole?: 'admin' | 'lawyer'; sessionLawyerId?: string; canWriteTasks: boolean }) {
  const [expanded, setExpanded] = React.useState(false);
  const initial = tasks.filter((t) => t.daysLeft === null || (t.daysLeft >= 0 && t.daysLeft <= 4));
  const visible = expanded ? tasks : initial;
  const hiddenCount = Math.max(0, tasks.length - initial.length);

  return <>
    <div className="space-y-4">
      {visible.map((t) => <PostCard key={t.id} task={t} sessionRole={sessionRole} sessionLawyerId={sessionLawyerId} canWriteTasks={canWriteTasks} />)}
    </div>
    {!expanded && hiddenCount > 0 && <div className="flex justify-center pt-2"><Button variant="outline" className="w-full max-w-xs" onClick={() => setExpanded(true)}><ChevronDown size={15} /> عرض المزيد</Button></div>}
  </>;
}
