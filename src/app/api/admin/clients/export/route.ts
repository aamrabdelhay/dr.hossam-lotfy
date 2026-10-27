import { NextResponse } from 'next/server';
import { handle, json } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { getBranchScope } from '@/lib/branch-access';
import { prisma } from '@/lib/prisma';
import { createXlsx } from '@/lib/xlsx';

type ClientRow = {
  id: string; name: string; phone: string | null; email: string | null; nationalId: string | null;
  address: string | null; notes: string | null; assignedLawyerId: string | null; branch_id: string | null;
};
type CaseRow = { id: string; name: string; number: string; description: string | null; clientId: string | null; clientName: string | null; linkedClientIds: string[] };
type EventRow = { id: string; caseId: string; description: string; type: string; authorName: string | null; createdAt: Date };
type TaskRow = { id: string; caseId: string | null; description: string; notes: string | null; scheduledDate: Date | null; scheduledTime: string | null; status: string; locationName: string | null; lawyerName: string | null; createdAt: Date };
type FileRow = { id: string; client_id: string; name: string; kind: string; size_bytes: number | null; created_at: Date };
type AppointmentRow = { id: string; client_id: string; appointment_date: Date | null; appointment_time: string | null; appointment_type: string; status: string };
type ClientEventRow = { id: string; client_id: string; description: string; type: string; author_name: string | null; created_at: Date };

function dateText(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value instanceof Date ? value.getTime() : value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
}

