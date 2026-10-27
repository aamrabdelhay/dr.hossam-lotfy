import crypto from 'node:crypto';
import { handle, json, requirePermission } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { getBranchScope } from '@/lib/branch-access';
import { prisma } from '@/lib/prisma';
import { parseSpreadsheet } from '@/lib/xlsx';

type ImportRow = {
  name: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  address?: string;
  notes?: string;
  caseName?: string;
  caseNumber?: string;
  caseDescription?: string;
  updates?: string;
  updateDate?: string;
  updateType?: string;
};

function normalizeHeader(value: string): string {
  return value.toLocaleLowerCase('ar-EG')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[\s_\-./]+/g, '');
}

const HEADER_ALIASES: Record<keyof ImportRow, string[]> = {
  name: ['اسم العميل', 'اسم', 'الاسم', 'client name', 'client', 'customer', 'name'],
  phone: ['رقم الهاتف', 'الهاتف', 'تليفون', 'موبايل', 'phone', 'mobile', 'telephone'],
  email: ['البريد الالكتروني', 'البريد', 'email', 'e-mail'],
  nationalId: ['الرقم القومي', 'رقم قومي', 'national id', 'nationalid', 'id number'],
  address: ['العنوان', 'عنوان العميل', 'address'],
  notes: ['ملاحظات', 'بيانات اضافية', 'notes', 'client notes'],
  caseName: ['اسم القضية', 'القضية', 'case name', 'casename', 'case'],
  caseNumber: ['رقم القضية', 'رقم الملف', 'case number', 'casenumber', 'file number'],
  caseDescription: ['موضوع القضية', 'وصف القضية', 'case description', 'subject'],
  updates: ['المستجدات', 'اخر المستجدات', 'التحديثات', 'اخر تحديث', 'مستجدات القضية', 'updates', 'progress', 'events', 'latest updates'],
  updateDate: ['تاريخ المستجد', 'تاريخ التحديث', 'تاريخ المستجدات', 'update date', 'event date', 'date'],
  updateType: ['نوع المستجد', 'نوع التحديث', 'update type', 'event type'],
};

const normalizedAliases = Object.fromEntries(
  Object.entries(HEADER_ALIASES).map(([key, values]) => [key, new Set(values.map(normalizeHeader))]),
) as Record<keyof ImportRow, Set<string>>;

function cellValue(row: string[], headers: string[], key: keyof ImportRow): string {
  const index = headers.findIndex((header) => normalizedAliases[key].has(normalizeHeader(header)));
  return index < 0 ? '' : String(row[index] ?? '').trim();
}

