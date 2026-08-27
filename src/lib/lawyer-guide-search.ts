import 'server-only';

/**
 * Arabic-first intent detection + search for the Lawyer Guide.
 * Maps user intent phrases → categories + services to deliver contextual results.
 */

/** Normalize Arabic text: alef variants, ya, ta-marbuta, tatweel, diacritics. */
export function normalizeAr(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u0622\u0623\u0625\u0627]/g, 'ا')
    .replace(/\u0649/g, 'ي')
    .replace(/\u0629/g, 'ه')
    .replace(/\u0640/g, '') // tatweel
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

type IntentMatch = {
  intent: string;
  categorySlugs: string[];
  serviceSlugs: string[];
  keywords: string[];
};

const INTENT_MAP: Array<{ patterns: string[]; intent: IntentMatch }> = [
  {
    patterns: ['توكيل', 'عمل توكيل', 'عايز اعمل توكيل', 'عايز اعمل توكيل عام', 'توكيل عام', 'توكيل خاص'],
    intent: {
      intent: 'notary',
      categorySlugs: ['notary', 'real-estate-reg'],
      serviceSlugs: ['svc-draw-power-of-attorney', 'svc-authenticate-documents'],
      keywords: ['توكيل', 'توثيق', 'شهر عقاري'],
    },
  },
  {
    patterns: ['سجل تجاري', 'استخراج سجل تجاري', 'عايز اطلع سجل تجاري', 'سجل'],
    intent: {
      intent: 'commercial-registry',
      categorySlugs: ['commercial-registry'],
      serviceSlugs: ['svc-commercial-registry', 'svc-register-company'],
      keywords: ['سجل تجاري', 'تجارة'],
    },
  },
  {
    patterns: ['تاسيس شركه', 'تأسيس شركة', 'عايز اعمل تأسيس شركة', 'انشاء شركة'],
    intent: {
      intent: 'company-setup',
      categorySlugs: ['gafi', 'commercial-registry', 'tax', 'chambers'],
      serviceSlugs: ['svc-register-company', 'svc-investment-license', 'svc-tax-registration'],
      keywords: ['استثمار', 'شركة', 'تأسيس', 'سجل تجاري'],
    },
  },
  {
    patterns: ['قضية ادارية', 'قضية إدارية', 'عندي قضية ادارية في الجيزة', 'قضيه اداريه'],
    intent: {
      intent: 'administrative-case',
      categorySlugs: ['state-council', 'admin-prosecution', 'state-lawsuits'],
      serviceSlugs: ['svc-file-lawsuit', 'svc-legal-consultation'],
      keywords: ['مجلس الدولة', 'إداري', 'قضاء'],
    },
  },
  {
    patterns: ['تنفيذ حكم', 'تنفيذ', 'عايز انفذ حكم'],
    intent: {
      intent: 'enforcement',
      categorySlugs: ['execution'],
      serviceSlugs: ['svc-execution-judgment', 'svc-enforce-rent'],
      keywords: ['تنفيذ', 'حكم', 'محضر'],
    },
  },
  {
    patterns: ['بطاقة رقم قومي', 'رقم قومي', 'استخراج بطاقة', 'بطاقة'],
    intent: {
      intent: 'civil-id',
      categorySlugs: ['civil-status'],
      serviceSlugs: ['svc-civil-status-id'],
      keywords: ['أحوال مدنية', 'رقم قومي', 'بطاقة'],
    },
  },
  {
    patterns: ['شهادة ميلاد', 'استخراج شهادة ميلاد'],
    intent: {
      intent: 'birth-certificate',
      categorySlugs: ['civil-status'],
      serviceSlugs: ['svc-birth-certificate'],
      keywords: ['ميلاد', 'شهادة'],
    },
  },
  {
    patterns: ['جواز سفر', 'استخراج جواز سفر', 'تجديد جواز'],
    intent: {
      intent: 'passport',
      categorySlugs: ['passports'],
      serviceSlugs: ['svc-passport-issuance'],
      keywords: ['جوازات', 'سفر', 'هجرة'],
    },
  },
  {
    patterns: ['رخصة قيادة', 'رخصة', 'استخراج رخصة'],
    intent: {
      intent: 'driving-license',
      categorySlugs: ['traffic'],
      serviceSlugs: ['svc-driving-license'],
      keywords: ['مرور', 'رخصة'],
    },
  },
  {
    patterns: ['ترخيص مركبة', 'ترخيص سيارة', 'تسجيل سيارة'],
    intent: {
      intent: 'vehicle-license',
      categorySlugs: ['traffic'],
      serviceSlugs: ['svc-traffic-license'],
      keywords: ['مرور', 'ترخيص', 'مركبة'],
    },
  },
  {
    patterns: ['ضرائب', 'سجل ضريبي', 'بطاقة ضريبية', 'إقرار ضريبي'],
    intent: {
      intent: 'tax',
      categorySlugs: ['tax'],
      serviceSlugs: ['svc-tax-registration', 'svc-tax-return'],
      keywords: ['ضرائب', 'مصلحة الضرائب', 'إقرار'],
    },
  },
  {
    patterns: ['تأمينات', 'تأمينات اجتماعية', 'معاش'],
    intent: {
      intent: 'social-insurance',
      categorySlugs: ['social-insurance'],
      serviceSlugs: ['svc-social-insurance'],
      keywords: ['تأمينات', 'معاش'],
    },
  },
  {
    patterns: ['شهر عقاري', 'تسجيل عقار', 'شهر عقارى'],
    intent: {
      intent: 'real-estate',
      categorySlugs: ['real-estate-reg', 'notary'],
      serviceSlugs: ['svc-property-registration'],
      keywords: ['شهر عقاري', 'تسجيل', 'عقار'],
    },
  },
  {
    patterns: ['محكمة', 'محاكم', 'رفع دعوى', 'قضية'],
    intent: {
      intent: 'court',
      categorySlugs: ['courts'],
      serviceSlugs: ['svc-file-lawsuit', 'svc-attend-session'],
      keywords: ['محكمة', 'دعوى', 'قضية'],
    },
  },
  {
    patterns: ['نيابة', 'تحقيقات', 'النيابة العامة'],
    intent: {
      intent: 'prosecution',
      categorySlugs: ['prosecution'],
      serviceSlugs: ['svc-legal-consultation'],
      keywords: ['نيابة', 'تحقيقات'],
    },
  },
  {
    patterns: ['ترخيص بناء', 'رخصة بناء'],
    intent: {
      intent: 'building-permit',
      categorySlugs: ['building', 'local-gov'],
      serviceSlugs: ['svc-building-permit'],
      keywords: ['ترخيص', 'بناء', 'محلي'],
    },
  },
  {
    patterns: ['تخليص جمركي', 'جمارك', 'استيراد', 'تصدير'],
    intent: {
      intent: 'customs',
      categorySlugs: ['customs', 'export-import'],
      serviceSlugs: ['svc-customs-clearance'],
      keywords: ['جمارك', 'تخليص', 'استيراد'],
    },
  },
  {
    patterns: ['زواج', 'عقد زواج', 'توثيق زواج'],
    intent: {
      intent: 'marriage',
      categorySlugs: ['civil-status', 'notary'],
      serviceSlugs: ['svc-marriage-certificate'],
      keywords: ['زواج', 'عقد'],
    },
  },
  {
    patterns: ['طلاق', 'توثيق طلاق'],
    intent: {
      intent: 'divorce',
      categorySlugs: ['civil-status', 'notary'],
      serviceSlugs: ['svc-divorce-certificate'],
      keywords: ['طلاق'],
    },
  },
];

/**
 * Detect user intent from a search query.
 * Returns matched intents + expanded keywords.
 */
export function detectIntent(query: string): IntentMatch[] {
  const n = normalizeAr(query);
  if (!n) return [];

  const matches: IntentMatch[] = [];
  const seen = new Set<string>();

  for (const entry of INTENT_MAP) {
    for (const pattern of entry.patterns) {
      const np = normalizeAr(pattern);
      if (n.includes(np) || np.includes(n)) {
        if (!seen.has(entry.intent.intent)) {
          seen.add(entry.intent.intent);
          matches.push(entry.intent);
        }
        break;
      }
    }
  }

  return matches;
}

/**
 * Build the full set of search terms including intent-expanded keywords.
 */
export function buildSearchTerms(query: string): { terms: string[]; intents: IntentMatch[] } {
  const intents = detectIntent(query);
  const termSet = new Set<string>([query.trim()]);

  for (const intent of intents) {
    for (const kw of intent.keywords) {
      termSet.add(kw);
    }
  }

  return { terms: [...termSet].slice(0, 20), intents };
}
