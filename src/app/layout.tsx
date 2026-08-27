import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { WarningBar } from '@/components/warning-bar';
import { MobileSessions } from '@/components/mobile-sessions';
import { SideNav } from '@/components/side-nav';
import { BottomNav } from '@/components/bottom-nav';
import { CommandPalette } from '@/components/command-palette';
import { SessionsUIProvider } from '@/components/sessions-ui';
import { Toaster } from '@/components/toasts';
import { getSidebarData, type SidebarData } from '@/lib/queries';
import { getCurrentUser, type SessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isFrameworkError, redact } from '@/lib/health';

export const metadata: Metadata = {
  title: {
    default: 'LEGAL COMMAND CENTER — DR. HOSSAM LOTFY LAW FIRM',
    template: '%s — LEGAL COMMAND CENTER',
  },
  description:
    'منصة مكتب د. حسام لطفي للمحاماة: إدارة الجلسات والمحاكم والمهام والمتابعة اليومية للمحامين — من مين نازل فين، وإمتى، وهيعمل إيه.',
};

export const viewport: Viewport = {
  themeColor: '#090A0A',
  width: 'device-width',
  initialScale: 1,
};

const EMPTY_SIDEBAR: SidebarData = {
  warning: false,
  warningCount: 0,
  sections: {
    tomorrow: [],
    within3: [],
    within14: [],
    within30: [],
    all: [],
  },
};

type SafeLoad<T> = { value: T; unavailable: boolean };

/**
 * The global shell must remain renderable when a production database is down
 * or behind a migration. Never catch Next's dynamic/static rendering signals:
 * swallowing those special errors corrupts static rendering decisions.
 */
async function loadFailSoft<T>(label: string, operation: () => Promise<T>, fallback: T): Promise<SafeLoad<T>> {
  try {
    return { value: await operation(), unavailable: false };
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    console.error(`[layout] ${label} unavailable:`, redact(error));
    return { value: fallback, unavailable: true };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarResult, sessionResult] = await Promise.all([
    loadFailSoft('sidebar data', getSidebarData, EMPTY_SIDEBAR),
    loadFailSoft<SessionUser | null>('current session', getCurrentUser, null),
  ]);

  const sidebar = sidebarResult.value;
  const session = sessionResult.value;
  let databaseUnavailable = sidebarResult.unavailable || sessionResult.unavailable;
  let unread = 0;

  if (session) {
    const unreadResult = await loadFailSoft(
      'notification count',
      () =>
        session.role === 'admin'
          ? prisma.notification.count({ where: { userId: session.userId, readAt: null } })
          : prisma.notification.count({ where: { lawyerId: session.lawyerId, readAt: null } }),
      0,
    );
    unread = unreadResult.value;
    databaseUnavailable ||= unreadResult.unavailable;
  }

  return (
    <html dir="rtl" lang="ar">
      <body className="flex min-h-screen flex-col">
        <CommandPalette />
        <SideNav role={session?.role ?? null} />
        <Navbar
          session={
            session
              ? {
                  role: session.role,
                  name: session.name,
                  slug: session.role === 'lawyer' ? session.slug : undefined,
                  photo: session.role === 'lawyer' ? undefined : null,
                }
              : null
          }
          unread={unread}
        />
        {databaseUnavailable && (
          <div
            role="alert"
            className="border-b border-crit-700 bg-crit-700 px-4 py-2.5 text-center text-[12px] text-white"
            style={{ fontFamily: 'var(--font-arabic)' }}
          >
            قاعدة البيانات غير متاحة حالياً.{' '}
            <Link href="/api/health" className="underline decoration-white/60 underline-offset-4 hover:text-white/80">
              عرض تشخيص الخدمة
            </Link>
          </div>
        )}
        <WarningBar active={sidebar.warning} count={sidebar.warningCount} />
        {/* xl: side rail offset — 200px for the numbered SideNav; pb-24 clears the mobile BottomNav */}
        <main className="flex-1 pb-24 xl:pb-0 xl:ps-[200px]">{children}</main>
        <SessionsUIProvider>
          {/* Floating sessions drawer (mobile) — opened from the BottomNav */}
          <MobileSessions data={sidebar} isAdmin={session?.role === 'admin'} />
          <BottomNav />
        </SessionsUIProvider>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
