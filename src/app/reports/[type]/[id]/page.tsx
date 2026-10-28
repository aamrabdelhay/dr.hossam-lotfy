import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { AutoPrint } from '@/components/auto-print';
import { getCurrentUser } from '@/lib/auth';
import { getBranchScope } from '@/lib/branch-access';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
import { getSiteBranding } from '@/lib/site-data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'تقرير ملف — مكتب لطفي' };

type TimelineItem = { date: Date | string | null; title: string; detail: string; meta?: string; category: ReportSectionKey };
type InfoItem = { label: string; value: string };
type FileItem = { name: string; date: Date | string | null; meta?: string };

type ReportLanguage = 'ar' | 'en' | 'fr';
type ReportSectionKey = 'basic' | 'cases' | 'tasks' | 'attendance' | 'activity' | 'files' | 'developments' | 'appointments' | 'comments';
const REPORT_TRANSLATIONS: Record<string, { en: string; fr: string }> = {
  'تقرير شامل للعميل': {en:'Client report',fr:'Rapport du client'}, 'تقرير شامل للقضية': {en:'Case report',fr:'Rapport du dossier'},
  'تقرير شامل للمحامي': {en:'Lawyer report',fr:'Rapport de l’avocat'}, 'تقرير شامل للمحكمة': {en:'Court report',fr:'Rapport du tribunal'}, 'تقرير شامل للمكان': {en:'Location report',fr:'Rapport du lieu'},
  'بيانات العميل، الملفات المرتبطة، القضايا والمواعيد والمستجدات المسجلة': {en:'Client information, linked files, cases, appointments and developments',fr:'Données du client, fichiers liés, dossiers, rendez-vous et évolutions'},
  'البيانات الأساسية': {en:'Basic information',fr:'Informations de base'}, 'ملخص التقرير': {en:'Report summary',fr:'Résumé du rapport'},
  'الهاتف': {en:'Phone',fr:'Téléphone'}, 'البريد الإلكتروني': {en:'Email',fr:'E-mail'}, 'الرقم القومي': {en:'National ID',fr:'Numéro national'}, 'العنوان': {en:'Address',fr:'Adresse'}, 'المحامي المسؤول': {en:'Assigned lawyer',fr:'Avocat responsable'}, 'تاريخ إنشاء الملف': {en:'File created',fr:'Création du dossier'}, 'آخر تحديث للبيانات': {en:'Last updated',fr:'Dernière mise à jour'}, 'ملاحظات العميل': {en:'Client notes',fr:'Notes du client'},
  'رقم القضية: ': {en:'Case number: ',fr:'Numéro du dossier : '}, 'رقم القضية': {en:'Case number',fr:'Numéro du dossier'}, 'العميل': {en:'Client',fr:'Client'}, 'التصنيف': {en:'Category',fr:'Catégorie'}, 'الفرع': {en:'Branch',fr:'Agence'}, 'الحالة': {en:'Status',fr:'Statut'}, 'وصف القضية': {en:'Case description',fr:'Description du dossier'}, 'بيانات العملاء': {en:'Client details',fr:'Données des clients'},
  'التخصص': {en:'Specialization',fr:'Spécialisation'}, 'الصفة: ': {en:'Title: ',fr:'Fonction : '}, ' · التخصص: ': {en:' · Specialization: ',fr:' · Spécialisation : '}, 'المنصب': {en:'Position',fr:'Poste'}, 'نشط': {en:'Active',fr:'Actif'}, 'غير نشط': {en:'Inactive',fr:'Inactif'},
  'النوع': {en:'Type',fr:'Type'}, 'التصنيف الفرعي': {en:'Subcategory',fr:'Sous-catégorie'}, 'المحافظة / المدينة / الحي': {en:'Governorate / city / district',fr:'Gouvernorat / ville / quartier'}, 'ساعات العمل': {en:'Working hours',fr:'Heures d’ouverture'}, 'الاختصاص': {en:'Jurisdiction',fr:'Compétence'}, 'الخدمات': {en:'Services',fr:'Services'}, 'رابط الخرائط': {en:'Map link',fr:'Lien cartographique'}, 'آخر تحقق': {en:'Last verified',fr:'Dernière vérification'}, 'الوصف': {en:'Description',fr:'Description'},
  'القضايا': {en:'Cases',fr:'Dossiers'}, 'مستجدات القضايا': {en:'Case developments',fr:'Évolutions des dossiers'}, 'مستجدات العميل': {en:'Client developments',fr:'Évolutions du client'}, 'مستجدات': {en:'Developments',fr:'Évolutions'}, 'الجلسات والمهام': {en:'Sessions and tasks',fr:'Audiences et tâches'}, 'المهام والجلسات': {en:'Tasks and sessions',fr:'Tâches et audiences'}, 'المواعيد': {en:'Appointments',fr:'Rendez-vous'}, 'المستندات': {en:'Documents',fr:'Documents'}, 'سجلات النشاط': {en:'Activity records',fr:'Entrées du journal d’activité'}, 'التعليقات': {en:'Comments',fr:'Commentaires'}, 'تسجيل الدخول والخروج': {en:'Sign-in and sign-out',fr:'Connexions et déconnexions'},
  'ملف قضية: ': {en:'Case file: ',fr:'Dossier : '}, 'مستجد عميل مستورد': {en:'Imported client development',fr:'Évolution client importée'}, 'مستجد العميل': {en:'Client development',fr:'Évolution du client'}, 'مستجد مستورد': {en:'Imported development',fr:'Évolution importée'}, 'مستجد قضية': {en:'Case development',fr:'Évolution du dossier'}, 'جلسة / مهمة': {en:'Session / task',fr:'Audience / tâche'}, 'مهمة / جلسة': {en:'Task / session',fr:'Tâche / audience'}, 'موعد العميل': {en:'Client appointment',fr:'Rendez-vous client'}, 'مستجد القضية': {en:'Case development',fr:'Évolution du dossier'}, 'نشاط مسجل': {en:'Recorded activity',fr:'Activité enregistrée'}, 'سجل النشاط': {en:'Activity log',fr:'Journal d’activité'}, 'تعليق على مهمة: ': {en:'Comment on task: ',fr:'Commentaire sur la tâche : '}, 'قضية: ': {en:'Case: ',fr:'Dossier : '}, 'مهمة/جلسة: ': {en:'Task/session: ',fr:'Tâche/audience : '}, 'تسجيل الدخول': {en:'Sign in',fr:'Connexion'}, 'تسجيل الخروج': {en:'Sign out',fr:'Déconnexion'}, 'مدة الجلسة: ': {en:'Session duration: ',fr:'Durée de session : '}, 'تسجيل الخروج: ': {en:'Sign-out: ',fr:'Déconnexion : '}, 'لم يُسجّل بعد': {en:'Not recorded yet',fr:'Pas encore enregistrée'},
  'قيد التنفيذ': {en:'In progress',fr:'En cours'}, 'جارٍ التنفيذ': {en:'In progress',fr:'En cours'}, 'تم التنفيذ': {en:'Completed',fr:'Terminé'}, 'ملغي': {en:'Cancelled',fr:'Annulé'}, 'تحت المراجعة': {en:'Under review',fr:'En cours de vérification'}, 'مرفوضة': {en:'Rejected',fr:'Rejeté'}, 'مؤكد': {en:'Confirmed',fr:'Confirmé'}, 'عميل محتمل': {en:'Prospective client',fr:'Client potentiel'},
  'التاريخ': {en:'Date',fr:'Date'}, 'السجل': {en:'Record',fr:'Entrée'}, 'التفاصيل': {en:'Details',fr:'Détails'}, 'بيانات إضافية': {en:'Additional information',fr:'Informations complémentaires'},
  'تقرير داخلي سري': {en:'Confidential internal report',fr:'Rapport interne confidentiel'}, 'البند': {en:'Item',fr:'Élément'}, 'العدد': {en:'Count',fr:'Nombre'}, 'اسم المستند': {en:'Document name',fr:'Nom du document'}, 'النوع / الحجم': {en:'Type / size',fr:'Type / taille'}, 'تاريخ الإضافة': {en:'Date added',fr:'Date d’ajout'}, 'المستندات والملفات': {en:'Documents and files',fr:'Documents et fichiers'}, 'التسلسل الزمني للمستجدات': {en:'Developments timeline',fr:'Chronologie des évolutions'}, 'التسلسل الزمني الكامل للمستجدات': {en:'Complete developments timeline',fr:'Chronologie complète des évolutions'}, 'العودة للملف': {en:'Back to file',fr:'Retour au dossier'}, 'حفظ PDF / طباعة': {en:'Save PDF / Print',fr:'Enregistrer en PDF / Imprimer'}, 'تاريخ إعداد التقرير': {en:'Report date',fr:'Date du rapport'}, 'تقرير داخلي · سري': {en:'Internal · Confidential',fr:'Interne · Confidentiel'}, 'لا توجد مستجدات مسجلة حتى الآن.': {en:'No developments recorded yet.',fr:'Aucune évolution enregistrée pour le moment.'},
  'تم استخراج هذا التقرير من السجلات المحفوظة بالنظام وقت إعداده. يُرجى مراجعة المستندات الأصلية والتحقق من آخر التحديثات.': {en:'This report was generated from records saved in the system. Please review the original documents and verify the latest updates.',fr:'Ce rapport a été généré à partir des données enregistrées. Veuillez vérifier les documents originaux et les dernières mises à jour.'}, '{t("هذا التقرير جُمِع من السجلات المحفوظة بالنظام وقت إعداده. لا يغني عن مراجعة المستندات الأصلية والتحقق من آخر تحديثات الملف.")}': {en:'This report was compiled from the records saved in the system. Review the original documents and latest updates.',fr:'Ce rapport a été établi à partir des données enregistrées. Vérifiez les documents originaux et les dernières mises à jour.'}, 'سجل': {en:'records',fr:'entrées'}, 'مرتبة من الأقدم إلى الأحدث': {en:'ordered oldest to newest',fr:'classées de la plus ancienne à la plus récente'},
};
function translateReport(value: string, language: ReportLanguage): string {
  if (language === 'ar' || !value) return value;
  let result = value;
  for (const phrase of Object.keys(REPORT_TRANSLATIONS).sort((a,b)=>b.length-a.length)) result = result.split(phrase).join(REPORT_TRANSLATIONS[phrase][language]);
  return result;
}
function getPeriodStart(period: string): Date | null {
  if (!period || period === 'all') return null;
  const start = new Date();
  if (period === 'day') start.setDate(start.getDate()-1);
  else if (period === 'week') start.setDate(start.getDate()-7);
  else if (period === 'month') start.setMonth(start.getMonth()-1);
  else if (period === '6months') start.setMonth(start.getMonth()-6);
  else if (period === 'year') start.setFullYear(start.getFullYear()-1);
  else return null;
  return start;
}


