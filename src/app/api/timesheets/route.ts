import { randomUUID } from "node:crypto";
import { z } from "zod";
import { handle, json, readJson, user } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getBranchScope } from "@/lib/branch-access";
import { isFinanceManagement, isSeniorManagement } from "@/lib/office-workflow";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minutes: z.number().int().min(1).max(1440),
  description: z.string().trim().min(3).max(500),
  billable: z.boolean().default(false),
  caseId: z.string().max(128).nullable().optional(),
  submit: z.boolean().optional(),
});
const patchSchema = z.object({
  id: z.string().min(1).max(128),
  action: z.enum(["save", "submit", "approve", "reject"]),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  minutes: z.number().int().min(1).max(1440).optional(),
  description: z.string().trim().min(3).max(500).optional(),
  billable: z.boolean().optional(),
  caseId: z.string().max(128).nullable().optional(),
  reviewNote: z.string().trim().max(1000).optional(),
});

type DbEntry = {
  id: string;
  user_id: string | null;
  lawyer_id: string | null;
  case_id: string | null;
  branch_id: string | null;
  status: string;
};

function validDateOnly(value: string) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3) return false;
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return date.getUTCFullYear() === parts[0]
    && date.getUTCMonth() === parts[1] - 1
    && date.getUTCDate() === parts[2];
}

function isOwner(entry: DbEntry, session: NonNullable<Awaited<ReturnType<typeof user>>>) {
  return session.role === "admin"
    ? entry.user_id === session.userId
    : entry.lawyer_id === session.lawyerId;
}

async function resolveBranchId(
  session: NonNullable<Awaited<ReturnType<typeof user>>>,
  caseId: string | null,
) {
  const scope = await getBranchScope(session);
  let caseBranchId: string | null = null;

  if (caseId) {
    const cases = await prisma.$queryRawUnsafe<Array<{ branchId: string | null }>>(
      'SELECT "branch_id" AS "branchId" FROM "case_records" WHERE "id"=$1 LIMIT 1',
      caseId,
    );
    if (!cases.length) return { error: "القضية المحددة غير موجودة" as const };
    caseBranchId = cases[0].branchId || "branch_main";
  }

  if (!scope.allBranches && scope.branchIds.length && caseBranchId
    && !scope.branchIds.includes(caseBranchId)) {
    return { error: "لا تملك صلاحية تسجيل ساعات على قضية من هذا الفرع" as const };
  }

  let memberBranchIds: string[] = [];
  if (session.role === "lawyer") {
    const rows = await prisma.$queryRawUnsafe<Array<{ branchId: string }>>(
      'SELECT "branch_id" AS "branchId" FROM "office_branch_lawyers" WHERE "lawyer_id"=$1',
      session.lawyerId,
    ).catch(() => []);
    memberBranchIds = rows.map((row) => row.branchId);
    if (caseBranchId && memberBranchIds.length
      && !memberBranchIds.includes(caseBranchId)
      && !scope.allBranches
      && !scope.officeManagerBranchIds.includes(caseBranchId)
      && !scope.financeManagerBranchIds.includes(caseBranchId)) {
      return { error: "القضية خارج نطاق الفروع المسندة إلى حسابك" as const };
    }
  }

  return {
    branchId: caseBranchId
      || scope.officeManagerBranchIds[0]
      || scope.financeManagerBranchIds[0]
      || memberBranchIds[0]
      || "branch_main",
  };
}

