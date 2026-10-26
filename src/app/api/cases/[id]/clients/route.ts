import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, user } from '@/lib/api';
import { can } from '@/lib/rbac';
import { getBranchScope } from '@/lib/branch-access';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
  const { id } = await ctx.params;
  const cases = await prisma.$queryRawUnsafe<Array<{ id: string; clientId: string | null; branch_id: string | null }>>(
    'SELECT "id","clientId","branch_id" FROM "case_records" WHERE "id"=$1 LIMIT 1', id
  );
  const caseRow = cases[0];
  if (!caseRow) return json({ error: 'القضية غير موجودة' }, { status: 404 });
  const linked = await prisma.$queryRawUnsafe<Array<{ id: string; name: string; phone: string | null; email: string | null }>>(
    'SELECT DISTINCT c."id",c."name",c."phone",c."email" FROM "clients" c LEFT JOIN "case_clients" cc ON cc."client_id"=c."id" AND cc."case_id"=$1 WHERE c."id"=$2 OR cc."client_id" IS NOT NULL ORDER BY c."name"',
    id, caseRow.clientId || ''
  );
  const linkedIds = new Set(linked.map((client) => client.id));
  if (caseRow.clientId && !linkedIds.has(caseRow.clientId)) {
    const primary = await prisma.$queryRawUnsafe<Array<{id:string;name:string;phone:string|null;email:string|null}>>('SELECT "id","name","phone","email" FROM "clients" WHERE "id"=$1',caseRow.clientId);
    linked.push(...primary.filter((client) => !linkedIds.has(client.id)));
  }
  const scope = await getBranchScope(session);
  const canEdit = session.role === 'admin' && can(session.userRole, 'writeTasks') &&
    (scope.allBranches || !scope.officeManager || scope.officeManagerBranchIds.includes(caseRow.branch_id || 'branch_main'));
  let options: Array<{id:string;name:string;phone:string|null;email:string|null}> = [];
  if (canEdit) {
    options = await prisma.$queryRawUnsafe<Array<{id:string;name:string;phone:string|null;email:string|null}>>(
      'SELECT "id","name","phone","email" FROM "clients" WHERE COALESCE("status",\'MAIN\') NOT IN (\'DELETED\',\'REJECTED\') AND ($1::boolean OR COALESCE("branch_id",\'branch_main\')=ANY($2::text[])) ORDER BY lower("name") LIMIT 500',
      scope.allBranches, scope.allBranches ? [] : scope.branchIds
    );
  }
  return json({ clients: linked, options, canEdit });
});

const schema = z.object({ clientIds: z.array(z.string().trim().min(1)).max(100) });

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
  if (session.role !== 'admin' || !can(session.userRole, 'writeTasks')) {
    return json({ error: 'لا تملك صلاحية تعديل العملاء المرتبطين بالقضية' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const data = await readJson(req as never, schema);
  const cases = await prisma.$queryRawUnsafe<Array<{ id: string; branch_id: string | null }>>('SELECT "id","branch_id" FROM "case_records" WHERE "id"=$1 LIMIT 1', id);
  const caseRow = cases[0];
  if (!caseRow) return json({ error: 'القضية غير موجودة' }, { status: 404 });
  const scope = await getBranchScope(session);
  if (!scope.allBranches && scope.officeManager && !scope.officeManagerBranchIds.includes(caseRow.branch_id || 'branch_main')) {
    return json({ error: 'ليس لديك صلاحية تعديل قضية في هذا الفرع' }, { status: 403 });
  }
  const ids = [...new Set(data.clientIds)];
  const valid = ids.length ? await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
    'SELECT "id","name" FROM "clients" WHERE "id"=ANY($1::text[]) AND COALESCE("status",\'MAIN\') NOT IN (\'DELETED\',\'REJECTED\')',
    ids
  ) : [];
  if (valid.length !== ids.length) return json({ error: 'أحد العملاء المحددين غير موجود أو مؤرشف' }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('DELETE FROM "case_clients" WHERE "case_id"=$1', id);
    for (const clientId of ids) {
      await tx.$executeRawUnsafe('INSERT INTO "case_clients" ("id","case_id","client_id") VALUES ($1,$2,$3) ON CONFLICT ("case_id","client_id") DO NOTHING', 'cc_' + crypto.randomUUID().replaceAll('-', ''), id, clientId);
    }
    const primary = valid[0];
    await tx.$executeRawUnsafe('UPDATE "case_records" SET "clientId"=$1,"clientName"=$2 WHERE "id"=$3', primary?.id || null, primary?.name || null, id);
  });
  return json({ ok: true, clients: valid });
});
