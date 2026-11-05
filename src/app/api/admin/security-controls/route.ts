import crypto from 'node:crypto';
import { z } from 'zod';
import { ApiError, handle, json, readJson } from '@/lib/api';
import { user } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { isSeniorManagement } from '@/lib/office-workflow';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const permissionKeys = ['manageUsers','manageLawyers','manageLocations','writeTasks','comment','viewAdmin'] as const;
const schema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('override'),
    userId: z.string().min(1).max(128),
    permissionKey: z.enum(permissionKeys),
    allowed: z.boolean(),
    reason: z.string().trim().min(5).max(1000),
  }),
  z.object({
    type: z.literal('delegation'),
    userId: z.string().min(1).max(128),
    permissionKey: z.enum(permissionKeys),
    expiresInHours: z.number().int().min(1).max(720),
    reason: z.string().trim().min(8).max(1000),
  }),
  z.object({
    type: z.literal('retention'),
    resourceType: z.enum(['case_file','client_file']),
    retentionDays: z.number().int().min(30).max(36500),
    enabled: z.boolean(),
  }),
  z.object({
    type: z.literal('retention_review'),
    reviewId: z.string().min(1).max(128),
    decision: z.enum(['RETAINED','ARCHIVE_REQUESTED']),
    note: z.string().trim().max(1000).optional(),
  }),
]);
async function requireSenior() {
  const session = await user();
  if (!session) throw new ApiError(401, 'يجب تسجيل الدخول');
  if (!await isSeniorManagement(session)) throw new ApiError(403, 'إعدادات الحوكمة متاحة للإدارة العليا فقط');
  return session;
}
function actor(session: Awaited<ReturnType<typeof requireSenior>>) {
  return {
    userId: session.role === 'admin' ? session.userId : null,
    lawyerId: session.role === 'lawyer' ? session.lawyerId : null,
  };
}
const id = (prefix: string) => prefix + '_' + crypto.randomUUID().replaceAll('-','');

export const GET = handle(async () => {
  await requireSenior();
  const [users, overrides, delegations, policies, reviews, events] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{id:string;name:string;email:string;role:string}>>(
      `SELECT "id","name","email","role" FROM "users"
        WHERE "role" NOT IN ('ADMIN','SUPER_ADMIN') ORDER BY "name" ASC LIMIT 500`,
    ),
    prisma.$queryRawUnsafe<Array<Record<string,unknown>>>(
      `SELECT o."id",o."user_id" AS "userId",u."name" AS "userName",o."permission_key" AS "permissionKey",
              o."allowed",o."reason",o."updated_at" AS "updatedAt"
         FROM "office_user_permission_overrides" o JOIN "users" u ON u."id"=o."user_id"
        WHERE o."revoked_at" IS NULL ORDER BY o."updated_at" DESC LIMIT 200`,
    ),
    prisma.$queryRawUnsafe<Array<Record<string,unknown>>>(
      `SELECT d."id",d."grantee_user_id" AS "userId",u."name" AS "userName",d."permission_key" AS "permissionKey",
              d."reason",d."starts_at" AS "startsAt",d."expires_at" AS "expiresAt",d."revoked_at" AS "revokedAt"
         FROM "office_permission_delegations" d JOIN "users" u ON u."id"=d."grantee_user_id"
        WHERE d."revoked_at" IS NULL AND d."expires_at">NOW()
        ORDER BY d."expires_at" ASC LIMIT 200`,
    ),
    prisma.$queryRawUnsafe<Array<Record<string,unknown>>>(
      `SELECT p."resource_type" AS "resourceType",p."retention_days" AS "retentionDays",p."enabled",
              p."updated_at" AS "updatedAt",COUNT(r."id") FILTER (WHERE r."status"='PENDING')::int AS "pendingReviews"
         FROM "office_retention_policies" p
         LEFT JOIN "office_retention_reviews" r ON r."resource_type"=p."resource_type"
        GROUP BY p."id" ORDER BY p."resource_type"`,
    ),
    prisma.$queryRawUnsafe<Array<Record<string,unknown>>>(
      `SELECT r."id",r."resource_type" AS "resourceType",r."resource_id" AS "resourceId",
              r."file_id" AS "fileId",r."file_name" AS "fileName",r."file_created_at" AS "fileCreatedAt",
              r."detected_at" AS "detectedAt",r."status"
         FROM "office_retention_reviews" r WHERE r."status"='PENDING'
        ORDER BY r."detected_at" DESC LIMIT 100`,
    ),
    prisma.$queryRawUnsafe<Array<Record<string,unknown>>>(
      `SELECT a."id",a."action",a."resource_type" AS "resourceType",a."resource_id" AS "resourceId",
              a."summary",a."created_at" AS "createdAt",COALESCE(u."name",l."fullName",'النظام') AS "actorName"
         FROM "office_audit_events" a
         LEFT JOIN "users" u ON u."id"=a."actor_user_id"
         LEFT JOIN "lawyers" l ON l."id"=a."actor_lawyer_id"
        ORDER BY a."created_at" DESC LIMIT 60`,
    ),
  ]);
  return json({ users, overrides, delegations, policies, reviews, events }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
});

