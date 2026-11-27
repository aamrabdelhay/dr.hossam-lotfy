import 'server-only';
import Link from 'next/link';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { clientFileContentUrl } from '@/lib/client-file-access';
import { OUTCOMES } from '@/lib/session-outcomes';
import { prisma } from '@/lib/prisma';

type Q = Record<string, unknown>;
const q = <T = Q,>(sql: string, ...args: unknown[]) => prisma.$queryRawUnsafe<T[]>(sql, ...args).catch(() => [] as T[]);
const day = (v: unknown) => (v ? new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(v as string | Date)) : 'غير محدد');
const STATUS: Record<string, string> = { UNDER_REVIEW: 'تحت المراجعة', IN_PROGRESS: 'متداولة', REJECTED: 'مرفوضة', PENDING: 'مجدولة', COMPLETED: 'منتهية', CANCELLED: 'ملغاة' };
const ROLE: Record<string, string> = { CLIENT: 'موكل', OPPONENT: 'خصم', WITNESS: 'شاهد', EXPERT: 'خبير', OTHER: 'آخر' };
const KIND: Record<string, string> = { ENFORCEMENT: 'تنفيذ', EXPERT_MISSION: 'مأمورية خبير', POA: 'توكيل', CORRESPONDENCE: 'مراسلات', CUSTODY: 'عهدة', MONEY: 'مبلغ', CHECKLIST: 'قائمة مراجعة' };

function Section({ title, count, open, children }: { title: string; count?: number; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group rounded-xl border border-navy-100 bg-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-extrabold text-navy-900 [&::-webkit-details-marker]:hidden">
        <span>{title}{count !== undefined && <span className="ms-2 text-[11px] font-bold text-navy-400">({count})</span>}</span>
        <span aria-hidden className="text-navy-400 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-2 border-t border-navy-100 p-3 text-sm">{children}</div>
    </details>
  );
}
const Empty = ({ text }: { text: string }) => <p className="text-[12px] font-semibold text-navy-400">{text}</p>;

