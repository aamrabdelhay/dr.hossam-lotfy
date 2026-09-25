import 'server-only';
export type SiteLanguage='ar'|'en'|'fr';
export async function getSiteLanguage():Promise<SiteLanguage>{return 'ar';}