export const GET = handle(async (request: Request) => {
  const session = await user();
  if (!session) return json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const scope = await getBranchScope(session);
  const senior = await isSeniorManagement(session);
  const finance = senior || await isFinanceManagement(session);
  const teamView = new URL(request.url).searchParams.get("scope") === "team" && finance;
  const branchIds = !senior && teamView ? scope.branchIds : [];

  const rows = await prisma.$queryRawUnsafe<Array<Record<string, any>>>(
    'SELECT e."id", e."user_id", e."lawyer_id", e."case_id", e."branch_id", ' +
    'e."status", e."work_date"::text AS "workDate", e."minutes", e."description", ' +
    'e."billable", e."submitted_at" AS "submittedAt", e."reviewed_at" AS "reviewedAt", ' +
    'e."review_note" AS "reviewNote", e."created_at" AS "createdAt", ' +
    'COALESCE(u."name", l."fullName") AS "ownerName", c."name" AS "caseName", c."number" AS "caseNumber" ' +
    'FROM "timesheet_entries" e ' +
    'LEFT JOIN "users" u ON u."id"=e."user_id" ' +
    'LEFT JOIN "lawyers" l ON l."id"=e."lawyer_id" ' +
    'LEFT JOIN "case_records" c ON c."id"=e."case_id" ' +
    'WHERE (($1::boolean=true) OR (e."user_id"=$2 AND $2 IS NOT NULL) OR (e."lawyer_id"=$3 AND $3 IS NOT NULL)) ' +
    'AND ($4::boolean=false OR e."branch_id"=ANY($5::text[])) ' +
    'ORDER BY e."work_date" DESC, e."created_at" DESC LIMIT 250',
    teamView,
    session.role === "admin" ? session.userId : null,
    session.role === "lawyer" ? session.lawyerId : null,
    branchIds.length > 0,
    branchIds,
  );

  const entries = rows.map((entry) => ({
    id: entry.id,
    workDate: entry.workDate,
    minutes: Number(entry.minutes),
    description: entry.description,
    billable: Boolean(entry.billable),
    status: entry.status,
    submittedAt: entry.submittedAt,
    reviewedAt: entry.reviewedAt,
    reviewNote: entry.reviewNote,
    createdAt: entry.createdAt,
    ownerName: entry.ownerName,
    caseId: entry.case_id,
    caseName: entry.caseName,
    caseNumber: entry.caseNumber,
    branchId: entry.branch_id,
    isMine: session.role === "admin"
      ? entry.user_id === session.userId
      : entry.lawyer_id === session.lawyerId,
  }));

  return json(
    { entries, scope: teamView ? "team" : "self", canReview: finance },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});

export const POST = handle(async (request: Request) => {
  const session = await user();
  if (!session) return json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const data = await readJson(request, createSchema);
  if (!validDateOnly(data.workDate)) {
    return json({ error: "تاريخ العمل غير صحيح" }, { status: 400 });
  }

  const caseId = data.caseId || null;
  const resolved = await resolveBranchId(session, caseId);
  if ("error" in resolved) return json({ error: resolved.error }, { status: 400 });

  const id = "ts_" + randomUUID().replaceAll("-", "");
  const userId = session.role === "admin" ? session.userId : null;
  const lawyerId = session.role === "lawyer" ? session.lawyerId : null;
  const status = data.submit ? "SUBMITTED" : "DRAFT";

  await prisma.$executeRawUnsafe(
    'INSERT INTO "timesheet_entries" ' +
    '("id","user_id","lawyer_id","case_id","branch_id","work_date","minutes","description","billable","status","submitted_at") ' +
    'VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8,$9,$10,$11)',
    id, userId, lawyerId, caseId, resolved.branchId, data.workDate,
    data.minutes, data.description, data.billable, status,
    data.submit ? new Date() : null,
  );

  return json({ ok: true, id, status }, { status: 201 });
});

export const PATCH = handle(async (request: Request) => {
  const session = await user();
  if (!session) return json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const data = await readJson(request, patchSchema);
  if (data.action === "reject" && !data.reviewNote?.trim()) {
    return json({ error: "اكتب سبب إرجاع السجل للتعديل" }, { status: 400 });
  }

  const found = await prisma.$queryRawUnsafe<DbEntry[]>(
    'SELECT "id","user_id","lawyer_id","case_id","branch_id","status" ' +
    'FROM "timesheet_entries" WHERE "id"=$1 LIMIT 1',
    data.id,
  );
  const entry = found[0];
  if (!entry) return json({ error: "سجل الساعات غير موجود" }, { status: 404 });

  if (data.action === "approve" || data.action === "reject") {
    const senior = await isSeniorManagement(session);
    const finance = senior || await isFinanceManagement(session);
    if (!finance) {
      return json({ error: "اعتماد الساعات متاح للإدارة المالية والإدارة العليا فقط" }, { status: 403 });
    }
    if (isOwner(entry, session)) {
      return json({ error: "لا يمكنك اعتماد سجل ساعاتك بنفسك" }, { status: 403 });
    }
    if (entry.status !== "SUBMITTED") {
      return json({ error: "هذا السجل ليس في انتظار المراجعة" }, { status: 409 });
    }

    const scope = await getBranchScope(session);
    if (!senior && scope.branchIds.length
      && (!entry.branch_id || !scope.branchIds.includes(entry.branch_id))) {
      return json({ error: "السجل خارج نطاق الفروع المصرح بها" }, { status: 403 });
    }

    const reviewerUserId = session.role === "admin" ? session.userId : null;
    const reviewerLawyerId = session.role === "lawyer" ? session.lawyerId : null;
    const changed = await prisma.$executeRawUnsafe(
      'UPDATE "timesheet_entries" SET "status"=$2,"reviewed_by_user_id"=$3,' +
      '"reviewed_by_lawyer_id"=$4,"reviewed_at"=NOW(),"review_note"=$5,"updated_at"=NOW() ' +
      'WHERE "id"=$1 AND "status"=$6',
      data.id, data.action === "approve" ? "APPROVED" : "REJECTED",
      reviewerUserId, reviewerLawyerId, data.reviewNote || null, "SUBMITTED",
    );
    if (!changed) return json({ error: "تمت مراجعة السجل بالفعل" }, { status: 409 });
    return json({ ok: true });
  }

  if (!isOwner(entry, session)) {
    return json({ error: "لا يمكنك تعديل سجل يخص مستخدمًا آخر" }, { status: 403 });
  }
  if (!["DRAFT", "REJECTED"].includes(entry.status)) {
    return json({ error: "لا يمكن تعديل سجل تم إرساله أو اعتماده" }, { status: 409 });
  }

  if (data.action === "submit") {
    const changed = await prisma.$executeRawUnsafe(
      'UPDATE "timesheet_entries" SET "status"=$2,"submitted_at"=NOW(),"review_note"=NULL,' +
      '"reviewed_at"=NULL,"reviewed_by_user_id"=NULL,"reviewed_by_lawyer_id"=NULL,"updated_at"=NOW() ' +
      'WHERE "id"=$1 AND "status" IN ($3,$4)',
      data.id, "SUBMITTED", "DRAFT", "REJECTED",
    );
    if (!changed) return json({ error: "تعذر إرسال السجل، ربما تغيرت حالته" }, { status: 409 });
    return json({ ok: true });
  }

  if (!data.workDate || !validDateOnly(data.workDate)
    || !data.minutes || !data.description || data.billable === undefined) {
    return json({ error: "أكمل تاريخ العمل والمدة ووصف النشاط قبل الحفظ" }, { status: 400 });
  }

  const caseId = Object.prototype.hasOwnProperty.call(data, "caseId")
    ? (data.caseId || null)
    : entry.case_id;
  const resolved = await resolveBranchId(session, caseId);
  if ("error" in resolved) return json({ error: resolved.error }, { status: 400 });

  const changed = await prisma.$executeRawUnsafe(
    'UPDATE "timesheet_entries" SET "case_id"=$2,"branch_id"=$3,"work_date"=$4::date,' +
    '"minutes"=$5,"description"=$6,"billable"=$7,"status"=$8,"submitted_at"=NULL,' +
    '"review_note"=NULL,"reviewed_at"=NULL,"reviewed_by_user_id"=NULL,' +
    '"reviewed_by_lawyer_id"=NULL,"updated_at"=NOW() WHERE "id"=$1 AND "status" IN ($9,$10)',
    data.id, caseId, resolved.branchId, data.workDate, data.minutes, data.description,
    data.billable, "DRAFT", "DRAFT", "REJECTED",
  );
  if (!changed) return json({ error: "تعذر حفظ السجل، ربما تغيرت حالته" }, { status: 409 });
  return json({ ok: true });
});
