/**
 * Smart bilingual search expansion.
 * Maps Arabic legal terms ↔ English equivalents so that searching
 * "محكمة" also matches "court", "ضرائب" matches "tax", and vice-versa.
 * expandQuery() returns an OR-group of Prisma `contains` terms.
 */

type Entry = { ar: string[]; en: string[] };

/** Normalises Arabic text: strips diacritics, unifies alef/ya/ta-marbuta. */
export function normalizeArabic(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670]/g, '') // diacritics
    .replace(/[\u0622\u0623\u0625\u0627]/g, 'ا') // آأإا → ا
    .replace(/\u0649/g, 'ي') // ى → ي
    .replace(/\u0629/g, 'ه') // ة → ه
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const DICTIONARY: Entry[] = [
  { ar: ['محكمه', 'محاكم', 'المحكمه'], en: ['court', 'courts'] },
  { ar: ['مجلس الدوله', 'دوله اداري'], en: ['administrative court', 'council of state', 'state council'] },
  { ar: ['النقض', 'محكمه النقض'], en: ['court of cassation', 'cassation'] },
  { ar: ['استئناف'], en: ['appeal', 'appellate'] },
  { ar: ['اقتصاديه', 'اقتصادي'], en: ['economic', 'economic court'] },
  { ar: ['شهر عقاري', 'الشهر العقاري', 'شهر العقار'], en: ['real estate', 'real estate registration', 'property registration'] },
  { ar: ['سجل تجاري', 'السجل التجاري'], en: ['commercial registry', 'commercial register'] },
  { ar: ['سجل مدني', 'السجل المدني', 'اقدار مدنيه'], en: ['civil registry', 'civil status'] },
  { ar: ['ضرائب', 'مصلحه الضرائب', 'مكتب ضرائب', 'الضرايب'], en: ['tax', 'taxes', 'tax office', 'taxation'] },
  { ar: ['دمغه', 'دمغه تقدميه'], en: ['stamp duty'] },
  { ar: ['استثمار', 'هيئه الاستثمار', 'الهيئه العامه للاستثمار'], en: ['investment', 'gafi', 'investment authority'] },
  { ar: ['مساحه', 'جهاز المساحه', 'مديريه المساحه'], en: ['survey', 'survey authority', 'surveying'] },
  { ar: ['جوازات', 'جوازات السفر', 'مصلحه الجوازات'], en: ['passport', 'passports', 'immigration'] },
  { ar: ['مرور', 'مروريات', 'مصلحه المرور'], en: ['traffic', 'traffic department'] },
  { ar: ['تامينات', 'التامينات الاجتماعيه'], en: ['social insurance', 'social security'] },
  { ar: ['عمل', 'مكتب العمل', 'قوه عمل'], en: ['labor', 'labour', 'labor office', 'manpower'] },
  { ar: ['جمارك', 'مصلحه الجمارك'], en: ['customs', 'customs authority'] },
  { ar: ['نيابه', 'النيابه العامه', 'نيابات'], en: ['prosecution', 'public prosecutor', 'prosecutor'] },
  { ar: ['نقابه', 'نقابه المحامين'], en: ['syndicate', 'bar association', 'lawyers syndicate'] },
  { ar: ['خبراء', 'مكتب الخبراء', 'خبير'], en: ['experts', 'expert office', 'forensic'] },
  { ar: ['محافظه', 'محافظه الجيزه', 'مقر المحافظه'], en: ['governorate', 'municipality'] },
  { ar: ['قيد', 'تقييد', 'قواهق'], en: ['registration', 'registry'] },
  { ar: ['عقد', 'عقود'], en: ['contract', 'contracts', 'notary'] },
  { ar: ['شركه', 'شركات', 'تاسيس شركه'], en: ['company', 'companies', 'corporate'] },
  { ar: ['تحقيقات', 'نيابه تحقيقات'], en: ['investigation', 'investigations'] },
  { ar: ['عقار', 'عقارات', 'اراضي'], en: ['property', 'realty', 'land'] },
  { ar: ['عامل', 'عمال', 'اجور'], en: ['worker', 'labor', 'wages'] },
  { ar: ['بنك', 'بنوك'], en: ['bank', 'banks', 'banking'] },
];

/** All dictionary terms (ar + en), normalised where Arabic. */
const ALL_TERMS: string[] = DICTIONARY.flatMap((e) => [...e.ar, ...e.en]);

/** Returns the expanded term set for a user query (the query itself + synonyms). */
export function expandTerms(q: string): string[] {
  const n = normalizeArabic(q);
  if (!n) return [];
  const terms = new Set<string>([q.trim()]);
  for (const entry of DICTIONARY) {
    const arHit = entry.ar.some((t) => n.includes(normalizeArabic(t)) || normalizeArabic(t).includes(n));
    const enHit = entry.en.some((t) => t.includes(n) || n.includes(t));
    if (arHit || enHit) {
      for (const t of entry.ar) terms.add(t);
      for (const t of entry.en) terms.add(t);
    }
  }
  // Also expand word-by-word so "محكمة الدقي" → "court" + "محكمة الدقي"
  for (const word of n.split(' ')) {
    if (word.length < 3) continue;
    for (const entry of DICTIONARY) {
      const hit = [...entry.ar, ...entry.en].some((t) => normalizeArabic(t) === word || t === word);
      if (hit) {
        for (const t of entry.ar) terms.add(t);
        for (const t of entry.en) terms.add(t);
      }
    }
  }
  return [...terms].slice(0, 14);
}

/** True when the query looks like Arabic script. */
export function isArabic(q: string): boolean {
  return /[\u0600-\u06FF]/.test(q);
}

/** A dictionary term hit (used to enrich UI hints). */
export function knownTerm(q: string): string | null {
  const n = normalizeArabic(q);
  if (!n) return null;
  for (const entry of DICTIONARY) {
    if ([...entry.ar, ...entry.en].some((t) => t.includes(n) || n.includes(normalizeArabic(t)))) {
      return entry.ar[0];
    }
  }
  return null;
}

/**
 * Builds a Prisma OR-group matching ANY expanded term across the given fields,
 * case-insensitive. Arabic entries are also matched against their normalized form.
 */
export function expandQuery(
  q: string,
  fields: Array<Record<string, unknown>>,
): Array<Record<string, { contains: string; mode: 'insensitive' }>> {
  const terms = expandTerms(q);
  const or: Array<Record<string, { contains: string; mode: 'insensitive' }>> = [];
  for (const term of terms) {
    for (const field of fields) {
      or.push({ [Object.keys(field)[0]]: { contains: term, mode: 'insensitive' } } as Record<string, { contains: string; mode: 'insensitive' }>);
    }
  }
  return or;
}

/** Exported for tests/UI hints. */
export const DICTIONARY_TERMS = ALL_TERMS;
