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
check(manager.includes("shouldShowPwaActions(pathname ?? '')"), 'PWA action UI uses the route gate');
check(manager.includes('تثبيت التطبيق') && manager.includes('تفعيل التذكيرات'), 'both login actions remain present');
check(manager.includes('navigator.serviceWorker.register'), 'service-worker registration remains in place');
check(manager.includes('/api/push/subscribe'), 'push subscription mechanism remains in place');
check(footer.includes('{isLoggedIn && <div className="mt-4 flex justify-center"><Link href="/features"'), 'feature directory footer link is login-gated');
check(navbar.includes('overflow-y-auto overscroll-contain scroll-smooth'), 'quick navigation dropdown has internal scrolling');
check(navbar.includes('max-h-[calc(100dvh-5.5rem)]'), 'mobile navigation panel is viewport-bounded');

process.exit(fail ? 1 : 0);
