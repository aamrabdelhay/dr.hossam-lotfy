import { ApiError, actorOf, handle, json, readJson } from '@/lib/api';
import { filterAccessibleCases } from '@/lib/case-file-access';
import { parseRoll } from '@/lib/roll-draft-core';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const body = z.object({ text: z.string().max(20000).optional(), imageBase64: z.string().max(12_000_000).optional() });
/** Court roll draft (item 110). Pasted or typed roll text becomes review rows. Reading a PHOTO needs an OCR provider, which is not configured, so an image gets a clear refusal and nothing is guessed. Nothing is saved here. Only cases the caller may see are matched. */
export const POST = handle(async (req: Request) => {
  const s = await actorOf(); const b = await readJson(req, body);
  if (b.imageBase64 && !b.text) throw new ApiError(501, 'قراءة الصور تحتاج مزود OCR غير مُعد حالياً. الصق نص الرول أو اكتبه.');
  if (!b.text?.trim()) throw new ApiError(400, 'الصق نص رول الجلسة');
  const rows = parseRoll(b.text); const nums = Array.from(new Set(rows.map((r) => r.caseNumber).filter(Boolean))) as string[];
  const found = nums.length ? await prisma.$queryRawUnsafe<{ id: string; name: string; number: string }[]>(`SELECT "id","name","number" FROM "case_records" WHERE "number" = ANY($1::text[])`, nums) : [];
  const visible = new Map((await filterAccessibleCases(s, found)).map((c) => [c.number, c]));
  const dups = new Set((await prisma.$queryRawUnsafe<{ case_id: string; d: string }[]>(`SELECT "caseId" AS case_id, to_char("scheduledDate",'YYYY-MM-DD') AS d FROM "tasks" WHERE "caseId" = ANY($1::text[])`, Array.from(visible.values()).map((c) => c.id))).map((x) => x.case_id + '|' + x.d));
  return json({ saved: false, rows: rows.map((r) => { const c = r.caseNumber ? visible.get(r.caseNumber) : undefined; return { ...r, case: c ? { id: c.id, name: c.name } : null, caseNote: r.caseNumber && !c ? 'لا توجد قضية بهذا الرقم متاحة لك' : null, duplicate: !!(c && r.date && dups.has(c.id + '|' + r.date)) }; }), notice: 'مسودة للمراجعة فقط، لم يُحفظ شيء.' });
});
