import { WarningBarClient } from '@/app/warning-bar-client';

/**
 * Two-week warning banner: shown whenever any open session falls within the
 * next 14 days. Purely date-driven — recomputed on every render from live data.
 */
export function WarningBar({ active, count }: { active: boolean; count: number }) {
  if (!active) return null;
  return <WarningBarClient count={count} />;
}
