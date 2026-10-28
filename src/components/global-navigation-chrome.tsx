'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

export function GlobalNavigationChrome() {
  const pathname = usePathname();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const link = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin === window.location.origin && url.pathname !== window.location.pathname) setLoading(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  React.useEffect(() => {
    setLoading(false);
  }, [pathname]);

  if (!loading) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[300] h-1 bg-transparent"
      role="progressbar"
      aria-label="جاري فتح الصفحة"
      aria-valuetext="جاري فتح الصفحة"
    >
      <div className="h-full w-1/3 animate-pulse rounded-e-full bg-gold-500 shadow-[0_0_8px_rgba(212,169,63,0.55)]" />
    </div>
  );
}
