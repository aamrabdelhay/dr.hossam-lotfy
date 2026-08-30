'use client';

import { useEffect } from 'react';

const routes: Record<string, string> = {
  'تكليفات': '/tasks',
  'تكليف': '/tasks',
  'إضافة محامي': '/admin?tab=lawyers&standalone=1',
  'إضافة محكمة أو جهة': '/admin?tab=locations&standalone=1',
  'أرشيف القضايا': '/admin?tab=cases&standalone=1',
};

function wire() {
  for (const button of Array.from(document.querySelectorAll('button'))) {
    const label = button.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const target = Object.entries(routes).find(([key]) => label.includes(key))?.[1];
    if (!target || button.getAttribute('data-quick-nav-wired') === '1') continue;
    button.setAttribute('data-quick-nav-wired', '1');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href = target;
    }, true);
  }
  for (const link of Array.from(document.querySelectorAll('a'))) {
    const label = link.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const target = label.includes('أرشيف القضايا') ? routes['أرشيف القضايا'] : null;
    if (!target || link.getAttribute('data-quick-nav-wired') === '1') continue;
    link.setAttribute('data-quick-nav-wired', '1');
    link.setAttribute('href', target);
  }
}

function hideAdminChrome() {
  if (!window.location.search.includes('standalone=1')) return;
  const heading = Array.from(document.querySelectorAll('h1')).find((el) => el.textContent?.includes('منطقة الإدارة'));
  heading?.closest('[class*="overflow-hidden"]')?.setAttribute('style', 'display:none');
  const overviewTab = Array.from(document.querySelectorAll('button')).find((el) => el.textContent?.trim() === 'نظرة عامة');
  overviewTab?.parentElement?.parentElement?.setAttribute('style', 'display:none');
}

export function QuickNavigationFix() {
  useEffect(() => {
    wire();
    hideAdminChrome();
    const observer = new MutationObserver(() => { wire(); hideAdminChrome(); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
