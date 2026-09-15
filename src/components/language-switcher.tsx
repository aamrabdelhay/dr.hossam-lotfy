'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Globe2 } from 'lucide-react';
import { SITE_LANGUAGE_COOKIE, DEFAULT_SITE_LANGUAGE, type SiteLanguage } from '@/lib/i18n';

const options: Array<{ value: SiteLanguage; label: string; short: string }> = [
  { value: 'ar', label: 'العربية', short: 'AR' },
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'fr', label: 'Français', short: 'FR' },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [language, setLanguage] = React.useState<SiteLanguage>(DEFAULT_SITE_LANGUAGE);

  React.useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${SITE_LANGUAGE_COOKIE}=([^;]*)`));
    const value = match?.[1];
    if (value === 'ar' || value === 'en' || value === 'fr') setLanguage(value);
  }, []);

  const changeLanguage = (next: SiteLanguage) => {
    setLanguage(next);
    document.cookie = `${SITE_LANGUAGE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = next === 'ar' ? 'rtl' : 'ltr';
    window.localStorage.setItem(SITE_LANGUAGE_COOKIE, next);
    router.refresh();
    // Refresh the current route after the server cookie is committed so server-rendered
    // content (including database-backed labels) uses the selected language.
    window.setTimeout(() => router.replace(pathname || '/'), 0);
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/70 bg-white/65 p-1 shadow-sm backdrop-blur-xl" aria-label="Language selector">
      <Globe2 size={13} className="mx-1.5 shrink-0 text-gold-600" aria-hidden />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => changeLanguage(option.value)}
          aria-pressed={language === option.value}
          title={option.label}
          className={`rounded-full px-2 py-1 text-[10px] font-extrabold transition ${language === option.value ? 'bg-navy-950 text-white shadow-sm' : 'text-navy-500 hover:bg-white hover:text-navy-950'} ${compact ? 'sm:px-1.5' : 'sm:px-2.5'}`}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}
