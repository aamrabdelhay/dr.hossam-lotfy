'use client';

import { SessionsDrawer } from './session-sidebar';
import { useSessionsUI } from './sessions-ui';
import type { SidebarData } from '@/lib/queries';

/**
 * Mobile sessions drawer — opened from the BottomNav "الجلسات" button via
 * SessionsUIProvider. (The old floating button is gone in the Command Center
 * layout; desktop uses the numbered SideNav → SESSIONS.)
 */
export function MobileSessions({ data, isAdmin }: { data: SidebarData; isAdmin: boolean }) {
  const { open, setOpen } = useSessionsUI();
  return <SessionsDrawer open={open} onClose={() => setOpen(false)} data={data} isAdmin={isAdmin} />;
}
