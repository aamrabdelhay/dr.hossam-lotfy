import { Footer } from '@/components/footer';
import { OfficeAssistant } from '@/components/admin/office-assistant';
import { OfficeActivityTracker } from '@/components/office-activity-tracker';
import { getCurrentUser } from '@/lib/auth';
import { isFrameworkError, redact } from '@/lib/health';

export async function LayoutFooterRegion() {
  const session = await getCurrentUser().catch((error) => {
    if (isFrameworkError(error)) throw error;
    console.error('[layout] footer session unavailable:', redact(error));
    return null;
  });
  return (
    <>
      {session && (
        <>
          <OfficeAssistant />
          <OfficeActivityTracker />
        </>
      )}
      <Footer isLoggedIn={Boolean(session)} />
    </>
  );
}