export const GET = handle(async (request: Request) => {
  const session = await getCurrentUser();
  if (!session) return json({ error: 'يجب تسجيل الدخول لتنزيل بيانات العملاء.' }, { status: 401 });
  const managementAccess = session.role === 'admin' || (session.role === 'lawyer' && session.isAdmin);
  const scope = await getBranchScope(session);
  const branchIds = !scope.allBranches && (scope.officeManager || scope.financeManager) ? scope.branchIds : null;
  if (branchIds && branchIds.length === 0) return json({ error: 'لا يوجد فرع مسموح لهذا الحساب لتنزيل البيانات.' }, { status: 403 });
  const requestedId = new URL(request.url).searchParams.get('id');

  let clients: ClientRow[];
  if (requestedId) {
    clients = await prisma.$queryRawUnsafe<ClientRow[]>(
      'SELECT "id","name","phone","email","nationalId","address","notes","assignedLawyerId","branch_id" FROM "clients" WHERE "id"=$1 AND ($2::text[] IS NULL OR COALESCE("branch_id",\'branch_main\')=ANY($2::text[])) LIMIT 1',
      requestedId, branchIds,
    );
    if (!clients[0]) return json({ error: 'العميل غير موجود أو خارج نطاق الفرع المسموح.' }, { status: 404 });
    if (!managementAccess && !(session.role === 'lawyer' && clients[0].assignedLawyerId === session.lawyerId)) {
      return json({ error: 'ليس لديك صلاحية لتنزيل ملف هذا العميل.' }, { status: 403 });
    }
  } else {
    if (!managementAccess) return json({ error: 'تنزيل قائمة جميع العملاء يتطلب صلاحية الإدارة.' }, { status: 403 });
    clients = await prisma.$queryRawUnsafe<ClientRow[]>(
      'SELECT "id","name","phone","email","nationalId","address","notes","assignedLawyerId","branch_id" FROM "clients" WHERE COALESCE("status",\'MAIN\') <> \'DELETED\' AND ($1::text[] IS NULL OR COALESCE("branch_id",\'branch_main\')=ANY($1::text[])) ORDER BY lower("name") LIMIT 5000',
      branchIds,
    );
  }
  if (!clients.length) return json({ error: 'لا توجد بيانات عملاء للتصدير.' }, { status: 404 });

  const clientIds = clients.map((client) => client.id);
  const cases = await prisma.$queryRawUnsafe<CaseRow[]>(
    'SELECT DISTINCT cr."id",cr."name",cr."number",cr."description",cr."clientId",cr."clientName",ARRAY(SELECT cc2."client_id" FROM "case_clients" cc2 WHERE cc2."case_id"=cr."id") AS "linkedClientIds" FROM "case_records" cr LEFT JOIN "case_clients" cc ON cc."case_id"=cr."id" WHERE (cr."clientId"=ANY($1::text[]) OR cc."client_id"=ANY($1::text[])) AND ($2::text[] IS NULL OR COALESCE(cr."branch_id",\'branch_main\')=ANY($2::text[])) ORDER BY cr."name"',
    clientIds, branchIds,
  );
  const caseIds = cases.map((item) => item.id);
  const [events, tasks, files, appointments, clientEvents] = await Promise.all([
    caseIds.length ? prisma.$queryRawUnsafe<EventRow[]>(
      'SELECT "id","caseId","description","type","authorName","createdAt" FROM "case_events" WHERE "caseId"=ANY($1::text[]) ORDER BY "createdAt" ASC LIMIT 15000',
      caseIds,
    ) : [],
    caseIds.length ? prisma.$queryRawUnsafe<TaskRow[]>(
      'SELECT t."id",t."caseId",t."description",t."notes",t."scheduledDate",t."scheduledTime",t."status",t."createdAt",l."name" AS "locationName",ly."fullName" AS "lawyerName" FROM "tasks" t LEFT JOIN "locations" l ON l."id"=t."locationId" LEFT JOIN "task_assignments" ta ON ta."taskId"=t."id" LEFT JOIN "lawyers" ly ON ly."id"=ta."lawyerId" WHERE t."caseId"=ANY($1::text[]) ORDER BY t."createdAt" ASC LIMIT 15000',
      caseIds,
    ) : [],
    prisma.$queryRawUnsafe<FileRow[]>(
      'SELECT "id","client_id","name","kind","size_bytes","created_at" FROM "client_files" WHERE "client_id"=ANY($1::text[]) AND "deleted_at" IS NULL ORDER BY "created_at" ASC LIMIT 15000',
      clientIds,
    ),
    prisma.$queryRawUnsafe<AppointmentRow[]>(
      'SELECT "id","client_id","appointment_date","appointment_time","appointment_type","status" FROM "client_appointments" WHERE "client_id"=ANY($1::text[]) ORDER BY "appointment_date" ASC NULLS LAST LIMIT 15000',
      clientIds,
    ),
    prisma.$queryRawUnsafe<ClientEventRow[]>(
      'SELECT "id","client_id","description","type","author_name","created_at" FROM "client_events" WHERE "client_id"=ANY($1::text[]) ORDER BY "created_at" ASC LIMIT 15000',
      clientIds,
    ),
  ]);

  const clientById = new Map(clients.map((client) => [client.id, client]));
  const caseById = new Map(cases.map((item) => [item.id, item]));
  const eventsByCase = new Map<string, EventRow[]>();
  for (const event of events) eventsByCase.set(event.caseId, [...(eventsByCase.get(event.caseId) ?? []), event]);
  const tasksByCase = new Map<string, TaskRow[]>();
  for (const task of tasks) if (task.caseId) tasksByCase.set(task.caseId, [...(tasksByCase.get(task.caseId) ?? []), task]);

  const headers = [
    'اسم العميل', 'الهاتف', 'البريد الإلكتروني', 'الرقم القومي', 'العنوان', 'ملاحظات العميل',
    'اسم القضية', 'رقم القضية', 'نوع السجل', 'المستجد / التفاصيل', 'تاريخ السجل',
    'الحالة / النوع', 'المحكمة أو الجهة', 'المحامي المسؤول', 'اسم المستند', 'حجم المستند (بايت)',
  ];
  const rows: unknown[][] = [];
  const addRow = (client: ClientRow, fields: Record<string, unknown> = {}) => rows.push([
    client.name, client.phone, client.email, client.nationalId, client.address, client.notes,
    fields.caseName ?? '', fields.caseNumber ?? '', fields.recordType ?? 'بيانات العميل',
    fields.details ?? '', fields.date ?? '', fields.status ?? '', fields.location ?? '',
    fields.lawyer ?? '', fields.fileName ?? '', fields.fileSize ?? '',
  ]);

  for (const client of clients) {
    let recordCount = 0;
    const clientCases = cases.filter((item) => item.clientId === client.id || (item.linkedClientIds ?? []).includes(client.id));
    for (const item of clientCases) {
      addRow(client, { caseName: item.name, caseNumber: item.number, recordType: 'القضية', details: item.description ?? '', status: 'ملف القضية' });
      recordCount++;
      for (const event of eventsByCase.get(item.id) ?? []) {
        addRow(client, { caseName: item.name, caseNumber: item.number, recordType: 'مستجد القضية', details: event.description, date: dateText(event.createdAt), status: event.type, lawyer: event.authorName ?? '' });
        recordCount++;
      }
      for (const task of tasksByCase.get(item.id) ?? []) {
        addRow(client, { caseName: item.name, caseNumber: item.number, recordType: 'جلسة / مهمة', details: [task.description, task.notes].filter(Boolean).join(' — '), date: dateText(task.scheduledDate), status: task.status, location: task.locationName ?? '', lawyer: task.lawyerName ?? '' });
        recordCount++;
      }
    }
    for (const appointment of appointments.filter((item) => item.client_id === client.id)) {
      addRow(client, { recordType: 'موعد العميل', details: appointment.appointment_type, date: dateText(appointment.appointment_date) + (appointment.appointment_time ? ' ' + appointment.appointment_time : ''), status: appointment.status });
      recordCount++;
    }
    for (const event of clientEvents.filter((item) => item.client_id === client.id)) {
      addRow(client, { recordType: 'مستجد العميل', details: event.description, date: dateText(event.created_at), status: event.type, lawyer: event.author_name ?? '' });
      recordCount++;
    }
    for (const file of files.filter((item) => item.client_id === client.id)) {
      addRow(client, { recordType: 'مستند العميل', details: file.kind, date: dateText(file.created_at), fileName: file.name, fileSize: file.size_bytes ?? '' });
      recordCount++;
    }
    if (!recordCount) addRow(client);
  }

  const workbook = createXlsx(headers, rows, requestedId ? 'Client' : 'All Clients');
  const filename = requestedId ? 'client-' + requestedId + '.xlsx' : 'loutfi-clients.xlsx';
  return new NextResponse(workbook, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="' + filename + '"',
      'Cache-Control': 'private, no-store',
    },
  });
});
