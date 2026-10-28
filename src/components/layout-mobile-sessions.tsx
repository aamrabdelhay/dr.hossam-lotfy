import Link from 'next/link';
import { getSidebarData, type SidebarData } from '@/lib/queries';
import { MobileSessions } from '@/components/mobile-sessions';
import { isFrameworkError, redact } from '@/lib/health';

const EMPTY_SIDEBAR: SidebarData = {
  warning: false,
  warningCount: 0,
  sections: { tomorrow: [], within3: [], within14: [], within30: [], all: [] },
};

export async function LayoutMobileSessions({
  enabled,
  isAdmin,
}: {
  enabled: boolean;
  isAdmin: boolean;
}) {
  let data = EMPTY_SIDEBAR;
  let unavailable = false;

  if (enabled) {
    try {
      data = await getSidebarData();
    } catch (error) {
      if (isFrameworkError(error)) throw error;
      unavailable = true;
      console.error('[layout] sidebar data unavailable:', redact(error));
    }
  }

  return (
    <>
      {unavailable && (
        <div role="alert" className="border-b border-[#7A1F2B] bg-[#7A1F2B] px-4 py-2.5 text-center text-[12px] text-white">
          تعذر تحميل بعض بيانات المكتب.{' '}
          <Link href="/api/health" className="underline">التشخيص</Link>
        </div>
      )}
      <MobileSessions data={data} isAdmin={isAdmin} />
    </>
  );
}