/** Full case file for one court-mode card. Uses the same access check as the case page (ethical walls, branches, grants). */
export async function CourtCaseDetails({ caseId, taskId }: { caseId: string; taskId: string }) {
  try { await requireCaseFileAccess(caseId); } catch {
    return <p className="rounded-xl bg-ivory-50 p-3 text-[12px] font-bold text-navy-500">لا تملك صلاحية عرض ملف هذه القضية.</p>;
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
  const [[cs], clients, parties, sessions, events, register, deadlines, scenarios] = await Promise.all([
    q<Q>('SELECT cr."name",cr."number",cr."description",cr."clientName",cat."name_ar" AS category,ob."name_ar" AS branch,COALESCE(cr."workflow_status",\'UNDER_REVIEW\') AS status FROM "case_records" cr LEFT JOIN "office_case_categories" cat ON cat."id"=cr."category_id" LEFT JOIN "office_branches" ob ON ob."id"=cr."branch_id" WHERE cr."id"=$1 LIMIT 1', caseId),
    q<Q>('SELECT DISTINCT c."id",c."name",c."phone" FROM "clients" c JOIN "case_clients" cc ON cc."client_id"=c."id" WHERE cc."case_id"=$1 ORDER BY c."name" LIMIT 20', caseId),
    q<Q>('SELECT "role","name","phone","note" FROM "office_case_parties" WHERE "case_id"=$1 AND "active"=true ORDER BY "role","name" LIMIT 40', caseId),
    q<Q>('SELECT t."id",t."description",t."notes",t."scheduledDate"::text AS date,t."scheduledTime" AS time,t."status",l."name" AS location,f."outcome_code",f."result",f."feedback" FROM "tasks" t LEFT JOIN "locations" l ON l."id"=t."locationId" LEFT JOIN "task_feedback" f ON f."task_id"=t."id" WHERE t."caseId"=$1 AND t."status"<>\'CANCELLED\' ORDER BY t."scheduledDate" DESC NULLS LAST,t."createdAt" DESC LIMIT 60', caseId),
    q<Q>('SELECT "description","type","authorName","createdAt" FROM "case_events" WHERE "caseId"=$1 ORDER BY "createdAt" DESC LIMIT 12', caseId),
    q<Q>('SELECT "kind","title","status","due_date"::text AS due FROM "office_case_register" WHERE "case_id"=$1 AND "status"=\'OPEN\' ORDER BY "created_at" DESC LIMIT 30', caseId),
    q<Q>('SELECT d."due_date"::text AS due,d."note",r."name" FROM "office_case_deadlines" d JOIN "office_deadline_rules" r ON r."id"=d."rule_id" WHERE d."case_id"=$1 AND d."status"=\'OPEN\' ORDER BY d."due_date" LIMIT 20', caseId),
    q<Q>('SELECT "title","possible_outcome" AS outcome,"status","target_date"::text AS target FROM "office_case_scenarios" WHERE "case_id"=$1 ORDER BY "updated_at" DESC LIMIT 5', caseId),
  ]);
  const files = await q<Q>('SELECT f."id",f."name",f."kind",f."url",f."client_id" FROM "client_files" f WHERE f."deleted_at" IS NULL AND f."client_id" IN (SELECT "client_id" FROM "case_clients" WHERE "case_id"=$1 UNION SELECT "clientId" FROM "case_records" WHERE "id"=$1 AND "clientId" IS NOT NULL) ORDER BY f."created_at" DESC LIMIT 15', caseId);
  if (!cs) return null;

  const others = sessions.filter((s) => s.id !== taskId);
  const past = others.filter((s) => String(s.date ?? '9999') < today);
  const next = others.filter((s) => String(s.date ?? '') >= today && s.status !== 'COMPLETED').sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  const latest = past.find((s) => s.outcome_code || s.result || s.feedback);
  const outcomeLabel = (s: Q) => (s.outcome_code ? OUTCOMES[String(s.outcome_code)] ?? String(s.outcome_code) : null);

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-gold-300 bg-gold-50/60 p-3">
        <p className="text-xs font-extrabold text-gold-700">آخر ما توصلت إليه القضية</p>
        {latest ? (
          <div className="mt-1 space-y-1 text-sm font-semibold leading-6 text-navy-900">
            <p>جلسة {day(latest.date)}{latest.location ? ' · ' + latest.location : ''}</p>
            {outcomeLabel(latest) && <p className="font-extrabold">{outcomeLabel(latest)}</p>}
            {latest.result ? <p>{String(latest.result)}</p> : null}
            {latest.feedback ? <p className="text-navy-600">{String(latest.feedback)}</p> : null}
          </div>
        ) : <p className="mt-1 text-[12px] font-semibold text-navy-500">لم تسجل نتيجة لجلسة سابقة بعد.</p>}
        {next && <p className="mt-2 rounded-lg bg-white/70 px-2 py-1.5 text-[12px] font-bold text-navy-700">الجلسة التالية: {day(next.date)}{next.time ? ' · ' + next.time : ''}{next.location ? ' · ' + next.location : ''}</p>}
      </div>

      <Section title="بيانات القضية" open>
        <p><b>{String(cs.name)}</b></p>
        <p className="text-navy-600">رقم القضية: <span className="font-latin">{String(cs.number)}</span></p>
        <p className="text-navy-600">النوع: {String(cs.category ?? 'غير مصنفة')} · الحالة: {STATUS[String(cs.status)] ?? String(cs.status)}</p>
        <p className="text-navy-600">الفرع: {String(cs.branch ?? 'غير محدد')}</p>
        {cs.description ? <p className="whitespace-pre-line leading-7 text-navy-700">{String(cs.description)}</p> : null}
      </Section>

      <Section title="الأطراف والعملاء" count={clients.length + parties.length}>
        {clients.length === 0 && parties.length === 0 && <Empty text={cs.clientName ? 'العميل: ' + String(cs.clientName) : 'لا توجد أطراف مسجلة.'} />}
        {clients.map((c) => <p key={String(c.id)}><b>عميل:</b> {String(c.name)}{c.phone ? <a className="ms-2 font-latin text-gold-700" href={'tel:' + String(c.phone)}>{String(c.phone)}</a> : null}</p>)}
        {parties.map((p, i) => <p key={i}><b>{ROLE[String(p.role)] ?? String(p.role)}:</b> {String(p.name)}{p.phone ? <a className="ms-2 font-latin text-gold-700" href={'tel:' + String(p.phone)}>{String(p.phone)}</a> : null}{p.note ? <span className="block text-[12px] text-navy-500">{String(p.note)}</span> : null}</p>)}
      </Section>

      <Section title="سجل الجلسات والقرارات" count={others.length}>
        {others.length === 0 ? <Empty text="لا توجد جلسات أخرى لهذه القضية." /> : others.map((s) => (
          <div key={String(s.id)} className="rounded-lg bg-ivory-50 p-2.5">
            <p className="text-[12px] font-extrabold text-navy-800">{day(s.date)}{s.time ? ' · ' + s.time : ''} <span className="text-navy-400">· {STATUS[String(s.status)] ?? String(s.status)}</span></p>
            {s.location ? <p className="text-[12px] text-navy-500">{String(s.location)}</p> : null}
            {s.description ? <p className="mt-0.5 text-navy-700">{String(s.description)}</p> : null}
            {outcomeLabel(s) && <p className="mt-0.5 font-extrabold text-navy-900">القرار: {outcomeLabel(s)}</p>}
            {s.result ? <p className="text-navy-700">{String(s.result)}</p> : null}
            {s.feedback ? <p className="text-navy-600">{String(s.feedback)}</p> : null}
            {s.notes ? <p className="text-[12px] text-navy-500">ملاحظات: {String(s.notes)}</p> : null}
          </div>
        ))}
      </Section>

      <Section title="سجل تطورات القضية" count={events.length}>
        {events.length === 0 ? <Empty text="لا يوجد سجل بعد." /> : events.map((e, i) => <p key={i} className="leading-6"><span className="text-[11px] font-bold text-navy-400">{day(e.createdAt)}{e.authorName ? ' · ' + String(e.authorName) : ''}</span><br />{String(e.description)}</p>)}
      </Section>

      <Section title="مواعيد قانونية وبنود مفتوحة" count={deadlines.length + register.length}>
        {deadlines.length === 0 && register.length === 0 && <Empty text="لا توجد مواعيد أو بنود مفتوحة." />}
        {deadlines.map((d, i) => <p key={'d' + i}><b>{String(d.name)}</b> · آخر موعد {day(d.due)}{d.note ? <span className="block text-[12px] text-navy-500">{String(d.note)}</span> : null}</p>)}
        {register.map((r, i) => <p key={'r' + i}><b>{KIND[String(r.kind)] ?? String(r.kind)}:</b> {String(r.title)}{r.due ? ' · ' + day(r.due) : ''}</p>)}
      </Section>

      <Section title="السيناريوهات المتوقعة" count={scenarios.length}>
        {scenarios.length === 0 ? <Empty text="لا توجد سيناريوهات." /> : scenarios.map((s, i) => <p key={i}><b>{String(s.title)}</b>{s.target ? ' · ' + day(s.target) : ''}<span className="block text-navy-600">{String(s.outcome)}</span></p>)}
      </Section>

      <Section title="المستندات" count={files.length}>
        {files.length === 0 ? <Empty text="لا توجد مستندات." /> : files.map((f) => {
          const href = clientFileContentUrl(String(f.client_id), String(f.id), (f.url as string | null) ?? null);
          return <p key={String(f.id)}>{href ? <a href={href} target="_blank" rel="noreferrer" className="font-bold text-gold-700 underline">{String(f.name)}</a> : String(f.name)}</p>;
        })}
      </Section>

      <Link href={'/cases/' + caseId} className="flex min-h-12 items-center justify-center rounded-xl border border-navy-200 px-3 text-xs font-extrabold text-navy-800">فتح ملف القضية كاملًا</Link>
    </div>
  );
}
