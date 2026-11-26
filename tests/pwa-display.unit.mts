import { readFileSync } from 'node:fs';
import { shouldShowPwaActions } from '../src/lib/pwa-display-core.ts';

let fail = 0;
const check = (condition: boolean, label: string) => {
  console.log((condition ? 'PASS ' : 'FAIL ') + label);
  if (!condition) fail++;
};
check(shouldShowPwaActions('/auth'), 'PWA actions are enabled on the login page');
check(!shouldShowPwaActions('/admin/office'), 'PWA actions are hidden on internal pages');
check(!shouldShowPwaActions('/'), 'PWA actions are hidden on the home page');

const manager = readFileSync('src/components/pwa-push-manager.tsx', 'utf8');
const footer = readFileSync('src/components/footer.tsx', 'utf8');
const navbar = readFileSync('src/components/navbar.tsx', 'utf8');
const globalCss = readFileSync('src/app/globals.css', 'utf8');
const serviceWorker = readFileSync('public/sw.js', 'utf8');
const vercelBuild = readFileSync('scripts/vercel-build.mjs', 'utf8');
check(manager.includes("shouldShowPwaActions(pathname ?? '')"), 'PWA action UI uses the route gate');
check(manager.includes('تثبيت التطبيق') && manager.includes('تفعيل التذكيرات'), 'both login actions remain present');
check(manager.includes("navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })"), 'service worker bypasses HTTP cache while checking for a new version');
check(manager.includes('currentRegistration.update()') && manager.includes('5 * 60_000'), 'PWA checks for app updates on a five-minute interval');
check(manager.includes("addEventListener('controllerchange', onControllerChange)"), 'PWA detects when a new service worker controls the app');
check(manager.includes('تحديث الآن') && manager.includes('window.location.reload()'), 'PWA offers a safe reload action when an update is ready');
check(manager.includes('/api/push/subscribe'), 'push subscription mechanism remains in place');
check(serviceWorker.includes("const APP_BUILD_ID = '__APP_BUILD_ID__';") && serviceWorker.includes('self.skipWaiting()'), 'service worker exposes a per-build version marker and activates updates');
check(vercelBuild.includes('VERCEL_GIT_COMMIT_SHA') && vercelBuild.includes('stamped service worker'), 'every Vercel build stamps a unique service-worker version');
const pageContentRule = globalCss.match(/\.page-content\{[^}]*\}/)?.[0] ?? '';
check(!pageContentRule.includes('transform') && !pageContentRule.includes('animation'), 'main page wrapper does not trap fixed dialogs in a stacking context');
check(footer.includes('{isLoggedIn && <div className="mt-4 flex justify-center"><Link href="/features"'), 'feature directory footer link is login-gated');
check(navbar.includes('overflow-y-auto overscroll-contain scroll-smooth'), 'quick navigation dropdown has internal scrolling');
check(navbar.includes('max-h-[calc(100dvh-5.5rem)]'), 'mobile navigation panel is viewport-bounded');

process.exit(fail ? 1 : 0);
