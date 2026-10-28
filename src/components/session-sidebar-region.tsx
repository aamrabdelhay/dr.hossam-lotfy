import { SessionSidebar } from '@/components/session-sidebar';
import { getSidebarData } from '@/lib/queries';
import { isFrameworkError, redact } from '@/lib/health';

export function SessionSidebarFallback() {
  return (
    <div aria-busy="true" aria-label="تحميل الجلسات" className="rounded-2xl border border-navy-100 bg-white p-4">
      <div className="h-3 w-28 animate-pulse rounded bg-navy-100" />
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="mt-4 rounded-xl border border-navy-50 p-3">
          <div className="h-2.5 w-2/3 animate-pulse rounded bg-navy-100" />
          <div className="mt-2 h-2 w-full animate-pulse rounded bg-navy-50" />
        </div>
      ))}
    </div>
  );
}

export async function SessionSidebarRegion({ isAdmin }: { isAdmin: boolean }) {
  try {
    const data = await getSidebarData();
    return <SessionSidebar data={data} isAdmin={isAdmin} />;
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    console.error('[session-sidebar] data unavailable:', redact(error));
    return <div role="status" className="rounded-2xl border border-navy-100 bg-white p-4 text-xs font-semibold text-navy-400">تعذر تحميل قائمة الجلسات حاليًا.</div>;
  }
}
