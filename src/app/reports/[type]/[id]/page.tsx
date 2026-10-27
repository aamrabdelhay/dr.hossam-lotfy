import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { AutoPrint } from '@/components/auto-print';
import { getCurrentUser } from '@/lib/auth';
import { getBranchScope } from '@/lib/branch-access';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'تقرير ملف — مكتب لطفي' };

type TimelineItem = { date: Date | string | null; title: string; detail: string; meta?: string };
type InfoItem = { label: string; value: string };
type FileItem = { name: string; date: Date | string | null; meta?: string };

function displayDate(value: Date | string | null | undefined): string {
  if (!value) return 'غير محدد';
  const date = new Date(value instanceof Date ? value.getTime() : value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long', timeStyle: 'short' }).format(date);
}
function clean(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
function statusName(value: string): string {
  return ({ PENDING: 'قيد التنفيذ', IN_PROGRESS: 'جارٍ التنفيذ', COMPLETED: 'تم التنفيذ', CANCELLED: 'ملغي', UNDER_REVIEW: 'تحت المراجعة', REJECTED: 'مرفوضة', CONFIRMED: 'مؤكد', POTENTIAL: 'عميل محتمل' } as Record<string, string>)[value] ?? value;
}
function timelineItem(date: Date | string | null, title: string, detail: string, meta?: string): TimelineItem {
  return { date, title, detail, meta };
}

export default async function EntityReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');
  const { type, id } = await params;
  const query = await searchParams;
  if (!['client', 'case', 'lawyer', 'location'].includes(type)) notFound();
  const scope = await getBranchScope(session);
  const isManager = session.role === 'admin' || (session.role === 'lawyer' && session.isAdmin) || await isSeniorManagement(session);

  let title = '';
  let name = '';
  let subtitle = '';
  let info: InfoItem[] = [];
  let timeline: TimelineItem[] = [];
  let files: FileItem[] = [];
  let counts: Array<{ label: string; value: number }> = [];
  let backHref = '/admin';

  if (type === 'client') {
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string; name: string; phone: string | null; email: string | null; nationalId: string | null;
      address: string | null; notes: string | null; assignedLawyerId: string | null; branch_id: string | null;
      createdAt: Date; updatedAt: Date; assignedLawyerName: string | null;
    }>>(
      'SELECT c."id",c."name",c."phone",c."email",c."nationalId",c."address",c."notes",c."assignedLawyerId",c."branch_id",c."createdAt",c."updatedAt",l."fullName" AS "assignedLawyerName" FROM "clients" c LEFT JOIN "lawyers" l ON l."id"=c."assignedLawyerId" WHERE c."id"=$1 LIMIT 1',
      id,
    );
    const client = rows[0];
    if (!client) notFound();
    if (!isManager && !(session.role === 'lawyer' && client.assignedLawyerId === session.lawyerId)) redirect('/auth');
    if (!scope.allBranches && scope.branchIds.length > 0 && !scope.branchIds.includes(client.branch_id || 'branch_main')) redirect('/auth');

    title = 'تقرير شامل للعميل';
    backHref = '/admin/clients/' + client.id;
    name = client.name;
    subtitle = 'بيانات العميل، الملفات المرتبطة، القضايا والمواعيد والمستجدات المسجلة';
    info = [
      { label: 'الهاتف', value: clean(client.phone) },
      { label: 'البريد الإلكتروني', value: clean(client.email) },
      { label: 'الرقم القومي', value: clean(client.nationalId) },
      { label: 'العنوان', value: clean(client.address) },
      { label: 'المحامي المسؤول', value: clean(client.assignedLawyerName || client.assignedLawyerId) },
      { label: 'تاريخ إنشاء الملف', value: displayDate(client.createdAt) },
      { label: 'آخر تحديث للبيانات', value: displayDate(client.updatedAt) },
      { label: 'ملاحظات العميل', value: clean(client.notes) },
    ];
    const cases = await prisma.$queryRawUnsafe<Array<{id:string;name:string;number:string;description:string|null;clientId:string|null;clientName:string|null}>>(
      'SELECT DISTINCT cr."id",cr."name",cr."number",cr."description",cr."clientId",cr."clientName" FROM "case_records" cr LEFT JOIN "case_clients" cc ON cc."case_id"=cr."id" WHERE cr."clientId"=$1 OR cc."client_id"=$1 ORDER BY cr."id" DESC',
      id,
    );
    const caseIds = cases.map((item) => item.id);
    const [events, tasks, appointments, clientFiles] = await Promise.all([
      caseIds.length ? prisma.$queryRawUnsafe<Array<{caseId:string;description:string;type:string;authorName:string|null;createdAt:Date}>>(
        'SELECT "caseId","description","type","authorName","createdAt" FROM "case_events" WHERE "caseId"=ANY($1::text[]) ORDER BY "createdAt" ASC',
        caseIds,
      ) : [],
      caseIds.length ? prisma.$queryRawUnsafe<Array<{caseId:string|null;description:string;notes:string|null;scheduledDate:Date|null;scheduledTime:string|null;status:string;createdAt:Date;locationName:string|null;caseName:string|null;caseNumber:string|null}>>(
        'SELECT t."caseId",t."description",t."notes",t."scheduledDate",t."scheduledTime",t."status",t."createdAt",l."name" AS "locationName",cr."name" AS "caseName",cr."number" AS "caseNumber" FROM "tasks" t LEFT JOIN "locations" l ON l."id"=t."locationId" LEFT JOIN "case_records" cr ON cr."id"=t."caseId" WHERE t."caseId"=ANY($1::text[]) ORDER BY t."createdAt" ASC',
        caseIds,
      ) : [],
      prisma.$queryRawUnsafe<Array<{appointment_date:Date|null;appointment_time:string|null;appointment_type:string;status:string;created_at:Date}>>(
        'SELECT "appointment_date","appointment_time","appointment_type","status","created_at" FROM "client_appointments" WHERE "client_id"=$1 ORDER BY "appointment_date" ASC NULLS LAST,"created_at" ASC',
        id,
      ),
      prisma.$queryRawUnsafe<Array<{name:string;kind:string;created_at:Date;size_bytes:number|null}>>(
        'SELECT "name","kind","created_at","size_bytes" FROM "client_files" WHERE "client_id"=$1 AND "deleted_at" IS NULL ORDER BY "created_at" ASC',
        id,
      ),
    ]);
    for (const item of cases) timeline.push(timelineItem(null, 'ملف قضية: ' + item.name, 'رقم القضية: ' + item.number + (item.description ? ' — ' + item.description : ''), 'قضية'));
    for (const event of events) {
      const linkedCase = cases.find((item) => item.id === event.caseId);
      timeline.push(timelineItem(event.createdAt, event.type === 'import' ? 'مستجد مستورد' : 'مستجد قضية', (linkedCase ? linkedCase.name + ': ' : '') + event.description, event.authorName || ''));
    }
    for (const task of tasks) timeline.push(timelineItem(task.scheduledDate || task.createdAt, 'جلسة / مهمة', [task.caseName ? task.caseName + ' (' + task.caseNumber + ')' : '', task.description, task.notes].filter(Boolean).join(' — '), [task.locationName, statusName(task.status), task.scheduledTime].filter(Boolean).join(' · ')));
    for (const appointment of appointments) timeline.push(timelineItem(appointment.appointment_date || appointment.created_at, 'موعد العميل', appointment.appointment_type, statusName(appointment.status) + (appointment.appointment_time ? ' · ' + appointment.appointment_time : '')));
    files = clientFiles.map((file) => ({ name: file.name, date: file.created_at, meta: file.kind + (file.size_bytes ? ' · ' + (file.size_bytes / 1024 / 1024).toFixed(2) + ' MB' : '') }));
    counts = [{ label: 'القضايا', value: cases.length }, { label: 'المستجدات', value: events.length }, { label: 'الجلسات والمهام', value: tasks.length }, { label: 'المواعيد', value: appointments.length }, { label: 'المستندات', value: clientFiles.length }];
  } else if (type === 'case') {
    const rows = await prisma.$queryRawUnsafe<Array<{
      id:string;name:string;number:string;description:string|null;clientId:string|null;clientName:string|null;
      branch_id:string|null;workflow_status:string|null;branchName:string|null;categoryName:string|null;
    }>>(
      'SELECT cr."id",cr."name",cr."number",cr."description",cr."clientId",cr."clientName",cr."branch_id",cr."workflow_status",ob."name_ar" AS "branchName",cat."name_ar" AS "categoryName" FROM "case_records" cr LEFT JOIN "office_branches" ob ON ob."id"=cr."branch_id" LEFT JOIN "office_case_categories" cat ON cat."id"=cr."category_id" WHERE cr."id"=$1 LIMIT 1',
      id,
    );
    const record = rows[0];
    if (!record) notFound();
    if (!scope.allBranches && scope.branchIds.length > 0 && !scope.branchIds.includes(record.branch_id || 'branch_main')) redirect('/auth');
    title = 'تقرير شامل للقضية';
    backHref = '/cases/' + record.id;
    name = record.name;
    subtitle = 'رقم القضية: ' + record.number;
    info = [
      { label: 'رقم القضية', value: record.number },
      { label: 'العميل', value: clean(record.clientName) },
      { label: 'التصنيف', value: clean(record.categoryName) },
      { label: 'الفرع', value: clean(record.branchName) },
      { label: 'الحالة', value: statusName(record.workflow_status || 'UNDER_REVIEW') },
      { label: 'وصف القضية', value: clean(record.description) },
    ];
    const clientRows = await prisma.$queryRawUnsafe<Array<{name:string;phone:string|null;email:string|null}>>(
      'SELECT DISTINCT c."name",c."phone",c."email" FROM "clients" c LEFT JOIN "case_clients" cc ON cc."client_id"=c."id" WHERE c."id"=$1 OR cc."case_id"=$2 ORDER BY c."name"',
      record.clientId || '', id,
    );
    if (clientRows.length) info.push({ label: 'بيانات العملاء', value: clientRows.map((client) => [client.name, client.phone, client.email].filter(Boolean).join(' · ')).join(' | ') });
    const [events, tasks, caseFiles, clientFiles] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{description:string;type:string;authorName:string|null;createdAt:Date}>>('SELECT "description","type","authorName","createdAt" FROM "case_events" WHERE "caseId"=$1 ORDER BY "createdAt" ASC', id),
      prisma.$queryRawUnsafe<Array<{description:string;notes:string|null;scheduledDate:Date|null;scheduledTime:string|null;status:string;createdAt:Date;locationName:string|null;lawyerName:string|null}>>(
        'SELECT t."description",t."notes",t."scheduledDate",t."scheduledTime",t."status",t."createdAt",l."name" AS "locationName",ly."fullName" AS "lawyerName" FROM "tasks" t LEFT JOIN "locations" l ON l."id"=t."locationId" LEFT JOIN "task_assignments" ta ON ta."taskId"=t."id" LEFT JOIN "lawyers" ly ON ly."id"=ta."lawyerId" WHERE t."caseId"=$1 ORDER BY t."createdAt" ASC',
        id,
      ),
      prisma.$queryRawUnsafe<Array<{name:string;kind:string;created_at:Date;size_bytes:number|null}>>('SELECT "name","kind","created_at","size_bytes" FROM "case_files" WHERE "case_id"=$1 AND "deleted_at" IS NULL ORDER BY "created_at" ASC', id),
      clientRows.length ? prisma.$queryRawUnsafe<Array<{name:string;kind:string;created_at:Date;size_bytes:number|null}>>(
        'SELECT f."name",f."kind",f."created_at",f."size_bytes" FROM "client_files" f JOIN "clients" c ON c."id"=f."client_id" LEFT JOIN "case_clients" cc ON cc."client_id"=c."id" WHERE (c."id"=$1 OR cc."case_id"=$2) AND f."deleted_at" IS NULL ORDER BY f."created_at" ASC',
        record.clientId || '', id,
      ) : [],
    ]);
    for (const event of events) timeline.push(timelineItem(event.createdAt, 'مستجد القضية', event.description, [event.type, event.authorName].filter(Boolean).join(' · ')));
    for (const task of tasks) timeline.push(timelineItem(task.scheduledDate || task.createdAt, 'جلسة / مهمة', [task.description, task.notes].filter(Boolean).join(' — '), [task.locationName, task.lawyerName, statusName(task.status), task.scheduledTime].filter(Boolean).join(' · ')));
    files = [...caseFiles, ...clientFiles].map((file) => ({ name: file.name, date: file.created_at, meta: file.kind + (file.size_bytes ? ' · ' + (file.size_bytes / 1024 / 1024).toFixed(2) + ' MB' : '') }));
    counts = [{ label: 'المستجدات', value: events.length }, { label: 'الجلسات والمهام', value: tasks.length }, { label: 'المستندات', value: files.length }];
  } else if (type === 'lawyer') {
    const lawyer = await prisma.lawyer.findUnique({ where: { id } });
    if (!lawyer) notFound();
    if (!isManager && !(session.role === 'lawyer' && session.lawyerId === lawyer.id)) redirect('/auth');
    if (!scope.allBranches && scope.branchIds.length > 0) {
      const lawyerBranches = await prisma.$queryRawUnsafe<Array<{ branch_id: string }>>(
        'SELECT "branch_id" FROM "office_branch_lawyers" WHERE "lawyer_id"=$1',
        lawyer.id,
      );
      if (!lawyerBranches.some((item) => scope.branchIds.includes(item.branch_id))) redirect('/auth');
    }
    title = 'تقرير شامل للمحامي';
    backHref = '/lawyers/' + lawyer.slug;
    name = lawyer.fullName;
    subtitle = 'الصفة: ' + lawyer.title + (lawyer.specialization ? ' · التخصص: ' + lawyer.specialization : '');
    info = [
      { label: 'الهاتف', value: clean(lawyer.phone) },
      { label: 'البريد الإلكتروني', value: clean(lawyer.email) },
      { label: 'التخصص', value: clean(lawyer.specialization) },
      { label: 'المنصب', value: clean(lawyer.position) },
      { label: 'الحالة', value: lawyer.active ? 'نشط' : 'غير نشط' },
      { label: 'تاريخ إنشاء الملف', value: displayDate(lawyer.createdAt) },
    ];
    const [tasks, activities, comments] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{description:string;notes:string|null;scheduledDate:Date|null;scheduledTime:string|null;status:string;createdAt:Date;locationName:string|null;caseName:string|null;caseNumber:string|null;completedAt:Date|null}>>(
        'SELECT t."description",t."notes",t."scheduledDate",t."scheduledTime",t."status",t."createdAt",l."name" AS "locationName",cr."name" AS "caseName",cr."number" AS "caseNumber",ta."completedAt" FROM "task_assignments" ta JOIN "tasks" t ON t."id"=ta."taskId" LEFT JOIN "locations" l ON l."id"=t."locationId" LEFT JOIN "case_records" cr ON cr."id"=t."caseId" WHERE ta."lawyerId"=$1 ORDER BY t."createdAt" ASC LIMIT 10000',
        id,
      ),
      prisma.activityLog.findMany({ where: { lawyerId: id }, orderBy: { createdAt: 'asc' }, take: 10000 }),
      prisma.$queryRawUnsafe<Array<{text:string;authorName:string|null;createdAt:Date;taskDescription:string}>>(
        'SELECT c."text",c."authorName",c."createdAt",t."description" AS "taskDescription" FROM "comments" c JOIN "tasks" t ON t."id"=c."taskId" JOIN "task_assignments" ta ON ta."taskId"=t."id" WHERE ta."lawyerId"=$1 ORDER BY c."createdAt" ASC LIMIT 10000',
        id,
      ),
    ]);
    for (const task of tasks) timeline.push(timelineItem(task.scheduledDate || task.createdAt, 'مهمة / جلسة', [task.caseName ? task.caseName + ' (' + task.caseNumber + ')' : '', task.description, task.notes].filter(Boolean).join(' — '), [task.locationName, statusName(task.status), task.scheduledTime, task.completedAt ? 'اكتملت ' + displayDate(task.completedAt) : ''].filter(Boolean).join(' · ')));
    for (const activity of activities) timeline.push(timelineItem(activity.createdAt, activity.action || 'نشاط مسجل', activity.summary, 'سجل النشاط'));
    for (const comment of comments) timeline.push(timelineItem(comment.createdAt, 'تعليق على مهمة: ' + comment.taskDescription, comment.text, comment.authorName || ''));
    counts = [{ label: 'المهام والجلسات', value: tasks.length }, { label: 'سجلات النشاط', value: activities.length }, { label: 'التعليقات', value: comments.length }];
  } else {
    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) notFound();
    title = location.type === 'COURT' ? 'تقرير شامل للمحكمة' : 'تقرير شامل للمكان';
    backHref = '/locations/' + location.slug;
    name = location.name;
    subtitle = [location.type, location.subType, location.governorate, location.city, location.address].filter(Boolean).join(' · ');
    info = [
      { label: 'النوع', value: location.type },
      { label: 'التصنيف الفرعي', value: clean(location.subType) },
      { label: 'العنوان', value: clean(location.address) },
      { label: 'المحافظة / المدينة / الحي', value: [location.governorate, location.city, location.district].filter(Boolean).join(' · ') || '—' },
      { label: 'الهاتف', value: clean(location.phone) },
      { label: 'البريد الإلكتروني', value: clean(location.email) },
      { label: 'ساعات العمل', value: clean(location.workingHours) },
      { label: 'الاختصاص', value: clean(location.jurisdiction) },
      { label: 'الخدمات', value: location.services.join('، ') || '—' },
      { label: 'رابط الخرائط', value: clean(location.googleMapsUrl) },
      { label: 'آخر تحقق', value: displayDate(location.lastVerified) },
      { label: 'الوصف', value: clean(location.description) },
    ];
    const [tasks, activities] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{id:string;caseId:string|null;description:string;notes:string|null;scheduledDate:Date|null;scheduledTime:string|null;status:string;createdAt:Date;caseName:string|null;caseNumber:string|null;clientName:string|null;lawyerName:string|null}>>(
        'SELECT t."id",t."caseId",t."description",t."notes",t."scheduledDate",t."scheduledTime",t."status",t."createdAt",cr."name" AS "caseName",cr."number" AS "caseNumber",cr."clientName",ly."fullName" AS "lawyerName" FROM "tasks" t LEFT JOIN "case_records" cr ON cr."id"=t."caseId" LEFT JOIN "task_assignments" ta ON ta."taskId"=t."id" LEFT JOIN "lawyers" ly ON ly."id"=ta."lawyerId" WHERE t."locationId"=$1 ORDER BY t."createdAt" ASC LIMIT 10000',
        id,
      ),
      prisma.activityLog.findMany({ where: { locationId: id }, orderBy: { createdAt: 'asc' }, take: 10000 }),
    ]);
    for (const task of tasks) timeline.push(timelineItem(task.scheduledDate || task.createdAt, 'جلسة / مهمة', [task.caseName ? task.caseName + ' (' + task.caseNumber + ')' : '', task.clientName || '', task.description, task.notes].filter(Boolean).join(' — '), [task.lawyerName, statusName(task.status), task.scheduledTime].filter(Boolean).join(' · ')));
    for (const activity of activities) timeline.push(timelineItem(activity.createdAt, activity.action || 'نشاط مسجل', activity.summary, 'سجل النشاط'));
    counts = [{ label: 'الجلسات والمهام', value: tasks.length }, { label: 'سجلات النشاط', value: activities.length }];
  }

  timeline.sort((a, b) => {
    const left = a.date ? (a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime()) : 0;
    const right = b.date ? (b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime()) : 0;
    return left - right;
  });

  return (
    <main dir="rtl" className="mx-auto min-h-screen w-full max-w-[1100px] bg-white px-4 py-5 text-navy-950 sm:px-8 print:max-w-none print:px-0 print:py-0">
      <AutoPrint enabled={query.print === '1'} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="rounded-full border border-navy-200 px-4 py-2 text-xs font-bold text-navy-600">العودة للملف</Link>
        <a href="?print=1" className="rounded-full bg-navy-950 px-4 py-2 text-xs font-extrabold text-white">حفظ PDF / طباعة</a>
      </div>
      <header className="border-b-2 border-navy-950 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black tracking-[2px] text-gold-700">LOUTFI LAW FIRM · EST. 1949</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h1>
            <h2 className="mt-2 text-lg font-extrabold">{name}</h2>
            <p className="mt-1 text-xs leading-6 text-navy-500">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-navy-100 p-3 text-left text-[10px] leading-6 text-navy-500">
            <p>تاريخ إعداد التقرير</p>
            <p className="font-bold text-navy-800">{displayDate(new Date())}</p>
            <p>تقرير داخلي · سري</p>
          </div>
        </div>
      </header>
      <section className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {counts.map((count) => <div key={count.label} className="rounded-xl bg-ivory-50 p-3"><p className="text-[10px] font-bold text-navy-500">{count.label}</p><p className="mt-1 text-xl font-black">{count.value}</p></div>)}
      </section>
      <section className="mt-6 break-inside-avoid">
        <h3 className="mb-3 border-r-4 border-gold-500 pr-3 text-sm font-black">البيانات الأساسية</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {info.map((item) => <div key={item.label} className="break-inside-avoid rounded-xl border border-navy-100 p-3"><p className="text-[10px] font-bold text-navy-400">{item.label}</p><p className="mt-1 whitespace-pre-wrap break-words text-xs font-semibold leading-6">{item.value}</p></div>)}
        </div>
      </section>
      {files.length > 0 && <section className="mt-6 break-inside-avoid">
        <h3 className="mb-3 border-r-4 border-gold-500 pr-3 text-sm font-black">المستندات والملفات ({files.length})</h3>
        <div className="space-y-2">{files.map((file, index) => <div key={file.name + index} className="flex flex-wrap justify-between gap-2 rounded-lg border border-navy-100 px-3 py-2 text-xs"><span className="font-bold">{file.name}</span><span className="text-navy-500">{file.meta || ''} · {displayDate(file.date)}</span></div>)}</div>
      </section>}
      <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h3 className="border-r-4 border-gold-500 pr-3 text-sm font-black">التسلسل الزمني الكامل للمستجدات</h3>
          <span className="text-[10px] font-bold text-navy-400">{timeline.length} سجل · مرتبة من الأقدم إلى الأحدث</span>
        </div>
        {timeline.length ? <div className="relative space-y-2 before:absolute before:bottom-2 before:right-[7px] before:top-2 before:w-px before:bg-navy-100">{timeline.map((item, index) => <article key={index} className="relative break-inside-avoid pr-7">
          <span className="absolute right-0 top-2 h-4 w-4 rounded-full border-4 border-white bg-gold-500 ring-1 ring-gold-200"/>
          <div className="rounded-xl border border-navy-100 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="text-xs font-black">{item.title}</h4><time className="text-[10px] font-bold text-navy-400">{displayDate(item.date)}</time></div>
            <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-navy-700">{item.detail || '—'}</p>
            {item.meta && <p className="mt-2 text-[10px] font-bold text-gold-700">{item.meta}</p>}
          </div>
        </article>)}</div> : <p className="rounded-xl border border-dashed border-navy-200 p-8 text-center text-xs font-semibold text-navy-400">لا توجد مستجدات مسجلة حتى الآن.</p>}
      </section>
      <footer className="mt-8 border-t border-navy-200 pt-3 text-[9px] leading-5 text-navy-400">
        هذا التقرير جُمِع من السجلات المحفوظة بالنظام وقت إعداده. لا يغني عن مراجعة المستندات الأصلية والتحقق من آخر تحديثات الملف.
      </footer>
      <style>{'@page { size: A4; margin: 14mm; } @media print { html,body { background: white !important; } a { color: inherit !important; text-decoration: none !important; } }'}</style>
    </main>
  );
}
