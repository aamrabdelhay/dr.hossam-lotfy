import 'server-only';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { getBranchScope, branchForWrite, getAllBranches } from '@/lib/branch-access';
import { isSeniorManagement, createOfficeRequest, notifySenior } from '@/lib/office-workflow';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ يجب أن يكون YYYY-MM-DD');
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'الوقت يجب أن يكون HH:MM');

export const OFFICE_MCP_TOOLS = [\n  {
    name: 'get_profile',
    title: 'بيانات الحساب الحالي',
    description: 'يعرض هوية الحساب الذي تمت مصادقته على اتصال مساعد مكتب لوتفي.',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        role: { type: 'string' },
      },
      required: ['id', 'name', 'role'],
    },
    securitySchemes: [{ type: 'oauth2', scopes: ['office:read'] }],
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { 'openai/profile': true },
  },

  {
    name: 'get_upcoming_sessions',
    title: 'عرض الجلسات القادمة',
    description: 'يعرض جلسات المكتب القادمة ضمن الفروع التي يملك المستخدم صلاحية الوصول إليها.',
    inputSchema: {
      type: 'object',
      properties: {
        branchId: { type: 'string', description: 'معرّف الفرع، اختياري إذا كان المستخدم يرى أكثر من فرع.' },
        from: { type: 'string', description: 'تاريخ البداية YYYY-MM-DD، افتراضيًا اليوم.' },
        to: { type: 'string', description: 'تاريخ النهاية YYYY-MM-DD، افتراضيًا بعد 30 يومًا.' },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'search_cases',
    title: 'البحث في القضايا',
    description: 'يبحث في أسماء وأرقام القضايا والعملاء ضمن النطاق المسموح للمستخدم.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, description: 'اسم القضية أو رقمها أو اسم العميل.' },
        branchId: { type: 'string', description: 'معرّف الفرع، اختياري.' },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_tasks',
    title: 'عرض التكليفات',
    description: 'يعرض التكليفات المفتوحة والقادمة للمكتب.',
    inputSchema: {
      type: 'object',
      properties: {
        branchId: { type: 'string' },
        status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
        from: { type: 'string' },
        to: { type: 'string' },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_branches',
    title: 'عرض الفروع',
    description: 'يعرض الفروع التي يمكن للمستخدم الوصول إليها.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'create_task',
    title: 'إنشاء تكليف',
    description: 'ينشئ تكليفًا في نظام المكتب بعد التحقق من صلاحيات المستخدم.',
    inputSchema: {
      type: 'object',
      properties: {
        branchId: { type: 'string' },
        description: { type: 'string', minLength: 1, maxLength: 2000 },
        locationId: { type: 'string', description: 'معرّف المحكمة/المكان.' },
        scheduledDate: { type: 'string', description: 'YYYY-MM-DD' },
        scheduledTime: { type: 'string', description: 'HH:MM' },
        caseId: { type: 'string' },
        lawyerIds: { type: 'array', items: { type: 'string' }, maxItems: 20 },
        notes: { type: 'string', maxLength: 4000 },
      },
      required: ['description', 'locationId'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'create_session',
    title: 'إضافة جلسة',
    description: 'يضيف جلسة فعلية إلى جدول المكتب، مع التاريخ والوقت والمكان والمحامين والقضية إن وجدت.',
    inputSchema: {
      type: 'object',
      properties: {
        branchId: { type: 'string' },
        description: { type: 'string', minLength: 1, maxLength: 2000 },
        locationId: { type: 'string' },
        scheduledDate: { type: 'string', description: 'YYYY-MM-DD' },
        scheduledTime: { type: 'string', description: 'HH:MM' },
        caseId: { type: 'string' },
        lawyerIds: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
        notes: { type: 'string', maxLength: 4000 },
      },
      required: ['description', 'locationId', 'scheduledDate', 'scheduledTime', 'lawyerIds'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
] as const;

const listSchema = z.object({
  branchId: z.string().max(100).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

const searchSchema = z.object({
  query: z.string().trim().min(1).max(200),
  branchId: z.string().max(100).optional(),
});

const taskSchema = z.object({
  branchId: z.string().max(100).optional(),
  description: z.string().trim().min(1).max(2000),
  locationId: z.string().trim().min(1),
  scheduledDate: dateSchema.optional(),
  scheduledTime: timeSchema.optional(),
  caseId: z.string().trim().optional(),
  lawyerIds: z.array(z.string().trim().min(1)).max(20).optional(),
  notes: z.string().max(4000).optional(),
});

const sessionSchema = taskSchema.extend({
  scheduledDate: dateSchema,
  scheduledTime: timeSchema,
  lawyerIds: z.array(z.string().trim().min(1)).min(1).max(20),
});

function cairoDate(days = 0) {
  const d = new Date(Date.now() + days * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

async function allowedBranchId(session: SessionUser, requested?: string) {
  const scope = await getBranchScope(session);
  if (requested) {
    if (!scope.allBranches && !scope.branchIds.includes(requested)) {
      throw new Error('لا تملك صلاحية الوصول إلى هذا الفرع');
    }
    return requested;
  }
  if (scope.allBranches) return null;
  if (scope.branchIds.length === 1) return scope.branchIds[0];
  return null;
}

function taskRow(row: any) {
  return {
    id: row.id,
    description: row.description,
    date: row.scheduledDate ? new Date(row.scheduledDate).toISOString().slice(0, 10) : null,
    time: row.scheduledTime ?? null,
    status: row.status,
    location: row.locationName ?? null,
    case: row.caseName ?? null,
    caseNumber: row.caseNumber ?? null,
    client: row.clientName ?? null,
    lawyers: row.lawyers ?? [],
    branchId: row.branchId ?? null,
  };
}

async function readTasks(session: SessionUser, args: unknown, sessionsOnly = false) {
  const data = listSchema.parse(args ?? {});
  const branchId = await allowedBranchId(session, data.branchId);
  const from = data.from ?? cairoDate(0);
  const to = data.to ?? cairoDate(30);
  const scope = await getBranchScope(session);

  const branchFilter = branchId
    ? 'COALESCE(t."branch_id", cr."branch_id", $1) = $1'
    : scope.allBranches
      ? 'TRUE'
      : 't."branch_id" = ANY($1::text[])';

  const branchParam = branchId ?? (scope.allBranches ? 'branch_main' : scope.branchIds);
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT t."id", t."description", t."scheduledDate", t."scheduledTime", t."status",
            t."branch_id" AS "branchId", l."name" AS "locationName",
            cr."name" AS "caseName", cr."number" AS "caseNumber", cr."clientName",
            COALESCE(json_agg(DISTINCT jsonb_build_object('id', lw."id", 'name', lw."fullName"))
              FILTER (WHERE lw."id" IS NOT NULL), '[]') AS "lawyers"
       FROM "tasks" t
       LEFT JOIN "locations" l ON l."id" = t."locationId"
       LEFT JOIN "case_records" cr ON cr."id" = t."caseId"
       LEFT JOIN "task_assignments" ta ON ta."taskId" = t."id"
       LEFT JOIN "lawyers" lw ON lw."id" = ta."lawyerId"
      WHERE ${branchFilter}
        AND t."scheduledDate" BETWEEN $2::date AND $3::date
        AND t."status" NOT IN ('CANCELLED')
        ${sessionsOnly ? 'AND t."scheduledDate" IS NOT NULL AND t."scheduledTime" IS NOT NULL' : ''}
      GROUP BY t."id", l."name", cr."name", cr."number", cr."clientName"
      ORDER BY t."scheduledDate" ASC, t."scheduledTime" ASC NULLS LAST
      LIMIT 100`,
    branchParam,
    from,
    to,
  );

  return rows.map(taskRow);
}

async function createOfficeTask(session: SessionUser, args: unknown, isSession: boolean) {
  const data = (isSession ? sessionSchema : taskSchema).parse(args ?? {});
  const branchId = await branchForWrite(session, data.branchId);
  if (!branchId) throw new Error('يجب تحديد الفرع قبل إنشاء التكليف عندما يملك الحساب أكثر من فرع');

  const scope = await getBranchScope(session);
  if (!scope.allBranches && !scope.branchIds.includes(branchId)) {
    throw new Error('لا تملك صلاحية إنشاء بيانات في هذا الفرع');
  }

  const authorization = await assertMcpUser(session);
  if (authorization.requiresApproval) {
    const requestId = await createOfficeRequest({
      type: isSession ? 'TASK_CREATE_SESSION' : 'TASK_CREATE',
      title: isSession ? 'طلب إضافة جلسة من مساعد المكتب' : 'طلب إضافة تكليف من مساعد المكتب',
      reason: data.description,
      payload: data,
      targetEntityType: 'task',
      session,
    });
    await notifySenior('طلب جديد من مساعد المكتب', data.description.slice(0, 100), '/admin/office').catch(() => undefined);
    return { requiresApproval: true, requestId, type: isSession ? 'session' : 'task', description: data.description };
  }

  const location = await prisma.location.findUnique({
    where: { id: data.locationId },
    select: { id: true, name: true },
  });
  if (!location) throw new Error('المكان المحدد غير موجود');

  if (data.caseId) {
    const caseRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "id" FROM "case_records" WHERE "id"=$1 AND (COALESCE("branch_id",'branch_main')=$2 OR $3=true) LIMIT 1`,
      data.caseId,
      branchId,
      scope.allBranches,
    );
    if (!caseRows.length) throw new Error('القضية غير موجودة أو خارج نطاق الفرع');
  }

  const lawyerIds = data.lawyerIds ?? [];
  if (lawyerIds.length) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT l."id"
         FROM "lawyers" l
         WHERE l."id" = ANY($1::text[]) AND l."active"=true
           AND (${scope.allBranches ? 'TRUE' : `EXISTS (SELECT 1 FROM "office_branch_lawyers" bl WHERE bl."lawyer_id"=l."id" AND bl."branch_id"=$2)`})`,
      lawyerIds,
      branchId,
    );
    if (rows.length !== lawyerIds.length) throw new Error('يوجد محامٍ غير نشط أو غير تابع للفرع المحدد');
  }

  const id = `task_${crypto.randomUUID().replaceAll('-', '')}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "tasks" ("id","locationId","caseId","description","notes","scheduledDate","scheduledTime","status","createdById","authorId","branch_id","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6::date,$7,'PENDING',$8,$9,$10,NOW(),NOW())`,
    id,
    data.locationId,
    data.caseId ?? null,
    isSession ? `جلسة: ${data.description}` : data.description,
    data.notes ?? null,
    data.scheduledDate ?? null,
    data.scheduledTime ?? null,
    session.role === 'admin' ? session.userId : null,
    session.role === 'lawyer' ? session.lawyerId : null,
    branchId,
  );

  for (const lawyerId of lawyerIds) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "task_assignments" ("id","taskId","lawyerId","createdAt")
       VALUES ($1,$2,$3,NOW()) ON CONFLICT ("taskId","lawyerId") DO NOTHING`,
      `assign_${crypto.randomUUID().replaceAll('-', '')}`,
      id,
      lawyerId,
    );
  }

  const branch = (await prisma.$queryRawUnsafe<Array<{ name_ar: string }>>(
    `SELECT "name_ar" FROM "office_branches" WHERE "id"=$1 LIMIT 1`,
    branchId,
  ))[0];

  return {
    id,
    type: isSession ? 'session' : 'task',
    description: data.description,
    date: data.scheduledDate ?? null,
    time: data.scheduledTime ?? null,
    location: location.name,
    caseId: data.caseId ?? null,
    lawyerIds,
    branch: branch?.name_ar ?? branchId,
  };
}

export async function callOfficeMcpTool(
  name: string,
  args: unknown,
  session: SessionUser,
) {
  switch (name) {\n    case 'get_profile':
      return {
        id: session.role === 'admin' ? `admin:${session.userId}` : `lawyer:${session.lawyerId}`,
        name: session.name,
        role: session.role === 'admin' ? session.userRole : 'LAWYER',
      };

    case 'get_upcoming_sessions':
      return { sessions: await readTasks(session, args, true) };
    case 'get_tasks':
      return { tasks: await readTasks(session, args, false) };
    case 'get_branches': {
      const scope = await getBranchScope(session);
      const branches = await getAllBranches();
      return {
        branches: scope.allBranches ? branches : branches.filter((b) => scope.branchIds.includes(b.id)),
      };
    }
    case 'search_cases': {
      const data = searchSchema.parse(args ?? {});
      const branchId = await allowedBranchId(session, data.branchId);
      const scope = await getBranchScope(session);
      const branchParam = branchId ?? (scope.allBranches ? null : scope.branchIds);
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id","name","number","clientName","branch_id" AS "branchId"
           FROM "case_records"
          WHERE "archived_at" IS NULL
            AND ("name" ILIKE $1 OR "number" ILIKE $1 OR COALESCE("clientName",'') ILIKE $1)
            AND (${branchId ? 'COALESCE("branch_id",\'branch_main\')=$2' : scope.allBranches ? 'TRUE' : '"branch_id" = ANY($2::text[])'})
          ORDER BY "id" DESC
          LIMIT 50`,
        `%${data.query}%`,
        branchParam,
      );
      return { cases: rows };
    }
    case 'create_task':
      return { created: await createOfficeTask(session, args, false) };
    case 'create_session':
      return { created: await createOfficeTask(session, args, true) };
    default:
      throw new Error(`أداة MCP غير معروفة: ${name}`);
  }
}

export function isWriteTool(name: string) {
  return name === 'create_task' || name === 'create_session';
}

export async function assertMcpUser(session: SessionUser | null) {
  if (!session) throw new Error('يجب تسجيل الدخول لاستخدام مساعد المكتب');
  if (session.role === 'lawyer' && !session.isAdmin && !(await isSeniorManagement(session))) {
    return { requiresApproval: true };
  }
  return { requiresApproval: false };
}