export const POST = handle(async (request: Request) => {
  const session = await requireSenior();
  const data = await readJson(request, schema);
  const who = actor(session);

  if (data.type === 'override' || data.type === 'delegation') {
    const targets = await prisma.$queryRawUnsafe<Array<{id:string;role:string;name:string}>>(
      `SELECT "id","role","name" FROM "users" WHERE "id"=$1 LIMIT 1`, data.userId,
    );
    const target = targets[0];
    if (!target) throw new ApiError(404, 'الحساب المحدد غير موجود');
    if (target.role === 'ADMIN' || target.role === 'SUPER_ADMIN') {
      throw new ApiError(403, 'لا يمكن تغيير صلاحيات حساب المدير العام أو تفويض صلاحية إليه');
    }

    if (data.type === 'override') {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "office_user_permission_overrides"
          ("id","user_id","permission_key","scope_key","allowed","reason","created_by_user_id","created_by_lawyer_id")
         VALUES ($1,$2,$3,'GLOBAL',$4,$5,$6,$7)
         ON CONFLICT ("user_id","permission_key","scope_key") DO UPDATE SET
           "allowed"=EXCLUDED."allowed","reason"=EXCLUDED."reason",
           "created_by_user_id"=EXCLUDED."created_by_user_id","created_by_lawyer_id"=EXCLUDED."created_by_lawyer_id",
           "revoked_at"=NULL,"updated_at"=NOW()`,
        id('perm'),data.userId,data.permissionKey,data.allowed,data.reason,who.userId,who.lawyerId,
      );
      await logAuditEvent({
        actorUserId:who.userId,actorLawyerId:who.lawyerId,action:'PERMISSION_OVERRIDE_SET',
        resourceType:'user',resourceId:data.userId,
        summary:'تحديث صلاحية تفصيلية للحساب '+target.name,
        metadata:{permissionKey:data.permissionKey,allowed:data.allowed,reason:data.reason},
      });
      return json({ok:true,message:'تم حفظ الصلاحية التفصيلية.'});
    }

    const expiresAt = new Date(Date.now()+data.expiresInHours*60*60*1000);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "office_permission_delegations"
        ("id","grantee_user_id","permission_key","reason","starts_at","expires_at","created_by_user_id","created_by_lawyer_id")
       VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7)`,
      id('delegate'),data.userId,data.permissionKey,data.reason,expiresAt,who.userId,who.lawyerId,
    );
    await logAuditEvent({
      actorUserId:who.userId,actorLawyerId:who.lawyerId,action:'PERMISSION_DELEGATED',
      resourceType:'user',resourceId:data.userId,
      summary:'تفويض مؤقت لصلاحية إلى '+target.name,
      metadata:{permissionKey:data.permissionKey,expiresAt:expiresAt.toISOString(),reason:data.reason},
    });
    return json({ok:true,message:'تم إنشاء التفويض المؤقت، وسينتهي تلقائيًا في موعده.'});
  }

  if (data.type === 'retention') {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "office_retention_policies"
        ("id","resource_type","retention_days","enabled","updated_by_user_id","updated_by_lawyer_id")
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT ("resource_type") DO UPDATE SET
         "retention_days"=EXCLUDED."retention_days","enabled"=EXCLUDED."enabled",
         "updated_by_user_id"=EXCLUDED."updated_by_user_id","updated_by_lawyer_id"=EXCLUDED."updated_by_lawyer_id",
         "updated_at"=NOW()`,
      id('retention_policy'),data.resourceType,data.retentionDays,data.enabled,who.userId,who.lawyerId,
    );
    await logAuditEvent({
      actorUserId:who.userId,actorLawyerId:who.lawyerId,action:'RETENTION_POLICY_UPDATED',
      resourceType:'retention_policy',resourceId:data.resourceType,
      summary:'تحديث سياسة الاحتفاظ للملفات',
      metadata:{retentionDays:data.retentionDays,enabled:data.enabled,mode:'REVIEW_ONLY'},
    });
    return json({ok:true,message:'تم حفظ السياسة. الملفات المستحقة ستُرسل للمراجعة دون حذف تلقائي.'});
  }

  const result = await prisma.$executeRawUnsafe(
    `UPDATE "office_retention_reviews"
        SET "status"=$2,"reviewed_by_user_id"=$3,"reviewed_by_lawyer_id"=$4,
            "reviewed_at"=NOW(),"review_note"=$5
      WHERE "id"=$1 AND "status"='PENDING'`,
    data.reviewId,data.decision,who.userId,who.lawyerId,data.note?.trim()||null,
  );
  if (!result) throw new ApiError(404, 'طلب المراجعة غير موجود أو سبق التعامل معه');
  await logAuditEvent({
    actorUserId:who.userId,actorLawyerId:who.lawyerId,action:'RETENTION_REVIEW_DECIDED',
    resourceType:'retention_review',resourceId:data.reviewId,
    summary:data.decision==='RETAINED'?'تم الإبقاء على الملف بعد مراجعة مدة الاحتفاظ':'تم تسجيل طلب أرشفة يدوية للملف؛ لم يتم نقله أو حذفه',
    metadata:{decision:data.decision,note:data.note||''},
  });
  return json({ok:true,message:'تم تسجيل قرار المراجعة. لم يتم حذف الملف.'});
});

export const DELETE = handle(async (request: Request) => {
  const session = await requireSenior();
  const query = new URL(request.url).searchParams;
  const type = query.get('type');
  const idValue = query.get('id') || '';
  if (!idValue || idValue.length > 128 || (type !== 'override' && type !== 'delegation')) {
    throw new ApiError(400, 'بيانات الإلغاء غير صالحة');
  }
  const table = type === 'override' ? 'office_user_permission_overrides' : 'office_permission_delegations';
  const changed = await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET "revoked_at"=NOW() WHERE "id"=$1 AND "revoked_at" IS NULL`,
    idValue,
  );
  if (!changed) throw new ApiError(404, 'العنصر غير موجود أو تم إلغاؤه بالفعل');
  await logAuditEvent({
    actorUserId:session.role==='admin'?session.userId:null,
    actorLawyerId:session.role==='lawyer'?session.lawyerId:null,
    action:type==='override'?'PERMISSION_OVERRIDE_REVOKED':'PERMISSION_DELEGATION_REVOKED',
    resourceType:type,resourceId:idValue,summary:'إلغاء صلاحية أو تفويض',
  });
  return json({ok:true});
});
