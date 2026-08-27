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

/** Distance buckets from the Dokki office (outward). */
export const DISTANCE_BUCKETS = ['0-5كم', '5-10كم', '10-20كم', '20-40كم', '40-75كم', '75-150كم', '150-300كم', '300+كم'] as const;

export const TITLE_LABEL: Record<string, string> = {
  DOCTOR: 'دكتور',
  ADVOCATE: 'محامي',
};

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
