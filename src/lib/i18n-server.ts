import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_SITE_LANGUAGE, SITE_LANGUAGE_COOKIE, normalizeSiteLanguage, type SiteLanguage } from './i18n';

export async function getSiteLanguage(): Promise<SiteLanguage> {
  const store = await cookies();
  return normalizeSiteLanguage(store.get(SITE_LANGUAGE_COOKIE)?.value ?? DEFAULT_SITE_LANGUAGE);
}
