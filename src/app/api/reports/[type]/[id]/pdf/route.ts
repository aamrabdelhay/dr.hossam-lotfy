import { createElement as h } from 'react';
import path from 'node:path';
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { RTLText, disableHyphenation } from 'react-pdf-rtl';
import { getBranchScope } from '@/lib/branch-access';
import { getCurrentUser, type SessionUser } from '@/lib/auth';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type DbRow = Record<string, unknown>;
type Section = { title: string; columns: string[]; rows: string[][] };

const fontRoot = path.join(process.cwd(), 'node_modules', '@fontsource', 'cairo', 'files');
Font.register({ family: 'Cairo', fonts: [
  { src: path.join(fontRoot, 'cairo-arabic-400-normal.woff'), fontWeight: 400 },
  { src: path.join(fontRoot, 'cairo-arabic-700-normal.woff'), fontWeight: 700 },
] });
disableHyphenation();

const titles = {
  ar: { client: 'تقرير عميل', case: 'تقرير قضية', lawyer: 'تقرير محامٍ', location: 'تقرير جهة / مكان عمل' },
  en: { client: 'Client Report', case: 'Case Report', lawyer: 'Lawyer Report', location: 'Location Report' },
  fr: { client: 'Rapport client', case: 'Rapport de dossier', lawyer: 'Rapport avocat', location: 'Rapport de lieu' },
} as const;
const copy = {
  ar: { confidential: 'سري — للاستخدام الداخلي', basic: 'البيانات الأساسية', cases: 'القضايا المرتبطة', tasks: 'الجلسات والمهام', events: 'المستجدات وسجل القضية', name: 'الاسم', number: 'الرقم', type: 'النوع', phone: 'الهاتف', email: 'البريد الإلكتروني', address: 'العنوان', branch: 'الفرع', responsible: 'المحامي المسؤول', status: 'الحالة', created: 'تاريخ الإنشاء', updated: 'آخر تحديث', notes: 'ملاحظات', description: 'التفاصيل', specialization: 'التخصص', position: 'المنصب', city: 'المدينة', governorate: 'المحافظة', date: 'التاريخ', time: 'الوقت', item: 'البيان', location: 'الجهة / المكان', caseName: 'القضية', lawyer: 'المحامي', category: 'التصنيف', issued: 'تاريخ الإصدار', issuer: 'أعد التقرير', noRows: 'لا توجد بيانات مسجلة لهذا القسم.' },
  en: { confidential: 'Confidential — Internal Use', basic: 'Basic Information', cases: 'Related Cases', tasks: 'Sessions and Tasks', events: 'Case Timeline', name: 'Name', number: 'Number', type: 'Type', phone: 'Phone', email: 'Email', address: 'Address', branch: 'Branch', responsible: 'Responsible Lawyer', status: 'Status', created: 'Created', updated: 'Last Updated', notes: 'Notes', description: 'Details', specialization: 'Specialization', position: 'Position', city: 'City', governorate: 'Governorate', date: 'Date', time: 'Time', item: 'Item', location: 'Location', caseName: 'Case', lawyer: 'Lawyer', category: 'Category', issued: 'Issued At', issuer: 'Prepared By', noRows: 'No records are available for this section.' },
  fr: { confidential: 'Confidentiel — Usage interne', basic: 'Informations principales', cases: 'Dossiers associés', tasks: 'Séances et tâches', events: 'Historique du dossier', name: 'Nom', number: 'Numéro', type: 'Type', phone: 'Téléphone', email: 'E-mail', address: 'Adresse', branch: 'Agence', responsible: 'Avocat responsable', status: 'Statut', created: 'Créé le', updated: 'Mis à jour', notes: 'Notes', description: 'Détails', specialization: 'Spécialité', position: 'Fonction', city: 'Ville', governorate: 'Gouvernorat', date: 'Date', time: 'Heure', item: 'Élément', location: 'Lieu', caseName: 'Dossier', lawyer: 'Avocat', category: 'Catégorie', issued: 'Date d’émission', issuer: 'Préparé par', noRows: 'Aucun enregistrement pour cette section.' },
} as const;