function displayDate(value: Date | string | null | undefined, language: ReportLanguage = 'ar'): string {
  if (!value) return language === 'fr' ? 'Non défini' : language === 'en' ? 'Not specified' : 'غير محدد';
  const date = new Date(value instanceof Date ? value.getTime() : value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-GB' : 'ar-EG';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(date);
}
function clean(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
function statusName(value: string): string {
  return ({ PENDING: 'قيد التنفيذ', IN_PROGRESS: 'جارٍ التنفيذ', COMPLETED: 'تم التنفيذ', CANCELLED: 'ملغي', UNDER_REVIEW: 'تحت المراجعة', REJECTED: 'مرفوضة', CONFIRMED: 'مؤكد', POTENTIAL: 'عميل محتمل' } as Record<string, string>)[value] ?? value;
}
function timelineItem(date: Date | string | null, title: string, detail: string, meta?: string, category: ReportSectionKey = 'activity'): TimelineItem {
  return { date, title, detail, meta, category };
}

export default async function EntityReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ print?: string; preview?: string; lang?: string; sections?: string; period?: string; format?: string }>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');
  const { type, id } = await params;
  const query = await searchParams;
  if (!['client', 'case', 'lawyer', 'location'].includes(type)) notFound();
  const language: ReportLanguage = query.lang === 'en' || query.lang === 'fr' ? query.lang : 'ar';
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const reportDate = (value: Date | string | null | undefined) => displayDate(value, language);
  const t = (value: string) => translateReport(value, language);
  const [scope, branding] = await Promise.all([getBranchScope(session), getSiteBranding()]);
  const isManager = (session.role === 'admin' && (session.userRole === 'ADMIN' || session.userRole === 'SUPER_ADMIN')) || (session.role === 'lawyer' && session.isAdmin) || scope.officeManager || await isSeniorManagement(session);
  const reportBranchIds = scope.allBranches ? null : scope.officeManager ? scope.officeManagerBranchIds : null;
  const reportLawyerId = !isManager && session.role === 'lawyer' ? session.lawyerId : null;

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
      { label: 'تاريخ إنشاء الملف', value: reportDate(client.createdAt) },
      { label: 'آخر تحديث للبيانات', value: reportDate(client.updatedAt) },
      { label: 'ملاحظات العميل', value: clean(client.notes) },
    ];
    const cases = await prisma.$queryRawUnsafe<Array<{id:string;name:string;number:string;description:string|null;clientId:string|null;clientName:string|null}>>(
      'SELECT DISTINCT cr."id",cr."name",cr."number",cr."description",cr."clientId",cr."clientName" FROM "case_records" cr LEFT JOIN "case_clients" cc ON cc."case_id"=cr."id" WHERE (cr."clientId"=$1 OR cc."client_id"=$1) AND ($2::text[] IS NULL OR COALESCE(cr."branch_id",\'branch_main\')=ANY($2::text[])) ORDER BY cr."id" DESC',
      id, reportBranchIds,
    );
    const caseIds = cases.map((item) => item.id);
    const [events, tasks, appointments, clientFiles, clientEvents] = await Promise.all([
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
      prisma.$queryRawUnsafe<Array<{id:string;description:string;type:string;author_name:string|null;created_at:Date}>>(
        'SELECT "id","description","type","author_name","created_at" FROM "client_events" WHERE "client_id"=$1 ORDER BY "created_at" ASC',
        id,
      ),
    ]);
    for (const item of cases) timeline.push(timelineItem(null, 'ملف قضية: ' + item.name, 'رقم القضية: ' + item.number + (item.description ? ' — ' + item.description : ''), 'قضية', 'cases'));
    for (const event of clientEvents) timeline.push(timelineItem(event.created_at, event.type === 'import' ? 'مستجد عميل مستورد' : 'مستجد العميل', event.description, event.author_name || '', 'developments'));
    for (const event of events) {
      const linkedCase = cases.find((item) => item.id === event.caseId);
      timeline.push(timelineItem(event.createdAt, event.type === 'import' ? 'مستجد مستورد' : 'مستجد قضية', (linkedCase ? linkedCase.name + ': ' : '') + event.description, event.authorName || '', 'developments'));
    }
    for (const task of tasks) timeline.push(timelineItem(task.scheduledDate || task.createdAt, 'جلسة / مهمة', [task.caseName ? task.caseName + ' (' + task.caseNumber + ')' : '', task.description, task.notes].filter(Boolean).join(' — '), [task.locationName, statusName(task.status), task.scheduledTime].filter(Boolean).join(' · '), 'tasks'));
    for (const appointment of appointments) timeline.push(timelineItem(appointment.appointment_date || appointment.created_at, 'موعد العميل', appointment.appointment_type, statusName(appointment.status) + (appointment.appointment_time ? ' · ' + appointment.appointment_time : ''), 'appointments'));
    files = clientFiles.map((file) => ({ name: file.name, date: file.created_at, meta: file.kind + (file.size_bytes ? ' · ' + (file.size_bytes / 1024 / 1024).toFixed(2) + ' MB' : '') }));
    counts = [{ label: 'القضايا', value: cases.length }, { label: 'مستجدات القضايا', value: events.length }, { label: 'مستجدات العميل', value: clientEvents.length }, { label: 'الجلسات والمهام', value: tasks.length }, { label: 'المواعيد', value: appointments.length }, { label: 'المستندات', value: clientFiles.length }];
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
    if (!isManager) {
      if (session.role !== 'lawyer') redirect('/auth');
      const caseAccess = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT ta."id" AS "id" FROM "task_assignments" ta JOIN "tasks" t ON t."id"=ta."taskId" WHERE t."caseId"=$1 AND ta."lawyerId"=$2 UNION SELECT c."id" AS "id" FROM "clients" c LEFT JOIN "case_clients" cc ON cc."client_id"=c."id" WHERE c."assignedLawyerId"=$2 AND (c."id"=$3 OR cc."case_id"=$1) LIMIT 1',
        id, session.lawyerId, record.clientId || '',
      );
      if (!caseAccess.length) redirect('/auth');
    }
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
      'SELECT DISTINCT c."name",c."phone",c."email" FROM "clients" c LEFT JOIN "case_clients" cc ON cc."client_id"=c."id" WHERE (c."id"=$1 OR cc."case_id"=$2) AND ($3::text[] IS NULL OR COALESCE(c."branch_id",\'branch_main\')=ANY($3::text[])) AND ($4::text IS NULL OR c."assignedLawyerId"=$4) ORDER BY c."name"',
      record.clientId || '', id, reportBranchIds, reportLawyerId,
    );
    if (clientRows.length) info.push({ label: 'بيانات العملاء', value: clientRows.map((client) => [client.name, client.phone, client.email].filter(Boolean).join(' · ')).join(' | ') });
    const [events, tasks, caseFiles, clientFiles] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{description:string;type:string;authorName:string|null;createdAt:Date}>>('SELECT "description","type","authorName","createdAt" FROM "case_events" WHERE "caseId"=$1 ORDER BY "createdAt" ASC', id),
      prisma.$queryRawUnsafe<Array<{description:string;notes:string|null;scheduledDate:Date|null;scheduledTime:string|null;status:string;createdAt:Date;locationName:string|null;lawyerName:string|null}>>(
        'SELECT t."description",t."notes",t."scheduledDate",t."scheduledTime",t."status",t."createdAt",l."name" AS "locationName",ly."fullName" AS "lawyerName" FROM "tasks" t LEFT JOIN "locations" l ON l."id"=t."locationId" LEFT JOIN "task_assignments" ta ON ta."taskId"=t."id" LEFT JOIN "lawyers" ly ON ly."id"=ta."lawyerId" WHERE t."caseId"=$1 AND ($2::text[] IS NULL OR COALESCE(t."branch_id",\'branch_main\')=ANY($2::text[])) ORDER BY t."createdAt" ASC',
        id, reportBranchIds,
      ),
      prisma.$queryRawUnsafe<Array<{name:string;kind:string;created_at:Date;size_bytes:number|null}>>('SELECT "name","kind","created_at","size_bytes" FROM "case_files" WHERE "case_id"=$1 AND "deleted_at" IS NULL ORDER BY "created_at" ASC', id),
      clientRows.length ? prisma.$queryRawUnsafe<Array<{name:string;kind:string;created_at:Date;size_bytes:number|null}>>(
        'SELECT f."name",f."kind",f."created_at",f."size_bytes" FROM "client_files" f JOIN "clients" c ON c."id"=f."client_id" LEFT JOIN "case_clients" cc ON cc."client_id"=c."id" WHERE (c."id"=$1 OR cc."case_id"=$2) AND ($3::text[] IS NULL OR COALESCE(c."branch_id",\'branch_main\')=ANY($3::text[])) AND ($4::text IS NULL OR c."assignedLawyerId"=$4) AND f."deleted_at" IS NULL ORDER BY f."created_at" ASC',
        record.clientId || '', id, reportBranchIds, reportLawyerId,
      ) : [],
    ]);
    for (const event of events) timeline.push(timelineItem(event.createdAt, 'مستجد القضية', event.description, [event.type, event.authorName].filter(Boolean).join(' · '), 'developments'));
    for (const task of tasks) timeline.push(timelineItem(task.scheduledDate || task.createdAt, 'جلسة / مهمة', [task.description, task.notes].filter(Boolean).join(' — '), [task.locationName, task.lawyerName, statusName(task.status), task.scheduledTime].filter(Boolean).join(' · '), 'tasks'));
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
      { label: 'تاريخ إنشاء الملف', value: reportDate(lawyer.createdAt) },
    ];
    const [tasks, activities, comments, attendanceLogs] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{id:string;caseId:string|null;description:string;notes:string|null;scheduledDate:Date|null;scheduledTime:string|null;status:string;createdAt:Date;locationName:string|null;caseName:string|null;caseNumber:string|null;completedAt:Date|null}>>(
        'SELECT t."id",t."caseId",t."description",t."notes",t."scheduledDate",t."scheduledTime",t."status",t."createdAt",l."name" AS "locationName",cr."name" AS "caseName",cr."number" AS "caseNumber",ta."completedAt" FROM "task_assignments" ta JOIN "tasks" t ON t."id"=ta."taskId" LEFT JOIN "locations" l ON l."id"=t."locationId" LEFT JOIN "case_records" cr ON cr."id"=t."caseId" WHERE ta."lawyerId"=$1 AND ($2::text[] IS NULL OR COALESCE(t."branch_id",\'branch_main\')=ANY($2::text[])) ORDER BY t."createdAt" ASC LIMIT 10000',
        id, reportBranchIds,
      ),
      prisma.$queryRawUnsafe<Array<{id:string;action:string;summary:string;createdAt:Date}>>(
        'SELECT al."id",al."action",al."summary",al."createdAt" FROM "activity_logs" al LEFT JOIN "tasks" t ON t."id"=al."taskId" WHERE al."lawyerId"=$1 AND ($2::text[] IS NULL OR (t."id" IS NOT NULL AND COALESCE(t."branch_id",\'branch_main\')=ANY($2::text[]))) ORDER BY al."createdAt" ASC LIMIT 10000',
        id, reportBranchIds,
      ),
      prisma.$queryRawUnsafe<Array<{text:string;authorName:string|null;createdAt:Date;taskDescription:string}>>(
        'SELECT c."text",c."authorName",c."createdAt",t."description" AS "taskDescription" FROM "comments" c JOIN "tasks" t ON t."id"=c."taskId" JOIN "task_assignments" ta ON ta."taskId"=t."id" WHERE ta."lawyerId"=$1 AND ($2::text[] IS NULL OR COALESCE(t."branch_id",\'branch_main\')=ANY($2::text[])) ORDER BY c."createdAt" ASC LIMIT 10000',
        id, reportBranchIds,
      ),
      prisma.$queryRawUnsafe<Array<{login_at:Date;logout_at:Date|null;last_seen_at:Date|null;duration_seconds:number|null}>>(
        'SELECT "login_at","logout_at","last_seen_at","duration_seconds" FROM "office_login_logs" WHERE "lawyer_id"=$1 ORDER BY "login_at" ASC LIMIT 10000',
        id,
      ),
    ]);
    for (const task of tasks) timeline.push(timelineItem(task.scheduledDate || task.createdAt, 'مهمة / جلسة', [task.caseName ? task.caseName + ' (' + task.caseNumber + ')' : '', task.description, task.notes].filter(Boolean).join(' — '), [task.locationName, statusName(task.status), task.scheduledTime, task.completedAt ? 'اكتملت ' + reportDate(task.completedAt) : ''].filter(Boolean).join(' · '), 'tasks'));
    for (const activity of activities) timeline.push(timelineItem(activity.createdAt, activity.action || 'نشاط مسجل', activity.summary, 'سجل النشاط', 'activity'));
    const caseMap = new Map<string, { date: Date; name: string; number: string; task: string }>();
    for (const task of tasks) {
      if (!task.caseId || !task.caseName) continue;
      const date = task.scheduledDate || task.createdAt;
      const existing = caseMap.get(task.caseId);
      if (!existing || date.getTime() > existing.date.getTime()) caseMap.set(task.caseId, { date, name: task.caseName, number: task.caseNumber || '', task: task.description });
    }
    for (const record of caseMap.values()) timeline.push(timelineItem(record.date, 'قضية: ' + record.name, 'رقم القضية: ' + record.number, 'مهمة/جلسة: ' + record.task, 'cases'));
    for (const log of attendanceLogs) {
      const duration = Math.max(0, log.duration_seconds || (log.logout_at ? Math.floor((new Date(log.logout_at).getTime() - new Date(log.login_at).getTime()) / 1000) : 0));
      const durationText = duration ? Math.floor(duration / 3600) + ' س ' + Math.floor((duration % 3600) / 60) + ' د' : '—';
      timeline.push(timelineItem(log.login_at, 'تسجيل الدخول', 'مدة الجلسة: ' + durationText, 'تسجيل الخروج: ' + (log.logout_at ? reportDate(log.logout_at) : (log.last_seen_at ? reportDate(log.last_seen_at) + ' · ' : '') + 'لم يُسجّل بعد'), 'attendance'));
    }
    for (const comment of comments) timeline.push(timelineItem(comment.createdAt, 'تعليق على مهمة: ' + comment.taskDescription, comment.text, comment.authorName || '', 'comments'));
    counts = [{ label: 'المهام والجلسات', value: tasks.length }, { label: 'القضايا', value: caseMap.size }, { label: 'تسجيل الدخول والخروج', value: attendanceLogs.length }, { label: 'سجلات النشاط', value: activities.length }, { label: 'التعليقات', value: comments.length }];
  } else {
    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) notFound();
    if (!isManager) {
      if (session.role !== 'lawyer') redirect('/auth');
      const locationAccess = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT ta."id" FROM "task_assignments" ta JOIN "tasks" t ON t."id"=ta."taskId" WHERE ta."lawyerId"=$1 AND t."locationId"=$2 LIMIT 1',
        session.lawyerId, id,
      );
      if (!locationAccess.length) redirect('/auth');
    }
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
      { label: 'آخر تحقق', value: reportDate(location.lastVerified) },
      { label: 'الوصف', value: clean(location.description) },
    ];
    const [tasks, activities] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{id:string;caseId:string|null;description:string;notes:string|null;scheduledDate:Date|null;scheduledTime:string|null;status:string;createdAt:Date;caseName:string|null;caseNumber:string|null;clientName:string|null;lawyerName:string|null}>>(
        'SELECT t."id",t."caseId",t."description",t."notes",t."scheduledDate",t."scheduledTime",t."status",t."createdAt",cr."name" AS "caseName",cr."number" AS "caseNumber",cr."clientName",ly."fullName" AS "lawyerName" FROM "tasks" t LEFT JOIN "case_records" cr ON cr."id"=t."caseId" LEFT JOIN "task_assignments" ta ON ta."taskId"=t."id" LEFT JOIN "lawyers" ly ON ly."id"=ta."lawyerId" WHERE t."locationId"=$1 AND ($2::text[] IS NULL OR COALESCE(t."branch_id",\'branch_main\')=ANY($2::text[])) AND ($3::text IS NULL OR EXISTS (SELECT 1 FROM "task_assignments" own WHERE own."taskId"=t."id" AND own."lawyerId"=$3)) ORDER BY t."createdAt" ASC LIMIT 10000',
        id, reportBranchIds, reportLawyerId,
      ),
      prisma.$queryRawUnsafe<Array<{id:string;action:string;summary:string;createdAt:Date}>>(
        'SELECT al."id",al."action",al."summary",al."createdAt" FROM "activity_logs" al LEFT JOIN "tasks" t ON t."id"=al."taskId" WHERE al."locationId"=$1 AND ($2::text[] IS NULL OR (t."id" IS NOT NULL AND COALESCE(t."branch_id",\'branch_main\')=ANY($2::text[]))) AND ($3::text IS NULL OR EXISTS (SELECT 1 FROM "task_assignments" own WHERE own."taskId"=t."id" AND own."lawyerId"=$3)) ORDER BY al."createdAt" ASC LIMIT 10000',
        id, reportBranchIds, reportLawyerId,
      ),
    ]);
    for (const task of tasks) timeline.push(timelineItem(task.scheduledDate || task.createdAt, 'جلسة / مهمة', [task.caseName ? task.caseName + ' (' + task.caseNumber + ')' : '', task.clientName || '', task.description, task.notes].filter(Boolean).join(' — '), [task.lawyerName, statusName(task.status), task.scheduledTime].filter(Boolean).join(' · '), 'tasks'));
    const locationCases = new Map<string, { date: Date; name: string; number: string; task: string }>();
    for (const task of tasks) {
      if (!task.caseId || !task.caseName) continue;
      const date = task.scheduledDate || task.createdAt;
      const old = locationCases.get(task.caseId);
      if (!old || date.getTime() > old.date.getTime()) locationCases.set(task.caseId, { date, name: task.caseName, number: task.caseNumber || '', task: task.description });
    }
    for (const record of locationCases.values()) timeline.push(timelineItem(record.date, 'قضية: ' + record.name, 'رقم القضية: ' + record.number, 'مهمة/جلسة: ' + record.task, 'cases'));
    for (const activity of activities) timeline.push(timelineItem(activity.createdAt, activity.action || 'نشاط مسجل', activity.summary, 'سجل النشاط', 'activity'));
    counts = [{ label: 'الجلسات والمهام', value: tasks.length }, { label: 'سجلات النشاط', value: activities.length }];
  }

  const defaultSections: Record<string, ReportSectionKey[]> = {
    client: ['basic', 'cases', 'files', 'developments', 'tasks', 'appointments'],
    case: ['basic', 'files', 'developments', 'tasks'],
    lawyer: ['basic', 'cases', 'tasks', 'attendance', 'activity', 'comments'],
    location: ['basic', 'cases', 'tasks', 'activity'],
  };
  const validSections: ReportSectionKey[] = ['basic', 'cases', 'tasks', 'attendance', 'activity', 'files', 'developments', 'appointments', 'comments'];
  const requestedSections = new Set<ReportSectionKey>((query.sections ? query.sections.split(',') : defaultSections[type]).filter((value): value is ReportSectionKey => validSections.includes(value as ReportSectionKey)));
  const periodStart = getPeriodStart(query.period || 'all');
  if (periodStart) {
    timeline = timeline.filter((item) => {
      if (!item.date) return true;
      const date = item.date instanceof Date ? item.date : new Date(item.date);
      return !Number.isNaN(date.getTime()) && date >= periodStart;
    });
    files = files.filter((file) => {
      if (!file.date) return false;
      const date = file.date instanceof Date ? file.date : new Date(file.date);
      return !Number.isNaN(date.getTime()) && date >= periodStart;
    });
  }
  timeline = timeline.filter((item) => requestedSections.has(item.category));
  if (!requestedSections.has('basic')) info = [];
  if (!requestedSections.has('files')) files = [];
  const sectionForCount = (label: string): ReportSectionKey => {
    if (label === 'القضايا') return 'cases';
    if (label.includes('مستجد')) return 'developments';
    if (label.includes('جلسات') || label.includes('المهام')) return 'tasks';
    if (label === 'المواعيد') return 'appointments';
    if (label === 'المستندات') return 'files';
    if (label === 'سجلات النشاط') return 'activity';
    if (label === 'التعليقات') return 'comments';
    if (label === 'تسجيل الدخول والخروج') return 'attendance';
    return 'basic';
  };
  counts = counts.filter((item) => requestedSections.has(sectionForCount(item.label))).map((item) => {
    const section = sectionForCount(item.label);
    let value = item.value;
    if (section === 'cases') value = timeline.filter((item) => item.category === 'cases').length;
    else if (section === 'developments') {
      if (item.label === 'مستجدات العميل') value = timeline.filter((entry) => entry.category === 'developments' && entry.title.includes('العميل')).length;
      else if (item.label === 'مستجدات القضايا') value = timeline.filter((entry) => entry.category === 'developments' && !entry.title.includes('العميل')).length;
      else value = timeline.filter((entry) => entry.category === 'developments').length;
    }
    else if (section === 'tasks') value = timeline.filter((item) => item.category === 'tasks').length;
    else if (section === 'appointments') value = timeline.filter((item) => item.category === 'appointments').length;
    else if (section === 'files') value = files.length;
    else if (section === 'activity') value = timeline.filter((item) => item.category === 'activity').length;
    else if (section === 'comments') value = timeline.filter((item) => item.category === 'comments').length;
    else if (section === 'attendance') value = timeline.filter((item) => item.category === 'attendance').length;
    return { ...item, value };
  });
  title = translateReport(title, language);
  subtitle = translateReport(subtitle, language);
  info = info.map((item) => ({ label: translateReport(item.label, language), value: translateReport(item.value, language) }));
  files = files.map((file) => ({ ...file, meta: translateReport(file.meta || '', language) }));
  timeline = timeline.map((item) => ({ ...item, title: translateReport(item.title, language), detail: translateReport(item.detail, language), meta: translateReport(item.meta || '', language) }));
  counts = counts.map((item) => ({ ...item, label: translateReport(item.label, language) }));
  const showTimeline = ['cases', 'tasks', 'attendance', 'activity', 'developments', 'appointments', 'comments'].some((section) => requestedSections.has(section));
  timeline.sort((a, b) => {
    const left = a.date ? (a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime()) : 0;
    const right = b.date ? (b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime()) : 0;
    return left - right;
  });

  return (
    <main lang={language} dir={direction} className={`mx-auto min-h-screen w-full max-w-[1100px] bg-white px-4 py-5 text-navy-950 sm:px-8 print:max-w-none print:px-0 print:py-0 ${query.preview === '1' ? 'report-preview-mode' : ''}`}>
      <AutoPrint enabled={query.print === '1'} />
      <section className="print-report" dir={direction} aria-label={t("قالب التقرير للطباعة")}>
        <header className="print-report-header">
          <div className="print-report-brand">LOUTFI LAW FIRM <span>· EST. 1949</span></div>
          <div className="print-report-confidential">{t("تقرير داخلي سري")}</div>
          <h1>{title}</h1>
          <h2>{name}</h2>
          <p>{subtitle}</p>
          <p className="print-report-date">{t("تاريخ إعداد التقرير")}: {reportDate(new Date())}</p>
        </header>
        {counts.length > 0 && <h3 className="print-report-section-title">{t("ملخص التقرير")}</h3>}
        {counts.length > 0 && <table className="print-report-table"><thead><tr><th>{t("البند")}</th><th>{t("العدد")}</th></tr></thead><tbody>
          {counts.map((count) => <tr key={count.label}><td>{count.label}</td><td>{count.value}</td></tr>)}
        </tbody></table>}
        {info.length > 0 && <><h3 className="print-report-section-title">{t("البيانات الأساسية")}</h3>
        <table className="print-report-table"><tbody>
          {info.map((item) => <tr key={item.label}><th>{item.label}</th><td>{item.value}</td></tr>)}
        </tbody></table></>}
        {files.length > 0 && <>
          <h3 className="print-report-section-title">{t("المستندات والملفات")} ({files.length})</h3>
          <table className="print-report-table"><thead><tr><th>{t("اسم المستند")}</th><th>{t("النوع / الحجم")}</th><th>{t("تاريخ الإضافة")}</th></tr></thead><tbody>
            {files.map((file, index) => <tr key={file.name + index}><td>{file.name}</td><td>{file.meta || '—'}</td><td>{reportDate(file.date)}</td></tr>)}
          </tbody></table>
        </>}
        {showTimeline && <h3 className="print-report-section-title">{t("التسلسل الزمني للمستجدات")} ({timeline.length})</h3>}
        {showTimeline && (timeline.length > 0 ? <table className="print-report-table"><thead><tr><th>{t("التاريخ")}</th><th>{t("السجل")}</th><th>{t("التفاصيل")}</th><th>{t("بيانات إضافية")}</th></tr></thead><tbody>
          {timeline.map((item, index) => <tr key={index}><td>{reportDate(item.date)}</td><td>{item.title}</td><td>{item.detail || '—'}</td><td>{item.meta || '—'}</td></tr>)}
        </tbody></table> : <p className="print-report-empty">{t("لا توجد مستجدات مسجلة حتى الآن.")}</p>)}
        <footer className="print-report-footer">{t("تم استخراج هذا التقرير من السجلات المحفوظة بالنظام وقت إعداده. يُرجى مراجعة المستندات الأصلية والتحقق من آخر التحديثات.")}</footer>
      </section>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="rounded-full border border-navy-200 px-4 py-2 text-xs font-bold text-navy-600">{t("العودة للملف")}</Link>
        <a href="?print=1" className="rounded-full bg-navy-950 px-4 py-2 text-xs font-extrabold text-white">{t("حفظ PDF / طباعة")}</a>
      </div>
      <div className="screen-report" dir={direction} contentEditable={query.preview === '1'} suppressContentEditableWarning={query.preview === '1'} spellCheck={query.preview === '1'}>
      <header className="border-b-2 border-navy-950 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black tracking-[2px] text-gold-700">LOUTFI LAW FIRM · EST. 1949</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h1>
            <h2 className="mt-2 text-lg font-extrabold">{name}</h2>
            <p className="mt-1 text-xs leading-6 text-navy-500">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-navy-100 p-3 text-left text-[10px] leading-6 text-navy-500">
            {branding.logoDataUrl ? <img src={branding.logoDataUrl} alt="Loutfi" className="mb-2 max-h-12 max-w-[150px] object-contain" /> : <p className="mb-2 font-black tracking-[2px] text-navy-950">LOUTFI LAW FIRM</p>}
            <p>{t('تاريخ إعداد التقرير')}</p>
            <p className="font-bold text-navy-800">{reportDate(new Date())}</p>
            <p>{t("تقرير داخلي · سري")}</p>
          </div>
        </div>
      </header>
      {counts.length > 0 && <section className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {counts.map((count) => <div key={count.label} className="rounded-xl bg-ivory-50 p-3"><p className="text-[10px] font-bold text-navy-500">{count.label}</p><p className="mt-1 text-xl font-black">{count.value}</p></div>)}
      </section>}
      {info.length > 0 && <section className="mt-6 break-inside-avoid">
        <h3 className="mb-3 border-r-4 border-gold-500 pr-3 text-sm font-black">{t("البيانات الأساسية")}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {info.map((item) => <div key={item.label} className="break-inside-avoid rounded-xl border border-navy-100 p-3"><p className="text-[10px] font-bold text-navy-400">{item.label}</p><p className="mt-1 whitespace-pre-wrap break-words text-xs font-semibold leading-6">{item.value}</p></div>)}
        </div>
      </section>}
      {files.length > 0 && <section className="mt-6 break-inside-avoid">
        <h3 className="mb-3 border-r-4 border-gold-500 pr-3 text-sm font-black">{t("المستندات والملفات")} ({files.length})</h3>
        <div className="space-y-2">{files.map((file, index) => <div key={file.name + index} className="flex flex-wrap justify-between gap-2 rounded-lg border border-navy-100 px-3 py-2 text-xs"><span className="font-bold">{file.name}</span><span className="text-navy-500">{file.meta || ''} · {reportDate(file.date)}</span></div>)}</div>
      </section>}
      {showTimeline && <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h3 className="border-r-4 border-gold-500 pr-3 text-sm font-black">{t("التسلسل الزمني الكامل للمستجدات")}</h3>
          <span className="text-[10px] font-bold text-navy-400">{timeline.length} {t("سجل")} · {t("مرتبة من الأقدم إلى الأحدث")}</span>
        </div>
        {timeline.length ? <div className="relative space-y-2 before:absolute before:bottom-2 before:right-[7px] before:top-2 before:w-px before:bg-navy-100">{timeline.map((item, index) => <article key={index} className="relative break-inside-avoid pr-7">
          <span className="absolute right-0 top-2 h-4 w-4 rounded-full border-4 border-white bg-gold-500 ring-1 ring-gold-200"/>
          <div className="rounded-xl border border-navy-100 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="text-xs font-black">{item.title}</h4><time className="text-[10px] font-bold text-navy-400">{reportDate(item.date)}</time></div>
            <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-navy-700">{item.detail || '—'}</p>
            {item.meta && <p className="mt-2 text-[10px] font-bold text-gold-700">{item.meta}</p>}
          </div>
        </article>)}</div> : <p className="rounded-xl border border-dashed border-navy-200 p-8 text-center text-xs font-semibold text-navy-400">{t("لا توجد مستجدات مسجلة حتى الآن.")}</p>)}
      </section>}
      <footer className="mt-8 border-t border-navy-200 pt-3 text-[9px] leading-5 text-navy-400">
        {t("هذا التقرير جُمِع من السجلات المحفوظة بالنظام وقت إعداده. لا يغني عن مراجعة المستندات الأصلية والتحقق من آخر تحديثات الملف.")}
      </footer>
      </div>
      <style>{`
        @page { size: A4; margin: 13mm 12mm 15mm; }
        .print-report { display: none; }
        @media print {
          .screen-report { display: none !important; }
          .print-report { display: block !important; direction: ${direction}; color: #18263a; font-family: Arial, sans-serif; font-size: 9pt; }
          .print-report-header { border-bottom: 2px solid #18263a; padding-bottom: 12pt; margin-bottom: 16pt; }
          .print-report-brand { font-size: 10pt; font-weight: 800; letter-spacing: 1px; }
          .print-report-brand span { color: #8a6a3a; }
          .print-report-confidential { float: left; font-size: 8pt; color: #6b6b6b; }
          .print-report-header h1 { margin-top: 12pt; font-size: 18pt; font-weight: 800; }
          .print-report-header h2 { margin-top: 5pt; font-size: 13pt; font-weight: 700; }
          .print-report-header p { margin-top: 4pt; line-height: 1.6; }
          .print-report-date { font-size: 8pt; color: #555; }
          .print-report-section-title { margin: 14pt 0 6pt; padding-right: 7pt; border-right: 3px solid #8a6a3a; font-size: 11pt; font-weight: 800; break-after: avoid; }
          .print-report-table { width: 100%; border-collapse: collapse; table-layout: auto; margin-bottom: 8pt; }
          .print-report-table th, .print-report-table td { border: 1px solid #d7dce2; padding: 5pt 6pt; text-align: start; vertical-align: top; line-height: 1.5; overflow-wrap: anywhere; }
          .print-report-table thead th { background: #18263a !important; color: #fff !important; font-weight: 700; }
          .print-report-table tbody th { width: 26%; background: #f7f5f0 !important; font-weight: 700; }
          .print-report-table tr { break-inside: avoid; page-break-inside: avoid; }
          .print-report-empty { padding: 10pt; border: 1px dashed #d7dce2; }
          .print-report-footer { margin-top: 18pt; padding-top: 7pt; border-top: 1px solid #cbd2da; color: #555; font-size: 8pt; line-height: 1.6; }
          html, body { background: #fff !important; color: #18263a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-size: 10pt; }
          main { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
          header { padding-bottom: 10pt !important; border-bottom: 2px solid #18263a !important; break-after: avoid; }
          header h1 { font-size: 19pt !important; line-height: 1.35 !important; }
          header h2 { font-size: 14pt !important; }
          header p { line-height: 1.5 !important; }
          main > section { margin-top: 14pt !important; }
          main > section > h3, main > section > div > h3 { font-size: 11pt !important; }
          main section .grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 6pt !important; }
          main section .grid > div { border: 1px solid #d7dce2 !important; border-radius: 3pt !important; padding: 7pt !important; background: #fff !important; }
          main section .grid > div p:last-child { font-size: 9pt !important; line-height: 1.55 !important; overflow-wrap: anywhere; }
          main section .space-y-2 > div { border: 0 !important; border-bottom: 1px solid #e2e6eb !important; border-radius: 0 !important; padding: 6pt 0 !important; }
          main section article { break-inside: avoid; page-break-inside: avoid; padding-right: 18pt !important; }
          main section article > div { border: 0 !important; border-bottom: 1px solid #e2e6eb !important; border-radius: 0 !important; padding: 7pt 0 !important; background: #fff !important; }
          main section article p { font-size: 9pt !important; line-height: 1.55 !important; }
          main section article h4 { font-size: 9.5pt !important; }
          .rounded-xl, .rounded-2xl, .rounded-lg { border-radius: 3pt !important; }
          .bg-ivory-50 { background: #f7f5f0 !important; }
          .text-navy-400, .text-navy-500 { color: #515b68 !important; }
          footer { margin-top: 18pt !important; padding-top: 7pt !important; border-top: 1px solid #cbd2da !important; font-size: 8pt !important; }
          .print\\:hidden { display: none !important; }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      {query.preview === '1' && <style>{"\nbody:has(.report-preview-mode) { padding-top: 0 !important; background: #fff !important; background-image: none !important; }\nbody:has(.report-preview-mode) > header,\nbody:has(.report-preview-mode) > footer,\nbody:has(.report-preview-mode) > #two-week-warning,\nbody:has(.report-preview-mode) .site-floating-nav { display: none !important; }\nbody:has(.report-preview-mode) .page-content { animation: none !important; }\n.report-preview-mode { min-height: 0 !important; max-width: none !important; margin: 0 auto !important; padding: 16px !important; }\n.report-preview-mode > .mb-5 { display: none !important; }\n.report-preview-mode .print-report { display: none !important; }\n.report-preview-mode .screen-report { display: block !important; caret-color: #8a6a3a; }\n.report-preview-mode .screen-report[contenteditable=\"true\"]:focus { outline: none; }\n@media print {\n  body:has(.report-preview-mode) { padding: 0 !important; background: #fff !important; }\n  body:has(.report-preview-mode) > header,\n  body:has(.report-preview-mode) > footer,\n  body:has(.report-preview-mode) > #two-week-warning,\n  body:has(.report-preview-mode) .site-floating-nav { display: none !important; }\n  .report-preview-mode { max-width: none !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; }\n  .report-preview-mode .screen-report { display: block !important; }\n  .report-preview-mode .print-report { display: none !important; }\n}"}</style>}
    </main>
  );
}
