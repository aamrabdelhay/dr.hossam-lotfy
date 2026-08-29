'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Light/Dark theme toggle. The initial theme is applied by an inline script
 * in <head> (see layout.tsx) to avoid a flash; this component simply reads
 * the applied attribute, toggles it, and persists the choice.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    setTheme(current);
  }, []);

  const toggle = React.useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('hl-theme', next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
      title={isDark ? 'الوضع الداكن' : 'الوضع الفاتح'}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-accent-soft hover:text-accent ${className ?? ''}`}
    >
      {mounted ? (
        isDark ? (
          <Sun key="sun" size={17} className="theme-icon" strokeWidth={2} />
        ) : (
          <Moon key="moon" size={17} className="theme-icon" strokeWidth={2} />
        )
      ) : (
        <span className="h-[17px] w-[17px]" />
      )}
    </button>
  );
}
