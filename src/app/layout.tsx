import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { WarningBar } from '@/components/warning-bar';
import { MobileSessions } from '@/components/mobile-sessions';
import { LawyerGuideEnhancements } from '@/components/lawyer-guide-enhancements';
import { Toaster } from '@/components/toasts';
import { getSiteNav } from '@/lib/site-data';
import { getSidebarData, type SidebarData } from '@/lib/queries';
import { getCurrentUser, type SessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NavLawyer, NavLocation } from '@/lib/constants';
import { isFrameworkError, redact } from '@/lib/health';

// Authentication is request-specific. Never allow the root layout to be
// statically cached or reused between signed-in and signed-out visitors.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: { default: 'DR. HOSSAM LOTFY LAW FIRM — نظام إدارة الجلسات والمهام', template: '%s — DR. HOSSAM LOTFY LAW FIRM' },
  description: 'منصة مكتب د. حسام لطفي للمحاماة: إدارة الجلسات والمحاكم والمهام والمتابعة اليومية للمحامين — من مين نازل فين، وإمتى، وهيعمل إيه.',
};
export const viewport: Viewport = { themeColor: '#05080F', width: 'device-width', initialScale: 1 };
const EMPTY_NAV = { lawyers: [] as NavLawyer[], locations: [] as NavLocation[] };
const EMPTY_SIDEBAR: SidebarData = { warning: false, warningCount: 0, sections: { tomorrow: [], within3: [], within14: [], within30: [], all: [] } };
type SafeLoad<T> = { value: T; unavailable: boolean };

async function loadFailSoft<T>(label: string, operation: () => Promise<T>, fallback: T): Promise<SafeLoad<T>> {
  try { return { value: await operation(), unavailable: false }; }
  catch (error) { if (isFrameworkError(error)) throw error; console.error(`[layout] ${label} unavailable:`, redact(error)); return { value: fallback, unavailable: true }; }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [navResult, sidebarResult, sessionResult] = await Promise.all([
    loadFailSoft('site navigation', getSiteNav, EMPTY_NAV),
    loadFailSoft('sidebar data', getSidebarData, EMPTY_SIDEBAR),
    loadFailSoft<SessionUser | null>('current session', getCurrentUser, null),
  ]);
  const nav = navResult.value;
  const sidebar = sidebarResult.value;
  const session = sessionResult.value;
  let databaseUnavailable = navResult.unavailable || sidebarResult.unavailable || sessionResult.unavailable;
  let unread = 0;
  if (session) {
    const unreadResult = await loadFailSoft('notification count', () => session.role === 'admin' ? prisma.notification.count({ where: { userId: session.userId, readAt: null } }) : prisma.notification.count({ where: { lawyerId: session.lawyerId, readAt: null } }), 0);
    unread = unreadResult.value;
    databaseUnavailable ||= unreadResult.unavailable;
  }

  return (
    <html dir="rtl" lang="ar">
      <body className="flex min-h-screen flex-col">
        <Navbar lawyers={nav.lawyers} locations={nav.locations} session={session ? { role: session.role, name: session.name, slug: session.role === 'lawyer' ? session.slug : undefined, photo: session.role === 'lawyer' ? undefined : null } : null} unread={unread} />
        {databaseUnavailable && <div role="alert" className="border-b border-[#7A1F2B] bg-[#7A1F2B] px-4 py-2.5 text-center text-[12px] text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>قاعدة البيانات غير متاحة حالياً.{' '}<Link href="/api/health" className="underline decoration-white/60 underline-offset-4 hover:text-[#F4F6F9]">عرض تشخيص الخدمة</Link></div>}
        <WarningBar active={sidebar.warning} count={sidebar.warningCount} />
        <main className="flex-1">{children}<LawyerGuideEnhancements /></main>
        <MobileSessions data={sidebar} isAdmin={session?.role === 'admin'} />
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
