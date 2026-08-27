/** Shared UI constants & nav types — safe to import from client components. */

export const LOCATION_TYPE_LABEL: Record<string, string> = {
  COURT: 'محكمة',
  TAX_OFFICE: 'مكتب ضرائب',
  COMMERCIAL_REGISTRY: 'سجل تجاري',
  CIVIL_REGISTRY: 'السجل المدني',
  PROSECUTION: 'نيابة',
  LAWYERS_SYNDICATE: 'نقابة المحامين',
  SURVEY_AUTHORITY: 'جهاز المساحة',
  PASSPORTS: 'جوازات السفر',
  TRAFFIC: 'مرور',
  SOCIAL_INSURANCE: 'التأمينات الاجتماعية',
  LABOR_OFFICE: 'مكتب العمل',
  CUSTOMS: 'جمارك',
  INVESTMENT_AGENCY: 'هيئة الاستثمار',
  EXPERTS_OFFICE: 'مكتب خبراء',
  REAL_ESTATE_REGISTRATION: 'الشهر العقاري',
  GOVERNMENT_AGENCY: 'جهة حكومية',
  OTHER: 'مكان قانوني',
};

/** Staff roles (server-enforced — see src/lib/rbac.ts). */
export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'مدير النظام',
  SUPER_ADMIN: 'مدير عام',
  OFFICE_MANAGER: 'مدير المكتب',
  LAWYER: 'محامٍ',
  SECRETARY: 'سكرتير',
  VIEWER: 'مطالع',
};

export const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OFFICE_MANAGER', 'SECRETARY', 'LAWYER', 'VIEWER'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Roles a SUPER_ADMIN may hand out from the users screen (never SUPER_ADMIN/ADMIN). */
export const ASSIGNABLE_ROLES = ['OFFICE_MANAGER', 'SECRETARY', 'LAWYER', 'VIEWER'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/** Short description of what each role can do — shown in the users screen. */
export const ROLE_DESCRIPTION: Record<string, string> = {
  SUPER_ADMIN: 'صلاحية كاملة على كل شيء — بما فيها إدارة الحسابات.',
  ADMIN: 'صلاحية كاملة (اسم قديم للمدير العام).',
  OFFICE_MANAGER: 'كل شيء ما عدا إدارة الحسابات.',
  SECRETARY: 'الجلسات والمهام والأماكن والتعليقات — بدون إدارة المحامين.',
  LAWYER: 'الجلسات والمهام والتعليقات فقط.',
  VIEWER: 'قراءة فقط — لا يستطيع الإضافة أو التعديل.',
};

/** Distance buckets from the Dokki office (outward). */
export const DISTANCE_BUCKETS = ['0-5كم', '5-10كم', '10-20كم', '20-40كم', '40-75كم', '75-150كم', '150-300كم', '300+كم'] as const;

export const TITLE_LABEL: Record<string, string> = {
  DOCTOR: 'دكتور',
  ADVOCATE: 'محامي',
};

/**
 * رابط صفحة الناشر (poster) لأي بوست في الفيد: صفحة المحامي إن كان البوست
 * لمحامٍ، أو الصفحة الرئيسية للمكتب إن كانت الإدارة هي الناشر — فكل بوست
 * له ناشر قابل للضغط.
 */
export function getOfficeProfileHref(task: { author?: { slug: string } | null } | null): string {
  return task?.author ? `/lawyers/${task.author.slug}` : '/';
}

export type NavLawyer = {
  id: string;
  slug: string;
  name: string;
  title: 'DOCTOR' | 'ADVOCATE';
  photo: string | null;
  isPrincipal: boolean;
};

export type NavLocation = {
  id: string;
  slug: string;
  name: string;
  type: string;
  subType?: string | null;
  governorate?: string | null;
};
