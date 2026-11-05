import { z } from 'zod';
import { ApiError, handle, json, readJson, user } from '@/lib/api';
import { officeId, isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
const grantSchema = z.object({
  userId: z.string().min(1).optional(),
  lawyerId: z.string().min(1).optional(),
  accessLevel: z.enum(['VIEW','EDIT']).default('VIEW'),
}).refine((v) => Boolean(v.userId) !== Boolean(v.lawyerId), { message: 'حدد حسابًا واحدًا لكل تصريح' });
const schema = z.object({
  classification: z.enum(['INTERNAL','CONFIDENTIAL','HIGHLY_CONFIDENTIAL']),
  ethicalWallEnabled: z.boolean(),
  reason: z.string().trim().max(1000).optional(),
  grants: z.array(grantSchema).max(200),
});
async function requireSenior() {
  const session = await user();
  if (!session) throw new ApiError(401, 'يجب تسجيل الدخول');
  if (!await isSeniorManagement(session)) throw new ApiError(403, 'إدارة سرية القضايا متاحة للإدارة العليا فقط');
  return session;
}

export const GET = handle(async (_request: Request, context: Ctx) => {
  await requireSenior();
  const { id } = await context.params;
  const cases = await prisma.$queryRawUnsafe<Array<{id:string;name:string;number:string}>>(
    'SELECT "id","name","number" FROM "case_records" WHERE "id"=$1 LIMIT 1', id,
  );
  if (!cases.length) throw new ApiError(404, 'القضية غير موجودة');
  const [settings, grants, lawyers, users] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{classification:string;ethical_wall_enabled:boolean;reason:string|null}>>(
      'SELECT "classification","ethical_wall_enabled","reason" FROM "office_case_security" WHERE "case_id"=$1 LIMIT 1', id,
    ),
    prisma.$queryRawUnsafe<Array<{id:string;user_id:string|null;lawyer_id:string|null;access_level:string;name:string;email:string|null}>>(
      'SELECT g."id",g."user_id",g."lawyer_id",g."access_level",COALESCE(u."name",l."fullName") AS "name",COALESCE(u."email",l."googleEmail",l."email") AS "email" FROM "office_case_access_grants" g LEFT JOIN "users" u ON u."id"=g."user_id" LEFT JOIN "lawyers" l ON l."id"=g."lawyer_id" WHERE g."case_id"=$1 ORDER BY COALESCE(u."name",l."fullName")', id,
    ),
    prisma.$queryRawUnsafe<Array<{id:string;name:string;email:string|null}>>(
      'SELECT "id","fullName" AS "name",COALESCE("googleEmail","email") AS "email" FROM "lawyers" WHERE "active"=true ORDER BY "fullName"',
    ),
    prisma.$queryRawUnsafe<Array<{id:string;name:string;email:string;role:string}>>(
      'SELECT "id","name","email","role" FROM "users" ORDER BY "name"',
    ),
  ]);
  return json({
    case: cases[0],
    settings: settings[0] || {classification:'INTERNAL',ethical_wall_enabled:false,reason:null},
    grants: grants.map((g) => ({id:g.id,userId:g.user_id,lawyerId:g.lawyer_id,accessLevel:g.access_level,name:g.name,email:g.email})),
    lawyers, users,
  }, {headers:{'Cache-Control':'private, no-store, max-age=0'}});
});

export const PATCH = handle(async (request: Request, context: Ctx) => {
  const session = await requireSenior();
  const { id } = await context.params;
  const data = await readJson(request, schema);
  const cases = await prisma.$queryRawUnsafe<Array<{id:string;name:string}>>(
    'SELECT "id","name" FROM "case_records" WHERE "id"=$1 LIMIT 1', id,
  );
  if (!cases.length) throw new ApiError(404, 'القضية غير موجودة');
  const userIds = data.grants.flatMap((g) => g.userId ? [g.userId] : []);
  const lawyerIds = data.grants.flatMap((g) => g.lawyerId ? [g.lawyerId] : []);
  if (new Set(userIds).size !== userIds.length || new Set(lawyerIds).size !== lawyerIds.length) {
    throw new ApiError(400, 'يوجد حساب مكرر في قائمة التصاريح');
  }
  const [validUsers,validLawyers] = await Promise.all([
    userIds.length ? prisma.$queryRawUnsafe<Array<{id:string}>>('SELECT "id" FROM "users" WHERE "id"=ANY($1::text[])',userIds) : Promise.resolve([]),
    lawyerIds.length ? prisma.$queryRawUnsafe<Array<{id:string}>>('SELECT "id" FROM "lawyers" WHERE "id"=ANY($1::text[]) AND "active"=true',lawyerIds) : Promise.resolve([]),
  ]);
  if (validUsers.length!==userIds.length || validLawyers.length!==lawyerIds.length) {
    throw new ApiError(400, 'أحد الحسابات المحددة غير موجود أو غير نشط');
  }
  const actorUserId=session.role==='admin'?session.userId:null;
  const actorLawyerId=session.role==='lawyer'?session.lawyerId:null;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      'INSERT INTO "office_case_security" ("id","case_id","classification","ethical_wall_enabled","reason","created_by_user_id","created_by_lawyer_id") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT ("case_id") DO UPDATE SET "classification"=$3,"ethical_wall_enabled"=$4,"reason"=$5,"updated_at"=NOW()',
      officeId('casesec'),id,data.classification,data.ethicalWallEnabled,data.reason?.trim()||null,actorUserId,actorLawyerId,
    );
    await tx.$executeRawUnsafe('DELETE FROM "office_case_access_grants" WHERE "case_id"=$1',id);
    for (const grant of data.grants) {
      await tx.$executeRawUnsafe(
        'INSERT INTO "office_case_access_grants" ("id","case_id","user_id","lawyer_id","access_level","created_by_user_id","created_by_lawyer_id") VALUES ($1,$2,$3,$4,$5,$6,$7)',
        officeId('casegrant'),id,grant.userId||null,grant.lawyerId||null,grant.accessLevel,actorUserId,actorLawyerId,
      );
    }
    await tx.$executeRawUnsafe(
      'INSERT INTO "office_case_security_events" ("id","case_id","event_type","summary","actor_user_id","actor_lawyer_id","details_json") VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)',
      officeId('casesec_event'),id,'POLICY_UPDATED','تم تحديث سرية القضية: '+cases[0].name,
      actorUserId,actorLawyerId,JSON.stringify({classification:data.classification,ethicalWallEnabled:data.ethicalWallEnabled,grantsCount:data.grants.length}),
    );
  });
  return json({ok:true,grantsCount:data.grants.length});
});
