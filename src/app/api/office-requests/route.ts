import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { user } from '@/lib/api';
import { createOfficeRequest, isSeniorManagement, notifySenior, officeId } from '@/lib/office-workflow';

const requestSchema = z.object({
  type: z.string().min(2).max(40),
  title: z.string().trim().min(2).max(180),
  reason: z.string().trim().max(4000).optional(),
  payload: z.unknown().optional(),
  targetEntityType: z.string().max(60).optional(),
  targetEntityId: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const session = await user();
  if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
  const body = requestSchema.parse(await req.json());
  const senior = await isSeniorManagement(session);
  if (senior && body.type.startsWith('TASK_')) return NextResponse.json({ ok: true, direct: true });
  const id = await createOfficeRequest({ ...body, session });
  await notifySenior('طلب جديد في المكتب', body.title, '/admin/office').catch(() => undefined);
  return NextResponse.json({ ok: true, requestId: id, requiresApproval: !senior });
}

export async function GET(req: Request) {
  const session = await user();
  if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
  const senior = await isSeniorManagement(session);
  if (!senior) return NextResponse.json({ error: 'لا تملك صلاحية عرض الطلبات' }, { status: 403 });
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'PENDING';
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT r.*, u."name" AS requester_user_name, l."fullName" AS requester_lawyer_name
    FROM "office_requests" r
    LEFT JOIN "users" u ON u."id"=r."requested_by_user_id"
    LEFT JOIN "lawyers" l ON l."id"=r."requested_by_lawyer_id"
    WHERE ($1='ALL' OR r."status"=$1)
    ORDER BY r."created_at" DESC LIMIT 300`, status);
  return NextResponse.json({ requests: rows });
}

export async function PUT(req: Request) {
  const session = await user();
  if (!session || !(await isSeniorManagement(session))) return NextResponse.json({ error: 'صلاحية الإدارة العليا مطلوبة' }, { status: 403 });
  const body = z.object({ id: z.string(), decision: z.enum(['APPROVED', 'REJECTED']), note: z.string().max(2000).optional() }).parse(await req.json());
  const rows = await prisma.$queryRawUnsafe<Array<{ id:string; type:string; payload_json:any; target_entity_type:string|null; target_entity_id:string|null; status:string }>>(`SELECT "id","type","payload_json","target_entity_type","target_entity_id","status" FROM "office_requests" WHERE "id"=$1 LIMIT 1`, body.id);
  const request = rows[0];
  if (!request) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
  if (request.status !== 'PENDING') return NextResponse.json({ error: 'تم اتخاذ القرار بالفعل' }, { status: 409 });
  if (body.decision === 'APPROVED') {
    const p = (request.payload_json || {}) as any;
    if (request.type === 'TASK_EDIT') {
      await prisma.$executeRawUnsafe(`UPDATE "tasks" SET "description"=COALESCE($2,"description"),"notes"=COALESCE($3,"notes"),"scheduledTime"=COALESCE($4,"scheduledTime"),"updatedAt"=NOW() WHERE "id"=$1`, request.target_entity_id, p.description ?? null, p.notes ?? null, p.scheduledTime ?? null);
      if (p.scheduledDate) await prisma.$executeRawUnsafe(`UPDATE "tasks" SET "scheduledDate"=$2::date,"updatedAt"=NOW() WHERE "id"=$1`, request.target_entity_id, p.scheduledDate);
    }
    if (request.type === 'TASK_DELEGATE' && request.target_entity_id && p.lawyerId) {
      await prisma.$executeRawUnsafe(`INSERT INTO "task_assignments" ("id","taskId","lawyerId","createdAt") VALUES ($1,$2,$3,NOW()) ON CONFLICT ("taskId","lawyerId") DO NOTHING`, officeId('assign'), request.target_entity_id, p.lawyerId);
    }
    if (request.type === 'DELETE' && request.target_entity_type && request.target_entity_id) {
      const t = request.target_entity_type;
      let snapshot: any = null;
      if (t === 'client') {
        const r = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "clients" WHERE "id"=$1`, request.target_entity_id); snapshot = r[0];
        await prisma.$executeRawUnsafe(`UPDATE "clients" SET "status"='DELETED',"archived_at"=NOW() WHERE "id"=$1`, request.target_entity_id);
      } else if (t === 'lawyer') {
        const r = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "lawyers" WHERE "id"=$1`, request.target_entity_id); snapshot = r[0];
        await prisma.$executeRawUnsafe(`UPDATE "lawyers" SET "active"=false,"updatedAt"=NOW() WHERE "id"=$1`, request.target_entity_id);
      } else if (t === 'case') {
        const r = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "case_records" WHERE "id"=$1`, request.target_entity_id); snapshot = r[0];
        await prisma.$executeRawUnsafe(`UPDATE "case_records" SET "archived_at"=NOW() WHERE "id"=$1`, request.target_entity_id);
      } else if (t === 'file') {
        const r = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "client_files" WHERE "id"=$1`, request.target_entity_id); snapshot = r[0];
        await prisma.$executeRawUnsafe(`UPDATE "client_files" SET "deleted_at"=NOW() WHERE "id"=$1`, request.target_entity_id);
      }
      if (snapshot) await prisma.$executeRawUnsafe(`INSERT INTO "office_archive" ("id","entity_type","entity_id","label","snapshot_json","deleted_by_user_id","deleted_by_lawyer_id") VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)`, officeId('archive'), t, request.target_entity_id, String(snapshot.name ?? snapshot.fullName ?? snapshot.description ?? request.target_entity_id), JSON.stringify(snapshot), session.role==='admin'?session.userId:null, session.role==='lawyer'?session.lawyerId:null);
    }
  }
  await prisma.$executeRawUnsafe(`UPDATE "office_requests" SET "status"=$2,"decided_by_user_id"=$3,"decided_at"=NOW(),"decision_note"=$4 WHERE "id"=$1`, body.id, body.decision, session.role==='admin'?session.userId:null, body.note ?? null);
  return NextResponse.json({ ok: true, status: body.decision });
}
