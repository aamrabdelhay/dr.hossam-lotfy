'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { SessionsDrawer, SessionsDrawerButton } from './session-sidebar';
import type { SidebarData } from '@/lib/queries';

/** Floating "الجلسات القادمة" button + drawer (mobile / tablet only). */
export function MobileSessions({ data, isAdmin }: { data: SidebarData; isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  if (pathname === '/auth') return null;
  return (
    <>
      <SessionsDrawerButton onOpen={() => setOpen(true)} />
      <SessionsDrawer open={open} onClose={() => setOpen(false)} data={data} isAdmin={isAdmin} />
    </>
  );
}
