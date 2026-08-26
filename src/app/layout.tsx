import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { WarningBar } from '@/components/warning-bar';
import { MobileSessions } from '@/components/mobile-sessions';
import { Toaster } from '@/components/toasts';
import { getSiteNav } from '@/lib/site-data';
import { getSidebarData } from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: {
    default: 'DR. HOSSAM LOTFY LAW FIRM — نظام إدارة الجلسات والمهام',
    template: '%s — DR. HOSSAM LOTFY LAW FIRM',
  },
  description:
    'منصة مكتب د. حسام لطفي للمحاماة: إدارة الجلسات والمحاكم والمهام والمتابعة اليومية للمحامين — من مين نازل فين، وإمتى، وهيعمل إيه.',
};

export const viewport: Viewport = {
  themeColor: '#07111C',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [nav, sidebar, session] = await Promise.all([getSiteNav(), getSidebarData(), getCurrentUser()]);

  let unread = 0;
  if (session) {
    unread =
      session.role === 'admin'
        ? await prisma.notification.count({ where: { userId: session.userId, readAt: null } })
        : await prisma.notification.count({ where: { lawyerId: session.lawyerId, readAt: null } });
  }

  return (
    <html dir="rtl" lang="ar">
      <body className="flex min-h-screen flex-col">
        <Navbar
          lawyers={nav.lawyers}
          locations={nav.locations}
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
        <WarningBar active={sidebar.warning} count={sidebar.warningCount} />
        <main className="flex-1">{children}</main>
        <Footer />
        <MobileSessions data={sidebar} isAdmin={session?.role === 'admin'} />
        <Toaster />
      </body>
    </html>
  );
}
