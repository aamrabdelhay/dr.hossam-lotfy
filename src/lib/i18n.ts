import { cookies } from 'next/headers';

export const SITE_LANGUAGES = ['ar', 'en', 'fr'] as const;
export type SiteLanguage = (typeof SITE_LANGUAGES)[number];
export const SITE_LANGUAGE_COOKIE = 'dr-hossam-site-language';
export const DEFAULT_SITE_LANGUAGE: SiteLanguage = 'ar';

export function isSiteLanguage(value: string | null | undefined): value is SiteLanguage {
  return value === 'ar' || value === 'en' || value === 'fr';
}

export function normalizeSiteLanguage(value: string | null | undefined): SiteLanguage {
  return isSiteLanguage(value) ? value : DEFAULT_SITE_LANGUAGE;
}

export async function getSiteLanguage(): Promise<SiteLanguage> {
  const store = await cookies();
  return normalizeSiteLanguage(store.get(SITE_LANGUAGE_COOKIE)?.value);
}

export const siteCopy = {
  ar: {
    home: 'الرئيسية',
    courts: 'المحاكم والجهات الحكومية',
    lawyers: 'المحامون',
    calendar: 'التقويم',
    search: 'البحث',
    quick: 'تنقّل سريع',
    clients: 'العملاء',
    assign: 'تكليف',
    addLawyer: 'إضافة محامي',
    addLocation: 'إضافة محكمة أو جهة',
    cases: 'ملفات القضايا',
    personalAssign: 'تكليف شخصي',
    allCourts: 'عرض كل المحاكم والجهات الحكومية',
    allLawyers: 'عرض كل المحامين',
    otherLocations: 'الجهات الأخرى',
    login: 'تسجيل دخول',
    logout: 'تسجيل الخروج',
    admin: 'الإدارة',
    archive: 'أرشيف القضايا',
    searchPlaceholder: 'ابحث عن محكمة، مكان، محامٍ…',
    searchShort: 'ابحث...',
    menu: 'القائمة',
    officeFeed: 'فيد المكتب',
    posts: 'منشور',
    noPosts: 'لا توجد منشورات حالياً',
    noPostsHint: 'ستظهر هنا مهام المحامين والجلسات والنشاط الإداري لحظة إضافتها.',
    stats: ['جلسات اليوم', 'جلسات الغد', 'جلسات حرجة', 'مهام مفتوحة', 'المحامون', 'المواعيد القادمة'],
    databaseUnavailable: 'قاعدة البيانات غير متاحة حالياً.',
    diagnostics: 'عرض تشخيص الخدمة',
    offices: 'عناوين المكاتب',
    contact: 'بيانات التواصل',
    mainOffice: 'المقر الرئيسي',
    cairoOffice: 'مكتب القاهرة',
    gizaOffice: 'مكتب الجيزة',
    phones: 'تليفونات',
    fax: 'تليفون / فاكس',
    mobile: 'محمول المكتب',
  },
  en: {
    home: 'Home',
    courts: 'Courts & Government Entities',
    lawyers: 'Lawyers',
    calendar: 'Calendar',
    search: 'Search',
    quick: 'Quick navigation',
    clients: 'Clients',
    assign: 'Assign task',
    addLawyer: 'Add lawyer',
    addLocation: 'Add court or entity',
    cases: 'Case files',
    personalAssign: 'Personal task',
    allCourts: 'View all courts & government entities',
    allLawyers: 'View all lawyers',
    otherLocations: 'Other entities',
    login: 'Sign in',
    logout: 'Sign out',
    admin: 'Administration',
    archive: 'Case archive',
    searchPlaceholder: 'Search for a court, location, or lawyer…',
    searchShort: 'Search…',
    menu: 'Menu',
    officeFeed: 'Office feed',
    posts: 'posts',
    noPosts: 'No posts yet',
    noPostsHint: 'Lawyer tasks, hearings, and office activity will appear here as they are added.',
    stats: ['Today\'s hearings', 'Tomorrow\'s hearings', 'Critical hearings', 'Open tasks', 'Lawyers', 'Upcoming appointments'],
    databaseUnavailable: 'The database is currently unavailable.',
    diagnostics: 'View service diagnostics',
    offices: 'Office addresses',
    contact: 'Contact details',
    mainOffice: 'Main office',
    cairoOffice: 'Cairo office',
    gizaOffice: 'Giza office',
    phones: 'Phones',
    fax: 'Phone / Fax',
    mobile: 'Office mobile',
  },
  fr: {
    home: 'Accueil',
    courts: 'Tribunaux et organismes publics',
    lawyers: 'Avocats',
    calendar: 'Calendrier',
    search: 'Recherche',
    quick: 'Navigation rapide',
    clients: 'Clients',
    assign: 'Attribuer une tâche',
    addLawyer: 'Ajouter un avocat',
    addLocation: 'Ajouter un tribunal ou organisme',
    cases: 'Dossiers judiciaires',
    personalAssign: 'Tâche personnelle',
    allCourts: 'Voir tous les tribunaux et organismes publics',
    allLawyers: 'Voir tous les avocats',
    otherLocations: 'Autres organismes',
    login: 'Connexion',
    logout: 'Déconnexion',
    admin: 'Administration',
    archive: 'Archives des dossiers',
    searchPlaceholder: 'Rechercher un tribunal, un lieu ou un avocat…',
    searchShort: 'Rechercher…',
    menu: 'Menu',
    officeFeed: 'Fil du cabinet',
    posts: 'publications',
    noPosts: 'Aucune publication pour le moment',
    noPostsHint: 'Les tâches des avocats, audiences et activités du cabinet apparaîtront ici.',
    stats: ['Audiences du jour', 'Audiences de demain', 'Audiences critiques', 'Tâches ouvertes', 'Avocats', 'Rendez-vous à venir'],
    databaseUnavailable: 'La base de données est actuellement indisponible.',
    diagnostics: 'Voir le diagnostic du service',
    offices: 'Adresses des bureaux',
    contact: 'Coordonnées',
    mainOffice: 'Bureau principal',
    cairoOffice: 'Bureau du Caire',
    gizaOffice: 'Bureau de Gizeh',
    phones: 'Téléphones',
    fax: 'Téléphone / Fax',
    mobile: 'Mobile du cabinet',
  },
} as const;

export function copyFor(language: SiteLanguage) {
  return siteCopy[language];
}