const styles = StyleSheet.create({
  page: { paddingTop: 78, paddingBottom: 54, paddingHorizontal: 36, fontFamily: 'Cairo', fontSize: 9, color: '#242424', backgroundColor: '#FFFFFF' },
  header: { position: 'absolute', top: 23, left: 36, right: 36, paddingBottom: 8, borderBottomWidth: 1.5, borderBottomColor: '#18263A', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 10, fontWeight: 700, color: '#18263A' },
  brandSub: { fontSize: 7, color: '#8A6A3A' },
  confidential: { fontSize: 7, color: '#637083' },
  footer: { position: 'absolute', bottom: 22, left: 36, right: 36, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#DCE1E7', flexDirection: 'row-reverse', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#637083' },
  title: { fontSize: 17, fontWeight: 700, color: '#18263A', textAlign: 'right', marginBottom: 3 },
  entity: { fontSize: 12, fontWeight: 700, color: '#8A6A3A', textAlign: 'right', marginBottom: 6 },
  subtitle: { fontSize: 8, color: '#637083', textAlign: 'right', marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: '#18263A', textAlign: 'right', marginTop: 12, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#DCE1E7' },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', borderBottomWidth: 0.5, borderBottomColor: '#E7EAEE', paddingVertical: 5 },
  infoLabel: { width: '30%', color: '#637083', textAlign: 'right', paddingHorizontal: 5 },
  infoValue: { width: '70%', color: '#18263A', textAlign: 'right', paddingHorizontal: 5 },
  tableHead: { flexDirection: 'row-reverse', backgroundColor: '#18263A', paddingVertical: 6, paddingHorizontal: 4 },
  headCell: { flex: 1, fontSize: 7.5, fontWeight: 700, color: '#FFFFFF', textAlign: 'right', paddingHorizontal: 3 },
  tableRow: { flexDirection: 'row-reverse', paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: '#DCE1E7' },
  cell: { flex: 1, fontSize: 7.5, color: '#263448', textAlign: 'right', paddingHorizontal: 3, lineHeight: 1.45 },
  empty: { fontSize: 8, color: '#637083', textAlign: 'right', padding: 8 },
});

function format(value: unknown, lang: keyof typeof copy): string {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
  if (Array.isArray(value)) return value.map(String).join(lang === 'ar' ? '، ' : ', ');
  if (typeof value === 'boolean') return value ? (lang === 'ar' ? 'نعم' : lang === 'fr' ? 'Oui' : 'Yes') : (lang === 'ar' ? 'لا' : lang === 'fr' ? 'Non' : 'No');
  return String(value);
}
function sectionBlock(section: Section, labels: typeof copy[keyof typeof copy], lang: keyof typeof copy) {
  const T = lang === 'ar' ? RTLText : Text;
  const align = lang === 'ar' ? {} : { textAlign: 'left' as const };
  const rowDirection = lang === 'ar' ? {} : { flexDirection: 'row' as const };
  return h(View, { key: section.title, style: { marginBottom: 4 } },
    h(T, { style: [styles.sectionTitle, align] }, section.title),
    h(View, { style: [styles.tableHead, rowDirection], wrap: false }, ...section.columns.map((col, i) => h(T, { key: 'h' + i, style: [styles.headCell, align] }, col))),
    ...(section.rows.length
      ? section.rows.map((row, ri) => h(View, { key: 'r' + ri, style: [styles.tableRow, rowDirection], wrap: false }, ...row.map((cell, ci) => h(T, { key: 'c' + ci, style: [styles.cell, align] }, cell))))
      : [h(T, { key: 'empty', style: [styles.empty, align] }, labels.noRows)]));
}

async function branchAllowed(session: SessionUser, scope: Awaited<ReturnType<typeof getBranchScope>>, record: DbRow, type: string): Promise<boolean> {
  if (scope.allBranches || scope.branchIds.length === 0 || scope.branchIds.includes(String(record.branch_id || 'branch_main'))) return true;
  if (session.role === 'lawyer' && type === 'client' && record.assignedLawyerId === session.lawyerId) return true;
  if (session.role === 'lawyer' && type === 'case') {
    const linked = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT t."id" FROM "tasks" t LEFT JOIN "task_assignments" ta ON ta."taskId"=t."id" WHERE t."caseId"=$1 AND (t."authorId"=$2 OR ta."lawyerId"=$2) LIMIT 1',
      record.id, session.lawyerId);
    return linked.length > 0;
  }
  return false;
}

export async function GET(request: Request, context: { params: Promise<{ type: string; id: string }> }) {
  try {
    const { type, id } = await context.params;
    if (!['client', 'case', 'lawyer', 'location'].includes(type) || !id || id.length > 160) return Response.json({ error: 'Invalid report reference' }, { status: 400 });
    const session = await getCurrentUser();
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const scope = await getBranchScope(session);
    const senior = await isSeniorManagement(session);
    const elevated = senior || (session.role === 'admin' && (session.userRole === 'ADMIN' || session.userRole === 'SUPER_ADMIN')) || (session.role === 'lawyer' && session.isAdmin);

    let rows: DbRow[] = [];
    if (type === 'location') rows = await prisma.$queryRawUnsafe<DbRow[]>('SELECT "id","name","nameEn","type","subType","governorate","city","district","address","phone","email","website","workingHours","services","jurisdiction","description","lastVerified" FROM "locations" WHERE "id"=$1 LIMIT 1', id);
    if (type === 'lawyer') {
      if (session.role === 'lawyer' && session.lawyerId !== id && !elevated) return Response.json({ error: 'Forbidden' }, { status: 403 });
      rows = await prisma.$queryRawUnsafe<DbRow[]>('SELECT "id","fullName","slug","title","phone","email","specialization","position","active","createdAt","updatedAt" FROM "lawyers" WHERE "id"=$1 LIMIT 1', id);
    }
    if (type === 'client') rows = await prisma.$queryRawUnsafe<DbRow[]>('SELECT c."id",c."name",c."phone",c."email",c."address",c."notes",c."assignedLawyerId",c."branch_id",c."status",c."createdAt",c."updatedAt",l."fullName" AS "assignedLawyerName",ob."name_ar" AS "branchName" FROM "clients" c LEFT JOIN "lawyers" l ON l."id"=c."assignedLawyerId" LEFT JOIN "office_branches" ob ON ob."id"=c."branch_id" WHERE c."id"=$1 LIMIT 1', id);
    if (type === 'case') rows = await prisma.$queryRawUnsafe<DbRow[]>('SELECT cr."id",cr."name",cr."number",cr."description",cr."clientName",cr."clientId",cr."branch_id",cr."workflow_status",cat."name_ar" AS "categoryName",ob."name_ar" AS "branchName",COALESCE(cr."clientName",c."name") AS "linkedClientName" FROM "case_records" cr LEFT JOIN "case_clients" cc ON cc."case_id"=cr."id" LEFT JOIN "clients" c ON c."id"=COALESCE(cc."client_id",cr."clientId") LEFT JOIN "office_branches" ob ON ob."id"=cr."branch_id" LEFT JOIN "office_case_categories" cat ON cat."id"=cr."category_id" WHERE cr."id"=$1 LIMIT 1', id);

    const record = rows[0];
    if (!record) return Response.json({ error: 'Report record not found' }, { status: 404 });
    if (!elevated && (type === 'client' || type === 'case') && !(await branchAllowed(session, scope, record, type))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // All downloadable reports are Arabic-first regardless of the UI language,
    // URL parameters, cookies, or browser language. Keep labels and dates Arabic.
    const rawLang = (new URL(request.url).searchParams.get('lang') || 'ar').toLowerCase();
    const lang: keyof typeof copy = rawLang.startsWith('fr') ? 'fr' : rawLang.startsWith('en') ? 'en' : 'ar';
    const direction = lang === 'ar' ? 'rtl' : 'ltr';
    const url = new URL(request.url);
    const selectedSections = new Set((url.searchParams.get('sections') || 'basic,cases,tasks,events,files,activity').split(',').filter(Boolean));
    const exportFormat = url.searchParams.get('format') || 'pdf';
    const period = url.searchParams.get('period') || 'all';
    const periodDays: Record<string, number> = { day: 1, week: 7, month: 30, '6months': 183, year: 365 };
    const periodStart = periodDays[period] ? new Date(Date.now() - periodDays[period] * 86400000) : null;
    const labels = copy[lang];
    const title = titles[lang][type as keyof typeof titles.ar];
    const entityName = String(record.name || record.fullName || record.nameEn || record.number || id);
    const info: Array<[string, unknown]> = [];
    if (type === 'client') info.push([labels.name, record.name], [labels.phone, record.phone], [labels.email, record.email], [labels.address, record.address], [labels.responsible, record.assignedLawyerName], [labels.branch, record.branchName], [labels.status, record.status], [labels.created, record.createdAt], [labels.updated, record.updatedAt], [labels.notes, record.notes]);
    if (type === 'case') info.push([labels.number, record.number], [labels.name, record.name], [labels.name === 'Name' ? 'Client' : labels.name === 'Nom' ? 'Client' : 'العميل', record.linkedClientName || record.clientName], [labels.category, record.categoryName], [labels.branch, record.branchName], [labels.status, record.workflow_status], [labels.description, record.description]);
    if (type === 'lawyer') info.push([labels.name, record.fullName], [labels.position, record.position || record.title], [labels.specialization, record.specialization], [labels.phone, record.phone], [labels.email, record.email], [labels.status, record.active], [labels.created, record.createdAt], [labels.updated, record.updatedAt]);
    if (type === 'location') info.push([labels.name, record.name], [labels.type, record.subType || record.type], [labels.governorate, record.governorate], [labels.city, record.city], [labels.address, record.address], [labels.phone, record.phone], [labels.email, record.email], [labels.category, record.jurisdiction], [labels.description, record.description]);

    const branchIds = scope.allBranches || scope.branchIds.length === 0 ? null : scope.branchIds;
    const sections: Section[] = [];
    if (selectedSections.has('cases') && type === 'client') {
      const cases = await prisma.$queryRawUnsafe<DbRow[]>(
        'SELECT DISTINCT cr."number",cr."name",cr."workflow_status",cat."name_ar" AS "categoryName",ob."name_ar" AS "branchName" FROM "case_records" cr LEFT JOIN "case_clients" cc ON cc."case_id"=cr."id" LEFT JOIN "office_branches" ob ON ob."id"=cr."branch_id" LEFT JOIN "office_case_categories" cat ON cat."id"=cr."category_id" WHERE (cr."clientId"=$1 OR cc."client_id"=$1) AND ($2::text[] IS NULL OR COALESCE(cr."branch_id",$3)=ANY($2::text[])) ORDER BY cr."number" LIMIT 100',
        id, branchIds, 'branch_main');
      sections.push({ title: labels.cases, columns: [labels.number, labels.name, labels.status, labels.branch], rows: cases.map((r) => [format(r.number, lang), format(r.name, lang), format(r.workflow_status, lang), format(r.branchName, lang)]) });
    }
    if (selectedSections.has('tasks') && (type === 'case' || type === 'location' || type === 'lawyer' || type === 'client')) {
      const where = type === 'case' ? 't."caseId"=$1' : type === 'location' ? 't."locationId"=$1' : type === 'client' ? 't."caseId" IN (SELECT cr."id" FROM "case_records" cr WHERE cr."clientId"=$1)' : '(t."authorId"=$1 OR ta."lawyerId"=$1)';
      const tasks = await prisma.$queryRawUnsafe<DbRow[]>(
        'SELECT t."description",t."notes",t."scheduledDate",t."scheduledTime",t."status",l."name" AS "locationName",cr."name" AS "caseName",cr."number" AS "caseNumber",COALESCE(string_agg(DISTINCT law."fullName",chr(44)||chr(32)),chr(8212)) AS "lawyers" FROM "tasks" t LEFT JOIN "locations" l ON l."id"=t."locationId" LEFT JOIN "case_records" cr ON cr."id"=t."caseId" LEFT JOIN "task_assignments" ta ON ta."taskId"=t."id" LEFT JOIN "lawyers" law ON law."id"=ta."lawyerId" WHERE ' + where + ' AND ($2::text[] IS NULL OR COALESCE(cr."branch_id",$3)=ANY($2::text[])) AND ($4::timestamp IS NULL OR COALESCE(t."scheduledDate"::timestamp,t."createdAt") >= $4) GROUP BY t."id",l."name",cr."name",cr."number" ORDER BY t."scheduledDate" DESC NULLS LAST,t."createdAt" DESC LIMIT 100',
        id, branchIds, 'branch_main', periodStart);
      sections.push({ title: labels.tasks, columns: [labels.date, labels.item, labels.location, labels.caseName, labels.lawyer], rows: tasks.map((r) => [format(r.scheduledDate, lang) + (r.scheduledTime ? ' ' + format(r.scheduledTime, lang) : ''), format(r.description, lang) + (r.notes ? ' — ' + format(r.notes, lang) : ''), format(r.locationName, lang), format(r.caseName || r.caseNumber, lang), format(r.lawyers, lang)]) });
    }
    if (selectedSections.has('events') && type === 'case') {
      const events = await prisma.$queryRawUnsafe<DbRow[]>('SELECT "description","type","authorName","createdAt" FROM "case_events" WHERE "caseId"=$1 AND ($2::timestamp IS NULL OR "createdAt">=$2) ORDER BY "createdAt" DESC LIMIT 100', id, periodStart);
      sections.push({ title: labels.events, columns: [labels.date, labels.item, labels.category, labels.issuer], rows: events.map((r) => [format(r.createdAt, lang), format(r.description, lang), format(r.type, lang), format(r.authorName, lang)]) });
    }
    if (selectedSections.has('files') && type === 'client') {
      const files = await prisma.$queryRawUnsafe<DbRow[]>('SELECT "name","kind","mime_type","size_bytes","created_at" FROM "client_files" WHERE "client_id"=$1 AND "deleted_at" IS NULL AND ($2::timestamp IS NULL OR "created_at">=$2) ORDER BY "created_at" DESC LIMIT 300', id, periodStart);
      sections.push({ title: lang === 'ar' ? 'ملفات العميل' : lang === 'fr' ? 'Fichiers du client' : 'Client Files', columns: [labels.name, labels.type, labels.date, lang === 'ar' ? 'الحجم' : lang === 'fr' ? 'Taille' : 'Size'], rows: files.map((r) => [format(r.name, lang), format(r.kind, lang), format(r.created_at, lang), format(r.size_bytes ? Math.round(Number(r.size_bytes) / 1024) + ' KB' : null, lang)]) });
    }
    if (selectedSections.has('events') && type === 'client') {
      const events = await prisma.$queryRawUnsafe<DbRow[]>('SELECT "description","type","author_name","created_at" FROM "client_events" WHERE "client_id"=$1 AND ($2::timestamp IS NULL OR "created_at">=$2) ORDER BY "created_at" DESC LIMIT 300', id, periodStart);
      sections.push({ title: labels.events, columns: [labels.date, labels.item, labels.category, labels.issuer], rows: events.map((r) => [format(r.created_at, lang), format(r.description, lang), format(r.type, lang), format(r.author_name, lang)]) });
    }
    if (selectedSections.has('activity') && type === 'lawyer') {
      const logs = await prisma.$queryRawUnsafe<DbRow[]>('SELECT "login_at","logout_at","duration_seconds" FROM "office_login_logs" WHERE "lawyer_id"=$1 AND ($2::timestamp IS NULL OR "login_at">=$2) ORDER BY "login_at" DESC LIMIT 500', id, periodStart);
      sections.push({ title: lang === 'ar' ? 'سجل الدخول والخروج' : lang === 'fr' ? 'Historique des connexions' : 'Sign-in / Sign-out Log', columns: [labels.date, lang === 'ar' ? 'وقت الخروج' : lang === 'fr' ? 'Déconnexion' : 'Signed out', lang === 'ar' ? 'المدة (ثانية)' : lang === 'fr' ? 'Durée (secondes)' : 'Duration (seconds)'], rows: logs.map((r) => [format(r.login_at, lang), format(r.logout_at, lang), format(r.duration_seconds, lang)]) });
      const activities = await prisma.$queryRawUnsafe<DbRow[]>('SELECT "createdAt","action","summary" FROM "activity_logs" WHERE "lawyerId"=$1 AND ($2::timestamp IS NULL OR "createdAt">=$2) ORDER BY "createdAt" DESC LIMIT 500', id, periodStart);
      sections.push({ title: lang === 'ar' ? 'الأنشطة المسجلة' : lang === 'fr' ? 'Activités enregistrées' : 'Recorded Activities', columns: [labels.date, labels.type, labels.description], rows: activities.map((r) => [format(r.createdAt, lang), format(r.action, lang), format(r.summary, lang)]) });
    }

    const document = h(Document, { title, author: 'Loutfi Law Firm' },
      h(Page, { size: 'A4', style: styles.page },
        h(View, { fixed: true, style: styles.header },
          h(View, null, h(Text, { style: styles.brand }, 'LOUTFI LAW FIRM'), h(Text, { style: styles.brandSub }, 'SINCE 1949')),
          h(RTLText, { style: styles.confidential }, labels.confidential)),
        h(lang === 'ar' ? RTLText : Text, { style: [styles.title, lang === 'ar' ? {} : { textAlign: 'left' }] }, title),
        h(lang === 'ar' ? RTLText : Text, { style: [styles.entity, lang === 'ar' ? {} : { textAlign: 'left' }] }, entityName),
        h(lang === 'ar' ? RTLText : Text, { style: [styles.subtitle, lang === 'ar' ? {} : { textAlign: 'left' }] }, labels.issued + ': ' + format(new Date(), lang) + '  |  ' + labels.issuer + ': ' + session.name),
        ...(selectedSections.has('basic') ? [h(lang === 'ar' ? RTLText : Text, { style: [styles.sectionTitle, lang === 'ar' ? {} : { textAlign: 'left' }] }, labels.basic),
        ...info.map((item, index) => h(View, { key: 'info-' + index, style: [styles.infoRow, lang === 'ar' ? {} : { flexDirection: 'row' }], wrap: false },
          h(lang === 'ar' ? RTLText : Text, { style: [styles.infoLabel, lang === 'ar' ? {} : { textAlign: 'left' }] }, item[0]), h(lang === 'ar' ? RTLText : Text, { style: [styles.infoValue, lang === 'ar' ? {} : { textAlign: 'left' }] }, format(item[1], lang)))]) : []),
        ...sections.map((section) => sectionBlock(section, labels, lang)),
        h(View, { fixed: true, style: styles.footer },
          h(RTLText, { style: styles.footerText }, labels.confidential),
          h(Text, { style: styles.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => String(pageNumber) + ' / ' + String(totalPages) }))));

    const safeName = entityName.replaceAll('/', ' ').replaceAll(':', ' ').replaceAll('*', ' ').replaceAll('?', ' ').replaceAll('"', ' ').replaceAll('<', ' ').replaceAll('>', ' ').replaceAll('|', ' ').trim().slice(0, 80) || id;
    const arabicType: Record<string, string> = { client: 'عميل', case: 'قضية', lawyer: 'محامٍ', location: 'جهة' };
    const reportName = (lang === 'ar' ? 'تقرير-' + (arabicType[type] || 'عام') : (lang === 'fr' ? 'rapport-' : 'report-') + type) + '-' + safeName + '-' + new Date().toISOString().slice(0, 10);
    const escapeHtml = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const logo = '<div style="text-align:right;font-family:Arial,sans-serif;border-bottom:2px solid #18263A;padding:0 0 10px;margin-bottom:18px"><div style="font-size:18px;font-weight:bold;color:#18263A;letter-spacing:2px">LOUTFI</div><div style="font-size:10px;color:#8A6A3A">LAW FIRM · SINCE 1949</div></div>';
    const tableHtml = (heading: string, columns: string[], rows: string[][]) => '<h2>' + escapeHtml(heading) + '</h2><table><thead><tr>' + columns.map(x => '<th>' + escapeHtml(x) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map(x => '<td>' + escapeHtml(x) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    const html = '<!doctype html><html lang="' + lang + '" dir="' + direction + '"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;direction:' + direction + ';text-align:' + (direction === 'rtl' ? 'right' : 'left') + ';color:#242424;margin:28px}h1{color:#18263A;font-size:22px}h2{font-size:15px;color:#18263A;border-bottom:1px solid #ddd;padding-bottom:6px;margin-top:22px}table{border-collapse:collapse;width:100%;margin:8px 0 18px;direction:' + direction + '}th,td{border:1px solid #dce1e7;padding:7px;text-align:' + (direction === 'rtl' ? 'right' : 'left') + ';vertical-align:top}th{background:#18263A;color:#fff}tr{page-break-inside:avoid}.meta{color:#637083;font-size:11px;margin:8px 0 16px}</style></head><body>' + logo + '<h1>' + escapeHtml(title) + '</h1><h2>' + escapeHtml(entityName) + '</h2><div class="meta">' + escapeHtml(labels.issued + ': ' + format(new Date(), lang) + ' | ' + labels.issuer + ': ' + session.name) + '</div>' + (selectedSections.has('basic') ? tableHtml(labels.basic, [labels.item, labels.description], info.map(item => [item[0], format(item[1], lang)])) : '') + sections.map(section => tableHtml(section.title, section.columns, section.rows)).join('') + '</body></html>';
    if (exportFormat === 'doc' || exportFormat === 'xls') {
      const isWord = exportFormat === 'doc';
      const filename = reportName + (isWord ? '.doc' : '.xls');
      return new Response('\\uFEFF' + html, { status: 200, headers: {
        'Content-Type': isWord ? 'application/msword; charset=utf-8' : 'application/vnd.ms-excel; charset=utf-8',
        "Content-Disposition": "attachment; filename=report." + exportFormat + "; filename*=UTF-8''" + encodeURIComponent(filename),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      } });
    }
    const buffer = await renderToBuffer(document);
    return new Response(new Uint8Array(buffer), { status: 200, headers: {
      'Content-Type': 'application/pdf',
      "Content-Disposition": "attachment; filename=report-" + type + ".pdf; filename*=UTF-8''" + encodeURIComponent(reportName + '.pdf'),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    console.error('[reports/pdf] Failed to generate report', error);
    return Response.json({ error: 'تعذر إنشاء ملف التقرير.' }, { status: 500 });
  }
}