function parseEventDate(value: string): Date | null {
  if (!value) return null;
  if (/^\d{1,6}(?:\.\d+)?$/.test(value)) {
    const serial = Number(value);
    if (serial >= 1 && serial <= 100000) return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  }
  const parts = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (parts) {
    const day = Number(parts[1]);
    const month = Number(parts[2]) - 1;
    const year = Number(parts[3]);
    const date = new Date(year, month, day, 12);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function rowToImport(row: string[], headers: string[]): ImportRow {
  return {
    name: cellValue(row, headers, 'name'),
    phone: cellValue(row, headers, 'phone'),
    email: cellValue(row, headers, 'email'),
    nationalId: cellValue(row, headers, 'nationalId'),
    address: cellValue(row, headers, 'address'),
    notes: cellValue(row, headers, 'notes'),
    caseName: cellValue(row, headers, 'caseName'),
    caseNumber: cellValue(row, headers, 'caseNumber'),
    caseDescription: cellValue(row, headers, 'caseDescription'),
    updates: cellValue(row, headers, 'updates'),
    updateDate: cellValue(row, headers, 'updateDate'),
    updateType: cellValue(row, headers, 'updateType'),
  };
}

export const POST = handle(async (request: Request) => {
  await requirePermission('viewAdmin');
  const session = await getCurrentUser();
  if (!session) return json({ error: 'يجب تسجيل الدخول أولاً.' }, { status: 401 });

  const form = await request.formData();
  const uploaded = form.get('file');
  if (!(uploaded instanceof File)) return json({ error: 'لم يتم إرفاق ملف Excel.' }, { status: 400 });
  if (uploaded.size <= 0 || uploaded.size > 10 * 1024 * 1024) return json({ error: 'حجم الملف يجب أن يكون بين 1 بايت و10 ميجابايت.' }, { status: 413 });
  const filename = uploaded.name || 'clients.xlsx';
  if (!/\.(xlsx|csv)$/i.test(filename)) return json({ error: 'الصيغ المدعومة هي XLSX أو CSV فقط.' }, { status: 415 });

  let grid: string[][];
  try {
    grid = parseSpreadsheet(Buffer.from(await uploaded.arrayBuffer()), filename);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'تعذر قراءة ملف Excel.' }, { status: 400 });
  }
  if (grid.length < 2) return json({ error: 'الملف لا يحتوي على صفوف بيانات بعد صف العناوين.' }, { status: 400 });
  const headers = grid[0].map((cell) => String(cell ?? '').trim());
  if (!headers.some((header) => normalizedAliases.name.has(normalizeHeader(header)))) {
    return json({ error: 'يجب أن يحتوي صف العناوين على عمود باسم «اسم العميل» أو «Name».' }, { status: 400 });
  }

  const scope = await getBranchScope(session);
  const allowedBranchIds = scope.officeManagerBranchIds;
  if (!scope.allBranches && !scope.officeManager) {
    return json({ error: 'استيراد بيانات العملاء متاح للإدارة العليا ومدير المكتب فقط.' }, { status: 403 });
  }
  if (!scope.allBranches && allowedBranchIds.length > 1) {
    return json({ error: 'هذا الحساب يدير أكثر من فرع؛ افتح صفحة الفرع المطلوب قبل استيراد البيانات.' }, { status: 403 });
  }
  if (!scope.allBranches && allowedBranchIds.length === 0) {
    return json({ error: 'لا يوجد فرع مسموح لهذا الحساب لاستيراد البيانات.' }, { status: 403 });
  }
  const branchId = scope.allBranches ? 'branch_main' : allowedBranchIds[0];
  const branchConstraint = scope.allBranches ? null : branchId;
  const rows = grid.slice(1).slice(0, 5000);
  let created = 0;
  let updated = 0;
  let casesCreated = 0;
  let eventsImported = 0;
  let rowsSkipped = Math.max(0, grid.length - 1 - rows.length);
  const issues: string[] = [];

  for (let index = 0; index < rows.length; index++) {
    const input = rowToImport(rows[index], headers);
    if (!input.name) { rowsSkipped++; continue; }
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const nationalId = input.nationalId || null;
        const phone = input.phone || null;
        const match = await tx.$queryRawUnsafe<Array<{
          id: string; name: string; phone: string | null; email: string | null; nationalId: string | null;
          address: string | null; notes: string | null; branch_id: string | null;
        }>>(
          'SELECT "id","name","phone","email","nationalId","address","notes","branch_id" FROM "clients" WHERE (($1::text IS NOT NULL AND "nationalId"=$1) OR ($2::text IS NOT NULL AND "phone"=$2) OR (($1::text IS NULL AND $2::text IS NULL) AND lower(trim("name"))=lower(trim($3)))) AND ($4::text IS NULL OR COALESCE("branch_id",\'branch_main\')=$4) ORDER BY CASE WHEN $1::text IS NOT NULL AND "nationalId"=$1 THEN 0 WHEN $2::text IS NOT NULL AND "phone"=$2 THEN 1 ELSE 2 END LIMIT 1',
          nationalId, phone, input.name, branchConstraint,
        );
        let clientId: string;
        let wasCreated = false;
        if (match[0]) {
          clientId = match[0].id;
          await tx.$executeRawUnsafe(
            'UPDATE "clients" SET "name"=COALESCE(NULLIF($2, \'\'),"name"),"phone"=COALESCE(NULLIF($3, \'\'),"phone"),"email"=COALESCE(NULLIF($4, \'\'),"email"),"nationalId"=COALESCE(NULLIF($5, \'\'),"nationalId"),"address"=COALESCE(NULLIF($6, \'\'),"address"),"notes"=COALESCE(NULLIF($7, \'\'),"notes") WHERE "id"=$1',
            clientId, input.name, input.phone || '', input.email || '', input.nationalId || '', input.address || '', input.notes || '',
          );
        } else {
          wasCreated = true;
          clientId = 'cl_' + crypto.randomUUID().replace(/-/g, '');
          await tx.$executeRawUnsafe(
            'INSERT INTO "clients" ("id","name","phone","email","nationalId","address","notes","branch_id") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
            clientId, input.name, input.phone || null, input.email || null, nationalId, input.address || null, input.notes || null, branchId,
          );
        }

        let caseId: string | null = null;
        let wasCaseCreated = false;
        if (input.caseNumber) {
          const existingCases = await tx.$queryRawUnsafe<Array<{ id: string }>>(
            'SELECT "id" FROM "case_records" WHERE "number"=$1 AND ($2::text IS NULL OR COALESCE("branch_id",\'branch_main\')=$2) ORDER BY "id" DESC LIMIT 1',
            input.caseNumber, branchConstraint,
          );
          if (existingCases[0]) {
            caseId = existingCases[0].id;
            await tx.$executeRawUnsafe(
              'UPDATE "case_records" SET "clientId"=$1, "clientName"=$2, "name"=COALESCE(NULLIF($3, \'\'),"name"), "description"=COALESCE(NULLIF($4, \'\'),"description") WHERE "id"=$5',
              clientId, input.name, input.caseName || '', input.caseDescription || '', caseId,
            );
          } else {
            const caseRecord = await tx.caseRecord.create({
              data: {
                name: input.caseName || ('قضية ' + input.caseNumber),
                number: input.caseNumber,
                clientName: input.name,
                description: input.caseDescription || null,
              },
              select: { id: true },
            });
            caseId = caseRecord.id;
            wasCaseCreated = true;
            await tx.$executeRawUnsafe('UPDATE "case_records" SET "clientId"=$1, "branch_id"=$2 WHERE "id"=$3', clientId, branchId, caseId);
          }
          await tx.$executeRawUnsafe(
            'INSERT INTO "case_clients" ("id","case_id","client_id") VALUES ($1,$2,$3) ON CONFLICT ("case_id","client_id") DO NOTHING',
            'cc_' + crypto.randomUUID().replace(/-/g, ''), caseId, clientId,
          );
        }

        let importedCount = 0;
        const updateLines = (input.updates || '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean).slice(0, 100);
        if (caseId && updateLines.length) {
          const createdAt = parseEventDate(input.updateDate || '') || new Date();
          for (const description of updateLines) {
            const duplicate = await tx.$queryRawUnsafe<Array<{ id: string }>>(
              'SELECT "id" FROM "case_events" WHERE "caseId"=$1 AND "description"=$2 AND ("type"=\'import\' OR "authorName"=\'استيراد Excel\') LIMIT 1',
              caseId, description,
            );
            if (duplicate.length) continue;
            await tx.$executeRawUnsafe(
              'INSERT INTO "case_events" ("id","caseId","description","type","authorName","createdAt") VALUES ($1,$2,$3,$4,$5,$6)',
              'evt_' + crypto.randomUUID().replace(/-/g, ''), caseId, description, input.updateType || 'import', 'استيراد Excel', createdAt,
            );
            importedCount++;
          }
        } else if (updateLines.length) {
          const createdAt = parseEventDate(input.updateDate || '') || new Date();
          for (const description of updateLines) {
            const duplicate = await tx.$queryRawUnsafe<Array<{ id: string }>>(
              'SELECT "id" FROM "client_events" WHERE "client_id"=$1 AND "description"=$2 AND ("type"=\\'import\\' OR "author_name"=\\'استيراد Excel\\') LIMIT 1',
              clientId, description,
            );
            if (duplicate.length) continue;
            await tx.$executeRawUnsafe(
              'INSERT INTO "client_events" ("id","client_id","description","type","author_name","created_at") VALUES ($1,$2,$3,$4,$5,$6)',
              'cev_' + crypto.randomUUID().replace(/-/g, ''), clientId, description, input.updateType || 'import', 'استيراد Excel', createdAt,
            );
            importedCount++;
          }
        }
        return { created: wasCreated, caseCreated: wasCaseCreated, eventsImported: importedCount };
      });
      if (outcome.created) created++; else updated++;
      if (outcome.caseCreated) casesCreated++;
      eventsImported += outcome.eventsImported;
    } catch (error) {
      rowsSkipped++;
      if (issues.length < 5) issues.push('الصف ' + (index + 2) + ': ' + (error instanceof Error ? error.message : 'خطأ غير معروف'));
    }
  }

  return json({
    ok: true,
    created,
    updated,
    casesCreated,
    eventsImported,
    rowsSkipped,
    message: 'اكتمل الاستيراد. تمت مطابقة العملاء وتحديث بياناتهم أو إدراج العملاء الجدد.',
    ...(issues.length ? { issues } : {}),
  });
});
