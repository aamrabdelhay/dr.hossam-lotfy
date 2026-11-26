/** Item 215: transparent file-completeness score. Every criterion is a plain yes/no on recorded data. It is NOT a legal-quality judgment and says nothing about the merits; it only shows what is missing from the file so a lawyer can decide. */
export type QualityFacts = { hasClient: boolean; parties: number; files: number; hasDeadline: boolean; hasChronology: boolean; hasUpcomingTask: boolean; staleReviewFiles: number; hasPowerOfAttorney: boolean };
export const CRITERIA: { key: string; label: string; ok: (f: QualityFacts) => boolean }[] = [
  { key: 'CLIENT', label: 'العميل مرتبط بالقضية', ok: (f) => f.hasClient },
  { key: 'PARTIES', label: 'أطراف القضية مسجلة', ok: (f) => f.parties > 0 },
  { key: 'FILES', label: 'يوجد مستند واحد على الأقل', ok: (f) => f.files > 0 },
  { key: 'POA', label: 'التوكيل مسجل في سجل القضية', ok: (f) => f.hasPowerOfAttorney },
  { key: 'DEADLINE', label: 'يوجد موعد أو مهلة مسجلة', ok: (f) => f.hasDeadline },
  { key: 'CHRONOLOGY', label: 'يوجد تطور مسجل في سجل القضية', ok: (f) => f.hasChronology },
  { key: 'NEXT', label: 'يوجد إجراء أو جلسة قادمة', ok: (f) => f.hasUpcomingTask },
  { key: 'REVIEW', label: 'لا توجد مستندات عالقة في المراجعة', ok: (f) => f.staleReviewFiles === 0 },
];
export function scoreCase(f: QualityFacts) { const results = CRITERIA.map((c) => ({ key: c.key, label: c.label, ok: c.ok(f) })); return { score: results.filter((r) => r.ok).length, outOf: results.length, missing: results.filter((r) => !r.ok), results }; }
