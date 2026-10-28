import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getAllBranches } from '@/lib/branch-access';
import { getCurrentUser, type SessionUser } from '@/lib/auth';
import { isFinanceManagement, isSeniorManagement, isOfficeManager } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
import type { NavLawyer, NavLocation } from '@/lib/constants';
import { getSiteNav, getSiteBranding } from '@/lib/site-data';
import { isFrameworkError, redact } from '@/lib/health';

const EMPTY_NAV = { lawyers: [] as NavLawyer[], locations: [] as NavLocation[] };
const EMPTY_BRANDING = { logoDataUrl: null as string | null };
const EMPTY_BRANCHES: Array<{ id: string; name_ar: string; address: string; is_main: boolean }> = [];

type SafeLoad<T> = { value: T; unavailable: boolean };

async function loadFailSoft<T>(label: string, operation: () => Promise<T>, fallback: T): Promise<SafeLoad<T>> {
  try {
    return { value: await operation(), unavailable: false };
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    console.error('[layout] ' + label + ' unavailable:', redact(error));
    return { value: fallback, unavailable: true };
  }
}

/** Loads data for the persistent navigation behind a Suspense boundary. */
export async function LayoutNavbarRegion() {
  const [navResult, brandingResult, sessionResult, branchesResult] = await Promise.all([
    loadFailSoft('site navigation', getSiteNav, EMPTY_NAV),
    loadFailSoft('site branding', getSiteBranding, EMPTY_BRANDING),
    loadFailSoft<SessionUser | null>('current session', getCurrentUser, null),
    loadFailSoft('office branches', getAllBranches, EMPTY_BRANCHES),
  ]);
  const session = sessionResult.value;
  const [managementResult, unreadResult] = await Promise.all([
    session
      ? Promise.all([
          isSeniorManagement(session).catch(() => false),
          isFinanceManagement(session).catch(() => false),
          isOfficeManager(session).catch(() => false),
        ] as const)
      : Promise.resolve([false, false, false] as const),
    session
      ? (() => {
          const owner = session.role === 'admin' ? { userId: session.userId } : { lawyerId: session.lawyerId };
          const now = new Date();
          const where = session.role === 'admin'
            ? { ...owner, readAt: null }
            : { ...owner, readAt: null, OR: [{ type: { not: 'PERSONAL_REMINDER' } }, { type: 'PERSONAL_REMINDER', createdAt: { lte: now } }] };
          return loadFailSoft('notification count', () => prisma.notification.count({ where }), 0);
        })()
      : Promise.resolve({ value: 0, unavailable: false }),
  ]);
  const [isSenior, isFinance, isOffice] = managementResult;
  const unavailable = navResult.unavailable || brandingResult.unavailable || sessionResult.unavailable || branchesResult.unavailable || unreadResult.unavailable;
  return (
    <>
      <Navbar
        lawyers={navResult.value.lawyers}
        locations={navResult.value.locations}
        branches={branchesResult.value}
        logoDataUrl={brandingResult.value.logoDataUrl}
        session={session ? {
          role: session.role,
          name: session.name,
          slug: session.role === 'lawyer' ? session.slug : undefined,
          photo: null,
          isAdmin: session.role === 'admin' || (session.role === 'lawyer' && session.isAdmin),
          isFinance,
          isSenior,
          isOffice,
        } : null}
        unread={unreadResult.value}
      />
      {unavailable && (
        <div role="alert" className="border-b border-[#7A1F2B] bg-[#7A1F2B] px-4 py-2.5 text-center text-[12px] text-white">
          تعذر تحميل بعض بيانات المكتب.{' '}
          <Link href="/api/health" className="underline">التشخيص</Link>
        </div>
      )}
    </>
  );
}
