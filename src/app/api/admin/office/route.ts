import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { user } from '@/lib/api';
import { isSeniorManagement, isFinanceManagement, officeId } from '@/lib/office-workflow';
import { slugify, uniqueSlug } from '@/lib/slug';

export async function GET() {
  const session = await user();
  const senior = await isSeniorManagement(session);
  const finance = await isFinanceManagement(session);
  if (!session || (!senior && !finance)) return NextResponse.json({ error: 'صلاحية الإدارة المطلوبة غير متاحة' }, { status: 403 });

  if (!senior) {
    const [requests, dues] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`SELECT r.*,u."name" AS requester_user_name,l."fullName" AS requester_lawyer_name FROM "office_requests" r LEFT JOIN "users" u ON u."id"=r."requested_by_user_id" LEFT JOIN "lawyers" l ON l."id"=r."requested_by_lawyer_id" WHERE r."type"='FINANCE' ORDER BY r."created_at" DESC LIMIT 300`),
      prisma.$queryRawUnsafe<any[]>(`SELECT d.*,l."fullName" AS lawyer_name FROM "financial_dues" d LEFT JOIN "lawyers" l ON l."id"=d."lawyer_id" ORDER BY d."created_at" DESC LIMIT 300`),
    ]);
    return NextResponse.json({ financeOnly: true, requests, dues, members: [], users: [], lawyers: [], logins: [], clicks: [], archive: [], categories: [], financeMembers: [] });
  }

  const [members, users, lawyers, requests, logins, clicks, archive, categories, dues, financeMembers] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`SELECT m.*,u."name" AS user_name,u."email" AS user_email,l."fullName" AS lawyer_name FROM "office_senior_members" m LEFT JOIN "users" u ON u."id"=m."user_id" LEFT JOIN "lawyers" l ON l."id"=m."lawyer_id" ORDER BY m."created_at" DESC`),
    prisma.$queryRawUnsafe<any[]>(`SELECT "id","name","email","role" FROM "users" ORDER BY "name" LIMIT 500`),
    prisma.$queryRawUnsafe<any[]>(`SELECT "id","fullName","email","googleEmail","active" FROM "lawyers" ORDER BY "fullName" LIMIT 500`),
    prisma.$queryRawUnsafe<any[]>(`SELECT r.*,u."name" AS requester_user_name,l."fullName" AS requester_lawyer_name FROM "office_requests" r LEFT JOIN "users" u ON u."id"=r."requested_by_user_id" LEFT JOIN "lawyers" l ON l."id"=r."requested_by_lawyer_id" ORDER BY r."created_at" DESC LIMIT 300`),
    prisma.$queryRawUnsafe<any[]>(`SELECT s.*,u."name" AS user_name,l."fullName" AS lawyer_name FROM "office_login_logs" s LEFT JOIN "users" u ON u."id"=s."user_id" LEFT JOIN "lawyers" l ON l."id"=s."lawyer_id" ORDER BY s."login_at" DESC LIMIT 300`),
    prisma.$queryRawUnsafe<any[]>(`SELECT c.*,u."name" AS user_name,l."fullName" AS lawyer_name FROM "office_click_logs" c LEFT JOIN "users" u ON u."id"=c."user_id" LEFT JOIN "lawyers" l ON l."id"=c."lawyer_id" ORDER BY c."created_at" DESC LIMIT 500`),
    prisma.$queryRawUnsafe<any[]>(`SELECT a.*,u."name" AS deleted_by_user_name,l."fullName" AS deleted_by_lawyer_name FROM "office_archive" a LEFT JOIN "users" u ON u."id"=a."deleted_by_user_id" LEFT JOIN "lawyers" l ON l."id"=a."deleted_by_lawyer_id" ORDER BY a."deleted_at" DESC LIMIT 500`),
    prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "office_case_categories" ORDER BY "sort_order","name_ar"`),
    prisma.$queryRawUnsafe<any[]>(`SELECT d.*,l."fullName" AS lawyer_name FROM "financial_dues" d LEFT JOIN "lawyers" l ON l."id"=d."lawyer_id" ORDER BY d."created_at" DESC LIMIT 300`),
    prisma.$queryRawUnsafe<any[]>(`SELECT f.*,l."fullName" AS lawyer_name,l."email" AS lawyer_email,l."googleEmail" AS lawyer_google_email FROM "office_finance_members" f JOIN "lawyers" l ON l."id"=f."lawyer_id" ORDER BY l."fullName"`),
  ]);
  return NextResponse.json({ financeOnly: false, members, users, lawyers, requests, logins, clicks, archive, categories, dues, financeMembers });
}

export async function POST(req: Request) {
  const session = await user();
  const senior = await isSeniorManagement(session);
  if (!session || !senior) return NextResponse.json({ error: 'صلاحية الإدارة العليا مطلوبة' }, { status: 403 });
  const body = await req.json();

  if (body.action === 'senior_add') {
    const data = z.object({ userId: z.string().optional(), lawyerId: z.string().optional(), title: z.string().max(120).optional() }).refine((v) => v.userId || v.lawyerId, 'اختر حساباً أو محامياً').parse(body);
    await prisma.$executeRawUnsafe(`INSERT INTO "office_senior_members" ("id","user_id","lawyer_id","title") VALUES ($1,$2,$3,$4)`, officeId('senior'), data.userId ?? null, data.lawyerId ?? null, data.title ?? 'إدارة عليا');
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'senior_remove') {
    const id = z.string().parse(body.id); await prisma.$executeRawUnsafe(`DELETE FROM "office_senior_members" WHERE "id"=$1`, id); return NextResponse.json({ ok: true });
  }
  if (body.action === 'finance_admin_add') {
    const lawyerId = z.string().parse(body.lawyerId);
    const lawyer = await prisma.lawyer.findUnique({ where: { id: lawyerId }, select: { id: true, active: true } });
    if (!lawyer || !lawyer.active) return NextResponse.json({ error: 'الزميل غير موجود أو غير نشط' }, { status: 404 });
    await prisma.$executeRawUnsafe(`INSERT INTO "office_finance_members" ("id","lawyer_id") VALUES ($1,$2) ON CONFLICT ("lawyer_id") DO NOTHING`, officeId('finance_admin'), lawyerId);
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'finance_admin_remove') {
    const id = z.string().parse(body.id); await prisma.$executeRawUnsafe(`DELETE FROM "office_finance_members" WHERE "id"=$1`, id); return NextResponse.json({ ok: true });
  }
  if (body.action === 'lawyer_add') {
    const data = z.object({ fullName:z.string().min(3).max(120), title:z.enum(['DOCTOR','ADVOCATE']), phone:z.string().min(6).max(20), email:z.string().email().max(120).optional(), specialization:z.string().max(200).optional(), bio:z.string().max(2000).optional(), position:z.string().max(120).optional() }).parse(body);
    const slug = await uniqueSlug(slugify(data.fullName));
    const email = data.email?.trim().toLowerCase() || null;
    const lawyer = await prisma.lawyer.create({ data:{ slug, fullName:data.fullName.trim(), title:data.title, phone:data.phone.trim(), email, googleEmail:email, specialization:data.specialization?.trim()||null, bio:data.bio?.trim()||null, position:data.position?.trim()||null, profilePhotoUrl:null, coverPhotoUrl:null, approvedAt:new Date(), active:true } });
    return NextResponse.json({ ok:true, lawyer:{id:lawyer.id,slug:lawyer.slug} }, {status:201});
  }
  if (body.action === 'location_add') {
    const data = z.object({ name:z.string().min(2).max(150), nameEn:z.string().max(150).optional(), type:z.string().min(2).max(60), governorate:z.string().max(80).optional(), city:z.string().max(80).optional(), district:z.string().max(80).optional(), workingHours:z.string().max(200).optional(), description:z.string().max(1000).optional() }).parse(body);
    const exists = await prisma.location.findFirst({ where:{ OR:[{name:data.name.trim()},{slug:slugify(data.name.trim())}] } });
    if(exists) return NextResponse.json({error:'يوجد مكان بهذا الاسم بالفعل'},{status:409});
    const slug = await uniqueSlug(slugify(data.name));
    const location = await prisma.location.create({ data:{ name:data.name.trim(), slug, nameEn:data.nameEn?.trim()||null, type:data.type as any, governorate:data.governorate?.trim()||null, city:data.city?.trim()||null, district:data.district?.trim()||null, workingHours:data.workingHours?.trim()||null, services:[], searchKeywords:[], description:data.description?.trim()||null } });
    return NextResponse.json({ok:true,location:{id:location.id,slug:location.slug}},{status:201});
  }
  if (body.action === 'category_save') {
    const data = z.object({ id:z.string().optional(), nameAr:z.string().min(2).max(120), nameEn:z.string().max(120).optional(), sortOrder:z.number().int().optional(), active:z.boolean().optional() }).parse(body);
    const id = data.id || officeId('casecat'); await prisma.$executeRawUnsafe(`INSERT INTO "office_case_categories" ("id","name_ar","name_en","sort_order","active","updated_at") VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT ("id") DO UPDATE SET "name_ar"=$2,"name_en"=$3,"sort_order"=$4,"active"=$5,"updated_at"=NOW()`,id,data.nameAr,data.nameEn??'',data.sortOrder??100,data.active??true); return NextResponse.json({ok:true});
  }
  if (body.action === 'category_move') {
    const data = z.object({id:z.string(),direction:z.enum(['up','down'])}).parse(body);
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT "id","sort_order" FROM "office_case_categories" WHERE "id"=$1 LIMIT 1`,data.id); const current=rows[0]; if(!current)return NextResponse.json({error:'القسم غير موجود'},{status:404});
    const neighbor = (await prisma.$queryRawUnsafe<any[]>(data.direction==='up'?`SELECT "id","sort_order" FROM "office_case_categories" WHERE "active"=true AND "sort_order"<$1 ORDER BY "sort_order" DESC,"name_ar" DESC LIMIT 1`:`SELECT "id","sort_order" FROM "office_case_categories" WHERE "active"=true AND "sort_order">$1 ORDER BY "sort_order" ASC,"name_ar" ASC LIMIT 1`,current.sort_order))[0];
    if(neighbor){ await prisma.$executeRawUnsafe(`UPDATE "office_case_categories" SET "sort_order"=$2,"updated_at"=NOW() WHERE "id"=$1`,current.id,neighbor.sort_order); await prisma.$executeRawUnsafe(`UPDATE "office_case_categories" SET "sort_order"=$2,"updated_at"=NOW() WHERE "id"=$1`,neighbor.id,current.sort_order); }
    return NextResponse.json({ok:true});
  }
  if (body.action === 'category_delete') { const id=z.string().parse(body.id); await prisma.$executeRawUnsafe(`UPDATE "office_case_categories" SET "active"=false,"updated_at"=NOW() WHERE "id"=$1`,id); return NextResponse.json({ok:true}); }
  if (body.action === 'restore') {
    const id=z.string().parse(body.id); const rows=await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "office_archive" WHERE "id"=$1 LIMIT 1`,id); const entry=rows[0]; if(!entry)return NextResponse.json({error:'عنصر الأرشيف غير موجود'},{status:404}); if(entry.restored_at)return NextResponse.json({error:'تم استرجاعه بالفعل'},{status:409});
    if(entry.entity_type==='client')await prisma.$executeRawUnsafe(`UPDATE "clients" SET "status"='MAIN',"archived_at"=NULL,"rejection_reason"=NULL WHERE "id"=$1`,entry.entity_id); else if(entry.entity_type==='lawyer')await prisma.$executeRawUnsafe(`UPDATE "lawyers" SET "active"=true,"updatedAt"=NOW() WHERE "id"=$1`,entry.entity_id); else if(entry.entity_type==='case')await prisma.$executeRawUnsafe(`UPDATE "case_records" SET "archived_at"=NULL WHERE "id"=$1`,entry.entity_id); else if(entry.entity_type==='file')await prisma.$executeRawUnsafe(`UPDATE "client_files" SET "deleted_at"=NULL WHERE "id"=$1`,entry.entity_id); else if(entry.entity_type==='task')await prisma.$executeRawUnsafe(`UPDATE "tasks" SET "status"=COALESCE(NULLIF($2,''),'PENDING'),"updatedAt"=NOW() WHERE "id"=$1`,entry.entity_id,String(entry.snapshot_json?.status||'PENDING'));
    await prisma.$executeRawUnsafe(`UPDATE "office_archive" SET "restored_at"=NOW(),"restored_by_user_id"=$2 WHERE "id"=$1`,id,session.role==='admin'?session.userId:null); return NextResponse.json({ok:true});
  }
  if (body.action === 'due_add') { const data=z.object({lawyerId:z.string().optional(),description:z.string().min(2),amount:z.number().nonnegative()}).parse(body); await prisma.$executeRawUnsafe(`INSERT INTO "financial_dues" ("id","lawyer_id","description","amount") VALUES ($1,$2,$3,$4)`,officeId('due'),data.lawyerId??null,data.description,data.amount); return NextResponse.json({ok:true}); }
  return NextResponse.json({error:'إجراء غير معروف'},{status:400});
}
