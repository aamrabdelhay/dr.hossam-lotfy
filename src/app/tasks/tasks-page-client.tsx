'use client';

import { TaskCreator } from '@/components/admin/task-creator';
import type { NavLocation } from '@/lib/constants';

type Props = {
  locations: NavLocation[];
  lawyers: Array<{ id: string; name: string; isPrincipal?: boolean }>;
  cases: Array<{ id: string; name: string; number: string }>;
  ownPost: boolean;
};

export function TasksPageClient({ locations, lawyers, cases, ownPost }: Props) {
  return <TaskCreator open locations={locations} lawyers={lawyers} cases={cases} ownPost={ownPost} />;
}
