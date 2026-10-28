import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Cormorant_Garamond, IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';
import './form-indicators.css';
import { LawyerGuideEnhancements } from '@/components/lawyer-guide-enhancements';
import { Toaster } from '@/components/toasts';
import { GlobalNavigationChrome } from '@/components/global-navigation-chrome';
import { ScrollReveal } from '@/components/scroll-reveal';
import { SiteLanguageProvider } from '@/components/site-language';
import { LayoutNavbarRegion } from '@/components/layout-navbar-region';
import { LayoutWarningRegion } from '@/components/layout-warning-region';
import { LayoutFooterRegion } from '@/components/layout-footer-region';
import { LayoutMobileSessions } from '@/components/layout-mobile-sessions';

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant-local',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});
const ibmArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-ibm-arabic-local',
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Loutfi Law Firm — Law Firm Operations', template: '%s — Loutfi Law Firm' },
  description: 'Loutfi Law Firm internal platform for hearings, work locations, tasks, colleagues and daily office operations.',
};
export const viewport: Viewport = { themeColor: '#05080F', width: 'device-width', initialScale: 1 };

function NavbarSkeleton() {
  return (
    <header aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-[72px] border-b border-navy-100 bg-white/95 px-4 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4">
        <div className="h-9 w-28 animate-pulse rounded-xl bg-ivory-100" />
        <div className="hidden flex-1 justify-center gap-2 lg:flex">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-8 w-20 animate-pulse rounded-full bg-navy-50" />)}
        </div>
        <div className="h-9 w-24 animate-pulse rounded-full bg-navy-100" />
      </div>
    </header>
  );
}

/**
 * The root layout must not wait for session/branch/navigation queries. Each
 * slow shared area streams independently while the selected page can render.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html dir="rtl" lang="ar">
      <body className={cormorant.variable + ' ' + ibmArabic.variable + ' flex min-h-screen flex-col'}>
        <SiteLanguageProvider>
          <Suspense fallback={<NavbarSkeleton />}>
            <LayoutNavbarRegion />
          </Suspense>
          <GlobalNavigationChrome />
          <Suspense fallback={null}>
            <LayoutWarningRegion />
          </Suspense>
          <Suspense fallback={null}>
            <LayoutMobileSessions />
          </Suspense>
          <main className="flex-1 page-content">
            {children}
            <LawyerGuideEnhancements />
          </main>
          <ScrollReveal />
          <Suspense fallback={null}>
            <LayoutFooterRegion />
          </Suspense>
          <Toaster />
        </SiteLanguageProvider>
      </body>
    </html>
  );
}
