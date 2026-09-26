import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, CalendarDays, FileText, FolderOpen, UserRound, History } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ملف القضية' };

type CaseRow = {
  id: string;
  name: string;
  number: string;
  description: string | null;
  clientId: string | null;
  clientName: string | null;
  categoryName: string | null;
  branchName: string | null;
  workflowStatus: string;
};
type EventRow = { id: string; description: string; type: string; authorName: string | null; createdAt: Date };
type TaskRow = { id: string; description: string; notes: string | null; scheduledDate: Date | null; scheduledTime: string | null; status: string; locationName: string | null };
type FileRow = { id: string; name: string; kind: string; mime_type: string | null; size_bytes: number | null; url: string | null; text_content: string | null; created_at: Date };

function fmtDate(value: Date | null | undefined) {
  return value ? new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value)) : 'غير محدد';
}
function statusLabel(value: string) {
  return ({ UNDER_REVIEW: 'تحت المراجعة', IN_PROGRESS: 'متداولة', REJECTED: 'مرفوضة' } as Record<string, string>)[value] ?? value;
}

export default async function CaseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');
  const { id } = await params;

  const rows = await prisma.$queryRawUnsafe<CaseRow[]>(
    'SELECT cr."id",cr."name",cr."number",cr."description",cr."clientId",cr."clientName",cat."name_ar" AS "categoryName",ob."name_ar" AS "branchName",COALESCE(cr."workflow_status",\'UNDER_REVIEW\') AS "workflowStatus" FROM "case_records" cr LEFT JOIN "office_case_categories" cat ON cat."id"=cr."category_id" LEFT JOIN "office_branches" ob ON ob."id"=cr."branch_id" WHERE cr."id"=$1 LIMIT 1',
    id,
  );
  const caseRow = rows[0];
  if (!caseRow) notFound();

  const [events, tasks, files, clientRows] = await Promise.all([
    prisma.$queryRawUnsafe<EventRow[]>(
      'SELECT "id","description","type","authorName","createdAt" FROM "case_events" WHERE "caseId"=$1 ORDER BY "createdAt" DESC',
      id,
    ),
    prisma.$queryRawUnsafe<TaskRow[]>(
      'SELECT t."id",t."description",t."notes",t."scheduledDate",t."scheduledTime",t."status",l."name" AS "locationName" FROM "tasks" t LEFT JOIN "locations" l ON l."id"=t."locationId" WHERE t."caseId"=$1 ORDER BY t."scheduledDate" DESC NULLS LAST,t."createdAt" DESC',
      id,
    ),
    caseRow.clientId
      ? prisma.$queryRawUnsafe<FileRow[]>(
          'SELECT "id","name","kind","mime_type","size_bytes","url","text_content","created_at" FROM "client_files" WHERE "client_id"=$1 AND "deleted_at" IS NULL ORDER BY "created_at" DESC',
          caseRow.clientId,
        )
      : [],
    caseRow.clientId
      ? prisma.$queryRawUnsafe<Array<{ id: string; name: string; phone: string | null; email: string | null }>>(
          'SELECT "id","name","phone","email" FROM "clients" WHERE "id"=$1 LIMIT 1',
          caseRow.clientId,
        )
      : [],
  ]);
  const clientRow = clientRows[0];

  return (
    <main dir="rtl" className="mx-auto w-full max-w-[1250px] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href="/cases" className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-[11px] font-bold text-navy-600"><ArrowRight size={14}/> القضايا</Link>
        {caseRow.clientId && <Link href={'/admin/clients/' + caseRow.clientId} className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-[11px] font-bold text-navy-600"><UserRound size={14}/> ملف العميل</Link>}
      </div>

      <section className="mb-5 overflow-hidden rounded-3xl border border-gold-200 bg-white shadow-soft">
        <div className="bg-navy-950 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black tracking-[1.5px] text-gold-300">ملف القضية</p>
              <h1 className="mt-2 text-2xl font-black">{caseRow.name}</h1>
              <p className="mt-2 text-xs text-white/60">رقم القضية: {caseRow.number}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-gold-500/15 px-3 py-1.5 text-[10px] font-black text-gold-300">{caseRow.categoryName || 'غير مصنفة'}</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black text-white/75">{statusLabel(caseRow.workflowStatus)}</span>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="العميل" value={clientRow?.name || caseRow.clientName || 'غير مرتبط'} />
          <Info label="الفرع" value={caseRow.branchName || 'غير محدد'} />
          <Info label="رقم القضية" value={caseRow.number} />
          <Info label="نوع القضية" value={caseRow.categoryName || 'غير مصنفة'} />
        </div>
        {caseRow.description && <div className="border-t border-navy-100 px-5 py-4 text-sm leading-7 text-navy-600">{caseRow.description}</div>}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-navy-100 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-black text-navy-950"><History size={17} className="text-gold-600"/>سجل القضية</h2></div>
          {events.length === 0 ? <div className="p-7"><EmptyState title="لا يوجد سجل مسجل لهذه القضية حتى الآن." /></div> : <div className="space-y-4 p-5">{events.map((event) => <div key={event.id} className="relative border-s border-navy-200 pb-4 pe-4 last:pb-0"><span className="absolute -start-[5px] top-1 h-2 w-2 rounded-full bg-gold-500"/><p className="text-xs font-extrabold text-navy-800">{event.description}</p><p className="mt-1 text-[10px] text-navy-400">{fmtDate(event.createdAt)}{event.authorName ? ' · ' + event.authorName : ''}</p></div>)}</div>}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-navy-100 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-black text-navy-950"><CalendarDays size={17} className="text-gold-600"/>الجلسات والمهام المرتبطة</h2></div>
          {tasks.length === 0 ? <div className="p-7"><EmptyState title="لا توجد جلسات أو مهام مرتبطة بالقضية." /></div> : <div className="divide-y divide-navy-100">{tasks.map((task) => <div key={task.id} className="px-5 py-4"><p className="text-xs font-extrabold text-navy-800">{task.description}</p><p className="mt-1 text-[10px] text-navy-400">{task.locationName || 'مكان غير محدد'}{task.scheduledDate ? ' · ' + fmtDate(task.scheduledDate) : ''}{task.scheduledTime ? ' · ' + task.scheduledTime : ''}</p>{task.notes && <p className="mt-2 text-[11px] leading-5 text-navy-500">{task.notes}</p>}</div>)}</div>}
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="border-b border-navy-100 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-black text-navy-950"><FolderOpen size={17} className="text-gold-600"/>ملفات القضية والعميل</h2><p className="mt-1 text-[10px] text-navy-400">الملفات المحفوظة في ملف العميل المرتبط بهذه القضية.</p></div>
        {files.length === 0 ? <div className="p-7"><EmptyState title="لا توجد ملفات مرتبطة بالعميل حتى الآن." /></div> : <div className="grid gap-2 p-5 sm:grid-cols-2">{files.map((file) => <div key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-navy-100 bg-ivory-50 px-3 py-3"><div className="flex min-w-0 items-center gap-2"><FileText size={15} className="shrink-0 text-gold-600"/><div className="min-w-0"><p className="truncate text-xs font-extrabold text-navy-800">{file.name}</p><p className="mt-1 text-[9px] text-navy-400">{file.kind}{file.size_bytes ? ' · ' + Math.round(file.size_bytes / 1024) + ' ك.ب' : ''}</p></div></div>{file.url && <a href={file.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-full border border-navy-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-navy-600">فتح</a>}</div>)}</div>}
      </Card>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-navy-100 bg-navy-50/40 p-3"><p className="text-[10px] font-bold text-navy-400">{label}</p><p className="mt-1 text-xs font-extrabold text-navy-800">{value}</p></div>;
}
