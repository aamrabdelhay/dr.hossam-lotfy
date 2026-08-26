import { prisma } from './prisma';

const TRANSLIT: Record<string, string> = {
  ا: 'a', ء: 'a', آ: 'a', أ: 'a', إ: 'i', ئ: 'i', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
  د: 'd', ذ: 'th', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: 'a', غ: 'gh',
  ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w', ي: 'y', ى: 'y', ؤ: 'w', ة: 'h',
};

/** Slugify Arabic or Latin names (Latin passes through; Arabic is transliterated). */
export function slugify(name: string): string {
  let out = '';
  for (const ch of name.trim().toLowerCase()) {
    if (/[a-z0-9]/.test(ch)) out += ch;
    else if (ch === ' ') out += '-';
    else if (TRANSLIT[ch]) {
      if (out.endsWith('-')) out = out.slice(0, -1);
      out += TRANSLIT[ch];
    }
  }
  return out.replace(/-{2,}/g, '-').replace(/^-|-$/g, '') || 'item';
}

export async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash =
      (await prisma.location.count({ where: { slug } })) +
      (await prisma.lawyer.count({ where: { slug } }));
    if (clash === 0) return slug;
    slug = `${base}-${i++}`;
  }
}
