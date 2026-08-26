/** Shared UI constants & nav types — safe to import from client components. */

export const LOCATION_TYPE_LABEL: Record<string, string> = {
  COURT: 'محكمة',
  INVESTMENT_AGENCY: 'هيئة الاستثمار',
  EXPERTS_OFFICE: 'مكتب خبراء',
  REAL_ESTATE_REGISTRATION: 'الشهر العقاري',
  GOVERNMENT_AGENCY: 'جهة حكومية',
  OTHER: 'مكان قانوني',
};

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
};
