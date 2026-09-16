import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { user } from '@/lib/api';
import { isSeniorManagement, officeId } from '@/lib/office-workflow';

export async function GET() {
  const session = await user();
  if (!session || !(await isSeniorManagement(session))) return NextResponse.json({ error: 'صلاحية الإدارة العليا مطلوبة' }, { status: 403 });
  const [members, users, lawyers, requests, logins, clicks, archive, categories, dues] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`SELECT m.*,u."name" AS user_name,u."email" AS user_email,l."fullName" AS lawyer_name FROM "office_senior_members" m LEFT JOIN "users" u ON u."id"=m."user_id" LEFT JOIN "lawyers" l ON l."id"=m."lawyer_id" ORDER BY m."created_at" DESC`),
    prisma.$queryRawUnsafe<any[]>(`SELECT "id","name","email","role" FROM "users" ORDER BY "name" LIMIT 500`),
    prisma.$queryRawUnsafe<any[]>(`SELECT "id","fullName","email","googleEmail","active" FROM "lawyers" ORDER BY "fullName" LIMIT 500`),
    prisma.$queryRawUnsafe<any[]>(`SELECT r.*,u."name" AS requester_user_name,l."fullName" AS requester_lawyer_name FROM "office_requests" r LEFT JOIN "users" u ON u."id"=r."requested_by_user_id" LEFT JOIN "lawyers" l ON l."id"=r."requested_by_lawyer_id" ORDER BY r."created_at" DESC LIMIT 300`),
    prisma.$queryRawUnsafe<any[]>(`SELECT s.*,u."name" AS user_name,l."fullName" AS lawyer_name FROM "office_login_logs" s LEFT JOIN "users" u ON u."id"=s."user_id" LEFT JOIN "lawyers" l ON l."id"=s."lawyer_id" ORDER BY s."login_at" DESC LIMIT 300`),
    prisma.$queryRawUnsafe<any[]>(`SELECT c.*,u."name" AS user_name,l."fullName" AS lawyer_name FROM "office_click_logs" c LEFT JOIN "users" u ON u."id"=c."user_id" LEFT JOIN "lawyers" l ON l."id"=c."lawyer_id" ORDER BY c."created_at" DESC LIMIT 500`),
    prisma.$queryRawUnsafe<any[]>(`SELECT a.*,u."name" AS deleted_by_user_name,l."fullName" AS deleted_by_lawyer_name FROM "office_archive" a LEFT JOIN "users" u ON u."id"=a."deleted_by_user_id" LEFT JOIN "lawyers" l ON l."id"=a."deleted_by_lawyer_id" ORDER BY a."deleted_at" DESC LIMIT 500`),
    prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "office_case_categories" ORDER BY "sort_order","name_ar"`),
    prisma.$queryRawUnsafe<any[]>(`SELECT d.*,l."fullName" AS lawyer_name FROM "financial_dues" d LEFT JOIN "lawyers" l ON l."id"=d."lawyer_id" ORDER BY d."created_at" DESC LIMIT 300`),
  ]);
  return NextResponse.json({ members, users, lawyers, requests, logins, clicks, archive, categories, dues });
}

export async function POST(req: Request) {
  const session = await user();
  if (!session || !(await isSeniorManagement(session))) return NextResponse.json({ error: 'صلاحية الإدارة العليا مطلوبة' }, { status: 403 });
  const body = await req.json();
  if (body.action === 'senior_add') {
    const data = z.object({ userId: z.string().optional(), lawyerId: z.string().optional(), title: z.string().max(120).optional() }).refine((v) => v.userId || v.lawyerId, 'اختر حساباً أو محامياً').parse(body);
    await prisma.$executeRawUnsafe(`INSERT INTO "office_senior_members" ("id","user_id","lawyer_id","title") VALUES ($1,$2,$3,$4)`, officeId('senior'), data.userId ?? null, data.lawyerId ?? null, data.title ?? 'إدارة عليا');
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'senior_remove') {
    const id = z.string().parse(body.id); await prisma.$executeRawUnsafe(`DELETE FROM "office_senior_members" WHERE "id"=$1`, id); return NextResponse.json({ ok: true });
  }
  if (body.action === 'category_save') {
    const data = z.object({ id: z.string().optional(), nameAr: z.string().min(2).max(120), nameEn: z.string().max(120).optional(), sortOrder: z.number().int().optional(), active: z.boolean().optional() }).parse(body);
    const id = data.id || officeId('casecat');
    await prisma.$executeRawUnsafe(`INSERT INTO "office_case_categories" ("id","name_ar","name_en","sort_order","active","updated_at") VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT ("id") DO UPDATE SET "name_ar"=$2,"name_en"=$3,"sort_order"=$4,"active"=$5,"updated_at"=NOW()`, id, data.nameAr, data.nameEn ?? '', data.sortOrder ?? 100, data.active ?? true);
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'category_delete') { const id=z.string().parse(body.id); await prisma.$executeRawUnsafe(`UPDATE "office_case_categories" SET "active"=false,"updated_at"=NOW() WHERE "id"=$1`,id); return NextResponse.json({ok:true}); }
  if (body.action === 'restore') {
    const id = z.string().parse(body.id);
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "office_archive" WHERE "id"=$1 LIMIT 1`, id); const entry=rows[0]; if(!entry) return NextResponse.json({error:'عنصر الأرشيف غير موجود'},{status:404});
    if(entry.restored_at) return NextResponse.json({error:'تم استرجاعه بالفعل'},{status:409});
    if(entry.entity_type==='client') await prisma.$executeRawUnsafe(`UPDATE "clients" SET "status"='MAIN',"archived_at"=NULL,"rejection_reason"=NULL WHERE "id"=$1`,entry.entity_id);
    else if(entry.entity_type==='lawyer') await prisma.$executeRawUnsafe(`UPDATE "lawyers" SET "active"=true,"updatedAt"=NOW() WHERE "id"=$1`,entry.entity_id);
    else if(entry.entity_type==='case') await prisma.$executeRawUnsafe(`UPDATE "case_records" SET "archived_at"=NULL WHERE "id"=$1`,entry.entity_id);
    else if(entry.entity_type==='file') await prisma.$executeRawUnsafe(`UPDATE "client_files" SET "deleted_at"=NULL WHERE "id"=$1`,entry.entity_id);
    else if(entry.entity_type==='task') await prisma.$executeRawUnsafe(`UPDATE "tasks" SET "status"=COALESCE(NULLIF($2,''),'PENDING'),"updatedAt"=NOW() WHERE "id"=$1`,entry.entity_id,String(entry.snapshot_json?.status||'PENDING'));
    await prisma.$executeRawUnsafe(`UPDATE "office_archive" SET "restored_at"=NOW(),"restored_by_user_id"=$2 WHERE "id"=$1`,id,session.role==='admin'?session.userId:null);
    return NextResponse.json({ok:true});
  }
  if (body.action === 'due_add') {
    const data=z.object({lawyerId:z.string().optional(),description:z.string().min(2),amount:z.number().nonnegative()}).parse(body);
    await prisma.$executeRawUnsafe(`INSERT INTO "financial_dues" ("id","lawyer_id","description","amount") VALUES ($1,$2,$3,$4)`,officeId('due'),data.lawyerId??null,data.description,data.amount);
    return NextResponse.json({ok:true});
  }
  return NextResponse.json({error:'إجراء غير معروف'},{status:400});
}
