import 'server-only';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

const rid = (p: string) => p + '_' + crypto.randomUUID().replaceAll('-', '');
const who = (s: SessionUser) => (s.role === 'admin' ? `admin:${s.userId}` : `lawyer:${s.lawyerId}`);
// Item 86: a field can have showIf { field, equals }. A hidden field is never required and its answer is dropped.
export const fieldSchema = z.object({
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/),
  label: z.string().min(1).max(150),
  type: z.enum(['text', 'longtext', 'number', 'date', 'select', 'checkbox']),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1).max(100)).max(30).optional(),
  showIf: z.object({ field: z.string(), equals: z.union([z.string(), z.boolean()]) }).optional(),
});
export const definitionSchema = z.object({ fields: z.array(fieldSchema).min(1).max(60) }).superRefine((d, ctx) => {
  const keys = d.fields.map((f) => f.key);
  if (new Set(keys).size !== keys.length) ctx.addIssue({ code: 'custom', message: 'duplicate field keys' });
  d.fields.forEach((f, i) => {
    if (f.type === 'select' && !f.options?.length) ctx.addIssue({ code: 'custom', message: `select ${f.key} needs options` });
    if (f.showIf) {
      const at = keys.indexOf(f.showIf.field);
      if (at < 0) ctx.addIssue({ code: 'custom', message: `showIf of ${f.key} points to an unknown field` });
      else if (at >= i) ctx.addIssue({ code: 'custom', message: `showIf of ${f.key} must point to an earlier field` });
    }
  });
});
export type FormDef = z.infer<typeof definitionSchema>;

export async function saveForm(s: SessionUser, f: { id?: string; title: string; definition: unknown }) {
  const parsed = definitionSchema.safeParse(f.definition);
  if (!parsed.success) return { error: 'invalid-definition' as const, detail: parsed.error.issues.map((i) => i.message).slice(0, 5) };
  const id = f.id ?? rid('frm');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_forms" ("id","title","definition","created_by") VALUES ($1,$2,$3::jsonb,$4)
    ON CONFLICT ("id") DO UPDATE SET "title"=EXCLUDED."title","definition"=EXCLUDED."definition","updated_at"=NOW()`, id, f.title, JSON.stringify(parsed.data), who(s));
  return { ok: true as const, id };
}
export const listForms = () => prisma.$queryRawUnsafe<any[]>(`SELECT "id","title","definition" FROM "office_forms" WHERE "active" ORDER BY "title" LIMIT 200`);

/** Pure: validate answers against a definition honouring showIf. Returns clean answers or errors per field. */
export function evaluateAnswers(def: FormDef, raw: Record<string, unknown>) {
  const clean: Record<string, string | number | boolean> = {}; const errors: Record<string, string> = {};
  for (const f of def.fields) {
    if (f.showIf && clean[f.showIf.field] !== f.showIf.equals) continue; // hidden: ignored, never required
    const v = raw[f.key];
    const empty = v === undefined || v === null || v === '' || (f.type === 'checkbox' && v === false && f.required);
    if (empty) { if (f.required) errors[f.key] = 'required'; else if (f.type === 'checkbox') clean[f.key] = false; continue; }
    if (f.type === 'number') { const n = Number(v); if (!Number.isFinite(n)) errors[f.key] = 'not-a-number'; else clean[f.key] = n; }
    else if (f.type === 'checkbox') clean[f.key] = v === true;
    else if (f.type === 'date') { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) errors[f.key] = 'bad-date'; else clean[f.key] = v; }
    else if (f.type === 'select') { if (typeof v !== 'string' || !f.options?.includes(v)) errors[f.key] = 'not-an-option'; else clean[f.key] = v; }
    else if (typeof v !== 'string' || v.length > (f.type === 'longtext' ? 5000 : 500)) errors[f.key] = 'bad-text'; else clean[f.key] = v;
  }
  return { clean, errors, ok: Object.keys(errors).length === 0 };
}
export async function submitForm(s: SessionUser, formId: string, answers: Record<string, unknown>) {
  const [form] = await prisma.$queryRawUnsafe<any[]>(`SELECT "definition" FROM "office_forms" WHERE "id"=$1 AND "active"`, formId);
  if (!form) return { error: 'form-not-found' as const };
  const r = evaluateAnswers(definitionSchema.parse(form.definition), answers);
  if (!r.ok) return { error: 'invalid-answers' as const, fields: r.errors };
  const id = rid('frs');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_form_responses" ("id","form_id","answers","submitted_by") VALUES ($1,$2,$3::jsonb,$4)`, id, formId, JSON.stringify(r.clean), who(s));
  return { ok: true as const, id };
}
export async function listResponses(s: SessionUser, formId: string) {
  await logAuditEvent({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null, action: 'FORM_RESPONSES_READ', resourceType: 'form', resourceId: formId, summary: 'Read form responses' });
  return prisma.$queryRawUnsafe<any[]>(`SELECT "id","answers","submitted_by","submitted_at" FROM "office_form_responses" WHERE "form_id"=$1 ORDER BY "submitted_at" DESC LIMIT 500`, formId);
}
