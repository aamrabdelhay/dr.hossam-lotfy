'use client';

import * as React from 'react';

/**
 * Shared state for the mobile sessions drawer so the BottomNav button and the
 * drawer (rendered inside MobileSessions) can talk without prop drilling.
 */
const SessionsUIContext = React.createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => undefined });

export function SessionsUIProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <SessionsUIContext.Provider value={{ open, setOpen }}>{children}</SessionsUIContext.Provider>;
}

export function useSessionsUI() {
  return React.useContext(SessionsUIContext);
}
