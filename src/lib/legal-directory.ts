import { LOCATION_TYPE_LABEL } from './constants';

export const DOKKI_ORIGIN = { lat: 30.038, lng: 31.2, label: 'الدقي – الجيزة' } as const;

export const LEGAL_DIRECTORY_CATEGORY: Record<string, string> = {
  COURT: 'المحاكم',
  PROSECUTION: 'النيابات',
  TAX_OFFICE: 'الضرائب',
  REAL_ESTATE_REGISTRATION: 'الشهر العقاري والتوثيق',
  COMMERCIAL_REGISTRY: 'السجل التجاري',
  INVESTMENT_AGENCY: 'الاستثمار والشركات',
  LAWYERS_SYNDICATE: 'نقابة المحامين',
  CIVIL_REGISTRY: 'الأحوال المدنية',
  SURVEY_AUTHORITY: 'المساحة والعقارات',
  SOCIAL_INSURANCE: 'التأمينات والعمل',
  LABOR_OFFICE: 'التأمينات والعمل',
  TRAFFIC: 'المرور',
  PASSPORTS: 'الجوازات والهجرة',
  CUSTOMS: 'الجهات المالية والرقابية',
  EXPERTS_OFFICE: 'الخبراء والطب الشرعي',
  GOVERNMENT_AGENCY: 'الجهات الحكومية المحلية',
  OTHER: 'جهات أخرى مرتبطة بالمحاماة',
};

export const DIRECTORY_CATEGORIES = [
  'المحاكم', 'النيابات', 'مجلس الدولة', 'الجهات القضائية', 'الشهر العقاري والتوثيق',
  'السجل التجاري', 'الضرائب', 'الاستثمار والشركات', 'نقابة المحامين', 'الأحوال المدنية',
  'المساحة والعقارات', 'التأمينات والعمل', 'المرور', 'الجوازات والهجرة', 'الجهات المالية والرقابية',
  'الخبراء والطب الشرعي', 'الجهات الحكومية المحلية', 'جهات أخرى مرتبطة بالمحاماة',
] as const;

export function categoryForType(type: string, name = '', subType = ''): string {
  const hay = `${name} ${subType}`;
  if (hay.includes('مجلس الدولة') || hay.includes('قضاء إداري') || hay.includes('إدارية عليا') || hay.includes('إدارية')) return 'مجلس الدولة';
  if (hay.includes('دستورية') || hay.includes('قضاء عسكري') || hay.includes('هيئة قضايا الدولة') || hay.includes('نيابة إدارية')) return 'الجهات القضائية';
  return LEGAL_DIRECTORY_CATEGORY[type] ?? LOCATION_TYPE_LABEL[type] ?? 'جهات أخرى مرتبطة بالمحاماة';
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceBucket(km: number): string {
  if (km < 5) return '0-5كم';
  if (km < 10) return '5-10كم';
  if (km < 20) return '10-20كم';
  if (km < 40) return '20-40كم';
  if (km < 75) return '40-75كم';
  if (km < 150) return '75-150كم';
  if (km < 300) return '150-300كم';
  return '300+كم';
}

export function googleDirectionsUrl(lat?: number | null, lng?: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps/dir/?api=1&origin=${DOKKI_ORIGIN.lat},${DOKKI_ORIGIN.lng}&destination=${lat},${lng}`;
}
