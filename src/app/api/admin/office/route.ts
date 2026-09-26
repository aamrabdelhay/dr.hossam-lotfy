import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { user } from '@/lib/api';
import { isSeniorManagement, isFinanceManagement, getLawyerManagementLabels, officeId } from '@/lib/office-workflow';
import { slugify, uniqueSlug } from '@/lib/slug';
import { getAllBranches, getBranchScope, branchSummary } from '@/lib/branch-access';
import { isOfficeManager } from '@/lib/office-workflow';

export async function GET(req: Request) {
  const session = await user();
  const scope = await getBranchScope(session);
  const senior = await isSeniorManagement(session);
  const finance = await isFinanceManagement(session);
  const officeManager = await isOfficeManager(session);
  const isOffice = scope.officeManager;
  if (!session || (!senior && !finance && !isOffice)) return NextResponse.json({ error: 'صلاحية الإدارة المطلوبة غير متاحة' }, { status: 403 });
  const url = new URL(req.url);
  const requestedBranchId = url.searchParams.get('branchId');
  const allBranches = await getAllBranches();
  const allowed = senior ? allBranches : allBranches.filter((b) => scope.branchIds.includes(b.id));
  const selectedBranchId = senior
    ? (requestedBranchId && allowed.some((b) => b.id === requestedBranchId) ? requestedBranchId : null)
    : (requestedBranchId && allowed.some((b) => b.id === requestedBranchId) ? requestedBranchId : (allowed[0]?.id ?? null));
  if (!senior && !selectedBranchId) return NextResponse.json({ error: 'لم يتم ربط حسابك بفرع.' }, { status: 403 });
  const summary = selectedBranchId ? await branchSummary(selectedBranchId) : null;
  const availableLawyers = selectedBranchId
    ? senior
      ? await prisma.$queryRawUnsafe<any[]>('SELECT "id","fullName","title" FROM "lawyers" WHERE "active"=true ORDER BY "fullName" LIMIT 500')
      : await prisma.$queryRawUnsafe<any[]>(
          'SELECT l."id",l."fullName",l."title" FROM "lawyers" l LEFT JOIN "office_branch_lawyers" bl ON bl."lawyer_id"=l."id" WHERE l."active"=true AND (bl."branch_id" IS NULL OR bl."branch_id"=$1) ORDER BY l."fullName" LIMIT 500',
          selectedBranchId,
        )
    : await prisma.$queryRawUnsafe<any[]>('SELECT "id","fullName","title" FROM "lawyers" WHERE "active"=true ORDER BY "fullName" LIMIT 500');
  if (!senior && finance && !isOffice) {
    const branchId = selectedBranchId as string;
    const [requests, dues, expenses, branchManagers] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>('SELECT r.*,u."name" AS requester_user_name,l."fullName" AS requester_lawyer_name FROM "office_requests" r LEFT JOIN "users" u ON u."id"=r."requested_by_user_id" LEFT JOIN "lawyers" l ON l."id"=r."requested_by_lawyer_id" WHERE r."type"=\'FINANCE\' AND COALESCE(r."branch_id",$1)=$1 ORDER BY r."created_at" DESC LIMIT 300', branchId),
      prisma.$queryRawUnsafe<any[]>('SELECT d.*,l."fullName" AS lawyer_name FROM "financial_dues" d LEFT JOIN "lawyers" l ON l."id"=d."lawyer_id" WHERE COALESCE(d."branch_id",$1)=$1 ORDER BY d."created_at" DESC LIMIT 300', branchId),
      prisma.$queryRawUnsafe<any[]>('SELECT * FROM "office_expenses" WHERE COALESCE("branch_id",$1)=$1 ORDER BY "created_at" DESC LIMIT 500', branchId),
      prisma.$queryRawUnsafe<any[]>('SELECT m.*,l."fullName" AS lawyer_name FROM "office_branch_managers" m LEFT JOIN "lawyers" l ON l."id"=m."lawyer_id" WHERE m."branch_id"=$1 AND m."manager_type"=\'FINANCE_MANAGER\'', branchId),
    ]);
    return NextResponse.json({ financeOnly:true, branches:allowed, selectedBranchId, summary, requests, dues, expenses, members:[], users:[], lawyers:summary?.lawyers??[], logins:[], clicks:[], archive:[], categories:[], financeMembers:branchManagers, branchManagers, availableLawyers });
  }
  const cases = selectedBranchId
    ? await prisma.$queryRawUnsafe<any[]>('SELECT cr."id",cr."name",cr."number",cr."clientName",cr."branch_id",cr."archived_at",cr."category_id" FROM "case_records" cr WHERE cr."branch_id"=$1 ORDER BY cr."id" DESC LIMIT 500', selectedBranchId)
    : await prisma.$queryRawUnsafe<any[]>('SELECT cr."id",cr."name",cr."number",cr."clientName",cr."branch_id",cr."archived_at",cr."category_id" FROM "case_records" cr ORDER BY cr."id" DESC LIMIT 500');
  const [members, users, lawyers, requests, logins, clicks, archive, categories, dues, financeMembers, expenses, branchManagers] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>('SELECT m.*,u."name" AS user_name,u."email" AS user_email,l."fullName" AS lawyer_name FROM "office_senior_members" m LEFT JOIN "users" u ON u."id"=m."user_id" LEFT JOIN "lawyers" l ON l."id"=m."lawyer_id" ORDER BY m."created_at" DESC'),
    prisma.$queryRawUnsafe<any[]>('SELECT "id","name","email","role" FROM "users" ORDER BY "name" LIMIT 500'),
    selectedBranchId ? prisma.$queryRawUnsafe<any[]>('SELECT l."id",l."fullName",l."email",l."googleEmail",l."active",l."title" FROM "office_branch_lawyers" bl JOIN "lawyers" l ON l."id"=bl."lawyer_id" WHERE bl."branch_id"=$1 ORDER BY l."fullName" LIMIT 500', selectedBranchId) : prisma.$queryRawUnsafe<any[]>('SELECT "id","fullName","email","googleEmail","active","title" FROM "lawyers" ORDER BY "fullName" LIMIT 500'),
    selectedBranchId ? prisma.$queryRawUnsafe<any[]>('SELECT r.*,u."name" AS requester_user_name,l."fullName" AS requester_lawyer_name FROM "office_requests" r LEFT JOIN "users" u ON u."id"=r."requested_by_user_id" LEFT JOIN "lawyers" l ON l."id"=r."requested_by_lawyer_id" WHERE COALESCE(r."branch_id",$1)=$1 ORDER BY r."created_at" DESC LIMIT 300', selectedBranchId) : prisma.$queryRawUnsafe<any[]>('SELECT r.*,u."name" AS requester_user_name,l."fullName" AS requester_lawyer_name FROM "office_requests" r LEFT JOIN "users" u ON u."id"=r."requested_by_user_id" LEFT JOIN "lawyers" l ON l."id"=r."requested_by_lawyer_id" ORDER BY r."created_at" DESC LIMIT 300'),
    senior ? prisma.$queryRawUnsafe<any[]>('SELECT s.*,u."name" AS user_name,l."fullName" AS lawyer_name FROM "office_login_logs" s LEFT JOIN "users" u ON u."id"=s."user_id" LEFT JOIN "lawyers" l ON l."id"=s."lawyer_id" ORDER BY s."login_at" DESC LIMIT 300') : [],
    senior ? prisma.$queryRawUnsafe<any[]>('SELECT c.*,u."name" AS user_name,l."fullName" AS lawyer_name FROM "office_click_logs" c LEFT JOIN "users" u ON u."id"=c."user_id" LEFT JOIN "lawyers" l ON l."id"=c."lawyer_id" ORDER BY c."created_at" DESC LIMIT 500') : [],
    senior ? prisma.$queryRawUnsafe<any[]>('SELECT a.*,u."name" AS deleted_by_user_name,l."fullName" AS deleted_by_lawyer_name FROM "office_archive" a LEFT JOIN "users" u ON u."id"=a."deleted_by_user_id" LEFT JOIN "lawyers" l ON l."id"=a."deleted_by_lawyer_id" ORDER BY a."deleted_at" DESC LIMIT 500') : [],
    prisma.$queryRawUnsafe<any[]>('SELECT * FROM "office_case_categories" ORDER BY "sort_order","name_ar"'),
    selectedBranchId ? prisma.$queryRawUnsafe<any[]>('SELECT d.*,l."fullName" AS lawyer_name FROM "financial_dues" d LEFT JOIN "lawyers" l ON l."id"=d."lawyer_id" WHERE COALESCE(d."branch_id",$1)=$1 ORDER BY d."created_at" DESC LIMIT 300', selectedBranchId) : prisma.$queryRawUnsafe<any[]>('SELECT d.*,l."fullName" AS lawyer_name FROM "financial_dues" d LEFT JOIN "lawyers" l ON l."id"=d."lawyer_id" ORDER BY d."created_at" DESC LIMIT 300'),
    selectedBranchId ? prisma.$queryRawUnsafe<any[]>('SELECT m.*,l."fullName" AS lawyer_name,l."email" AS lawyer_email,l."googleEmail" AS lawyer_google_email FROM "office_branch_managers" m JOIN "lawyers" l ON l."id"=m."lawyer_id" WHERE m."branch_id"=$1 ORDER BY m."manager_type",l."fullName"', selectedBranchId) : prisma.$queryRawUnsafe<any[]>('SELECT m.*,l."fullName" AS lawyer_name,l."email" AS lawyer_email,l."googleEmail" AS lawyer_google_email FROM "office_branch_managers" m JOIN "lawyers" l ON l."id"=m."lawyer_id" ORDER BY m."manager_type",l."fullName"'),
    selectedBranchId ? prisma.$queryRawUnsafe<any[]>('SELECT * FROM "office_expenses" WHERE COALESCE("branch_id",$1)=$1 ORDER BY "created_at" DESC LIMIT 500', selectedBranchId) : prisma.$queryRawUnsafe<any[]>('SELECT * FROM "office_expenses" ORDER BY "created_at" DESC LIMIT 500'),
    selectedBranchId ? prisma.$queryRawUnsafe<any[]>('SELECT m.*,l."fullName" AS lawyer_name,l."email" AS lawyer_email FROM "office_branch_managers" m LEFT JOIN "lawyers" l ON l."id"=m."lawyer_id" WHERE m."branch_id"=$1 ORDER BY m."manager_type"', selectedBranchId) : prisma.$queryRawUnsafe<any[]>('SELECT m.*,l."fullName" AS lawyer_name,l."email" AS lawyer_email FROM "office_branch_managers" m LEFT JOIN "lawyers" l ON l."id"=m."lawyer_id" ORDER BY m."branch_id",m."manager_type"'),
  ]);
  const management = await getLawyerManagementLabels(lawyers.map((l:any)=>l.id));
  const lawyersWithManagement = lawyers.map((l:any)=>({ ...l, managementLabels: management[l.id] ?? [] }));
  return NextResponse.json({ financeOnly:false, branches:allowed, selectedBranchId, summary, members: senior ? members : [], users: senior ? users : [], lawyers:lawyersWithManagement, cases, requests, logins: senior ? logins : [], clicks: senior ? clicks : [], archive: senior ? archive : [], categories, dues, financeMembers, expenses, branchManagers, availableLawyers });
}
export async function POST(req: Request) {
  const session = await user();
  const senior = await isSeniorManagement(session);
  const finance = await isFinanceManagement(session);
  const officeManager = await isOfficeManager(session);
  if (!session || (!senior && !finance && !officeManager)) return NextResponse.json({ error: 'صلاحية الإدارة المطلوبة غير متاحة' }, { status: 403 });
  const body = await req.json();
  const action = String(body.action || '');
  const financeActions = ['finance_admin_add','finance_admin_remove','expense_add','expense_mark_paid','expense_delete','due_add'];
  const managerActions = ['lawyer_add','location_add','case_branch_assign','lawyer_branch_assign'];
  const seniorOnlyActions = ['branch_add','branch_update','office_manager_add','office_manager_remove','senior_add','senior_remove','category_save','category_move','category_delete','restore'];
  if (seniorOnlyActions.includes(action) && !senior) return NextResponse.json({ error: 'هذا الإجراء متاح للإدارة العليا فقط' }, { status: 403 });
  if (financeActions.includes(action) && !senior && !finance) return NextResponse.json({ error: 'تحتاج إلى صلاحية الإدارة المالية' }, { status: 403 });
  if (managerActions.includes(action) && !senior && !officeManager) return NextResponse.json({ error: 'تحتاج إلى صلاحية مدير المكتب' }, { status: 403 });

  if (body.action === 'case_branch_assign') {
    const data = z.object({ caseId:z.string(), branchId:z.string() }).parse(body);
    const scope = await getBranchScope(session);
    if (!senior && !scope.officeManagerBranchIds.includes(data.branchId)) return NextResponse.json({error:'لا تملك صلاحية هذا الفرع'},{status:403});
    const ok = await prisma.$queryRawUnsafe<Array<{id:string}>>('SELECT "id" FROM "office_branches" WHERE "id"=$1 AND "active"=true LIMIT 1',data.branchId);
    if (!ok[0]) return NextResponse.json({error:'الفرع غير موجود أو غير نشط'},{status:404});
    await prisma.$executeRawUnsafe('UPDATE "case_records" SET "branch_id"=$2 WHERE "id"=$1',data.caseId,data.branchId);
    await prisma.$executeRawUnsafe('UPDATE "clients" SET "branch_id"=$2 WHERE "id" IN (SELECT DISTINCT "clientId" FROM "case_records" WHERE "id"=$1 AND "clientId" IS NOT NULL)',data.caseId,data.branchId);
    return NextResponse.json({ok:true});
  }
  if (body.action === 'branch_add') {
    const data = z.object({ code:z.string().trim().min(2).max(30), nameAr:z.string().trim().min(2).max(120), nameEn:z.string().trim().max(120).optional(), address:z.string().trim().min(5).max(300), isMain:z.boolean().optional() }).parse(body);
    if (data.isMain) return NextResponse.json({ error: 'الفرع الرئيسي ثابت ولا يمكن إنشاء فرع رئيسي آخر' }, { status: 400 });
    const id = officeId('branch');
    await prisma.$executeRawUnsafe(`INSERT INTO "office_branches" ("id","code","name_ar","name_en","address","is_main") VALUES ($1,$2,$3,$4,$5,false)`, id, data.code.toUpperCase(), data.nameAr, data.nameEn?.trim()||null, data.address);
    return NextResponse.json({ ok:true, id }, { status:201 });
  }
  if (body.action === 'branch_update') {
    const data = z.object({ id:z.string(), nameAr:z.string().trim().min(2).max(120).optional(), nameEn:z.string().trim().max(120).optional(), address:z.string().trim().min(5).max(300).optional(), active:z.boolean().optional() }).parse(body);
    const existing = await prisma.$queryRawUnsafe<Array<{id:string;is_main:boolean}>>('SELECT "id","is_main" FROM "office_branches" WHERE "id"=$1 LIMIT 1',data.id);
    if (!existing[0]) return NextResponse.json({ error:'الفرع غير موجود' },{status:404});
    if (existing[0].is_main && data.active===false) return NextResponse.json({ error:'لا يمكن تعطيل المقر الرئيسي' },{status:400});
    await prisma.$executeRawUnsafe('UPDATE "office_branches" SET "name_ar"=COALESCE($2,"name_ar"),"name_en"=COALESCE($3,"name_en"),"address"=COALESCE($4,"address"),"active"=COALESCE($5,"active"),"updated_at"=NOW() WHERE "id"=$1',data.id,data.nameAr?.trim()||null,data.nameEn?.trim()||null,data.address?.trim()||null,data.active??null);
    return NextResponse.json({ok:true});
  }
  if (body.action === 'lawyer_branch_assign') {
    const data = z.object({ lawyerId:z.string(), branchId:z.string() }).parse(body);
    const scope = await getBranchScope(session);
    if (!senior && !scope.officeManagerBranchIds.includes(data.branchId)) return NextResponse.json({error:'لا تملك صلاحية هذا الفرع'},{status:403});
    const ok = await prisma.$queryRawUnsafe<Array<{id:string}>>('SELECT "id" FROM "office_branches" WHERE "id"=$1 AND "active"=true LIMIT 1',data.branchId);
    if (!ok[0]) return NextResponse.json({error:'الفرع غير موجود أو غير نشط'},{status:404});
    await prisma.$executeRawUnsafe('DELETE FROM "office_branch_lawyers" WHERE "lawyer_id"=$1',data.lawyerId);
    await prisma.$executeRawUnsafe('INSERT INTO "office_branch_lawyers" ("branch_id","lawyer_id") VALUES ($1,$2) ON CONFLICT DO NOTHING',data.branchId,data.lawyerId);
    return NextResponse.json({ok:true});
  }
  if (body.action === 'office_manager_add') {
    const data = z.object({ lawyerId:z.string(), branchId:z.string() }).parse(body);
    const lawyer = await prisma.$queryRawUnsafe<Array<{id:string;active:boolean}>>('SELECT "id","active" FROM "lawyers" WHERE "id"=$1 LIMIT 1',data.lawyerId);
    if (!lawyer[0] || !lawyer[0].active) return NextResponse.json({error:'المحامي غير موجود أو غير نشط'},{status:404});
    await prisma.$executeRawUnsafe('DELETE FROM "office_branch_managers" WHERE ("lawyer_id"=$1 AND "manager_type"=\'OFFICE_MANAGER\') OR ("branch_id"=$2 AND "manager_type"=\'OFFICE_MANAGER\')',data.lawyerId,data.branchId);
    await prisma.$executeRawUnsafe('INSERT INTO "office_branch_lawyers" ("branch_id","lawyer_id") VALUES ($1,$2) ON CONFLICT DO NOTHING',data.branchId,data.lawyerId);
    await prisma.$executeRawUnsafe('INSERT INTO "office_branch_managers" ("id","branch_id","manager_type","lawyer_id") VALUES ($1,$2,\'OFFICE_MANAGER\',$3)',officeId('manager'),data.branchId,data.lawyerId);
    const identity = await prisma.$queryRawUnsafe<Array<{id:string;role:string}>>('SELECT "id","role" FROM "users" WHERE lower("email")=lower((SELECT COALESCE("googleEmail","email") FROM "lawyers" WHERE "id"=$1)) LIMIT 1',data.lawyerId);
    if(!identity[0]){
      const lawyerEmail = await prisma.$queryRawUnsafe<Array<{email:string|null;googleEmail:string|null;fullName:string}>>('SELECT "email","googleEmail","fullName" FROM "lawyers" WHERE "id"=$1 LIMIT 1',data.lawyerId);
      const email=(lawyerEmail[0]?.googleEmail||lawyerEmail[0]?.email||'').trim().toLowerCase();
      if(email) await prisma.user.create({data:{name:lawyerEmail[0].fullName,email,passwordHash:bcrypt.hashSync(crypto.randomBytes(32).toString('base64url'),10),role:'OFFICE_MANAGER'}}).catch(()=>undefined);
    } else if(identity[0].role!=='ADMIN'&&identity[0].role!=='SUPER_ADMIN') {
      await prisma.user.update({where:{id:identity[0].id},data:{role:'OFFICE_MANAGER'}}).catch(()=>undefined);
    }
    return NextResponse.json({ok:true});
  }
  if (body.action === 'office_manager_remove') {
    const id=z.string().parse(body.id);
    const rows=await prisma.$queryRawUnsafe<Array<{lawyer_id:string|null}>>('SELECT "lawyer_id" FROM "office_branch_managers" WHERE "id"=$1 AND "manager_type"=\'OFFICE_MANAGER\' LIMIT 1',id);
    await prisma.$executeRawUnsafe('DELETE FROM "office_branch_managers" WHERE "id"=$1 AND "manager_type"=\'OFFICE_MANAGER\'',id);
    if(rows[0]?.lawyer_id){
      const identity=await prisma.$queryRawUnsafe<Array<{id:string;role:string}>>('SELECT u."id",u."role" FROM "users" u JOIN "lawyers" l ON lower(u."email")=lower(COALESCE(l."googleEmail",l."email")) WHERE l."id"=$1 LIMIT 1',rows[0].lawyer_id);
      if(identity[0]?.role==='OFFICE_MANAGER') await prisma.user.update({where:{id:identity[0].id},data:{role:'VIEWER'}}).catch(()=>undefined);
    }
    return NextResponse.json({ok:true});
  }
  if (body.action === 'senior_add') {
    const data = z.object({ userId: z.string().optional(), lawyerId: z.string().optional(), title: z.string().max(120).optional() }).refine((v) => v.userId || v.lawyerId, 'اختر حساباً أو محامياً').parse(body);
    await prisma.$executeRawUnsafe(`INSERT INTO "office_senior_members" ("id","user_id","lawyer_id","title") VALUES ($1,$2,$3,$4)`, officeId('senior'), data.userId ?? null, data.lawyerId ?? null, data.title ?? 'إدارة عليا');
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'senior_remove') {
    const id = z.string().parse(body.id); await prisma.$executeRawUnsafe(`DELETE FROM "office_senior_members" WHERE "id"=$1`, id); return NextResponse.json({ ok: true });
  }
  if (body.action === 'finance_admin_add') {
    const data = z.object({ lawyerId:z.string(), branchId:z.string() }).parse(body);
    const lawyer = await prisma.$queryRawUnsafe<Array<{id:string;active:boolean}>>('SELECT "id","active" FROM "lawyers" WHERE "id"=$1 LIMIT 1',data.lawyerId);
    if (!lawyer[0] || !lawyer[0].active) return NextResponse.json({ error: 'الزميل غير موجود أو غير نشط' }, { status: 404 });
    await prisma.$executeRawUnsafe('DELETE FROM "office_branch_managers" WHERE ("lawyer_id"=$1 AND "manager_type"=\'FINANCE_MANAGER\') OR ("branch_id"=$2 AND "manager_type"=\'FINANCE_MANAGER\')',data.lawyerId,data.branchId);
    await prisma.$executeRawUnsafe('INSERT INTO "office_branch_lawyers" ("branch_id","lawyer_id") VALUES ($1,$2) ON CONFLICT DO NOTHING',data.branchId,data.lawyerId);
    await prisma.$executeRawUnsafe('INSERT INTO "office_branch_managers" ("id","branch_id","manager_type","lawyer_id") VALUES ($1,$2,\'FINANCE_MANAGER\',$3)',officeId('finance_admin'),data.branchId,data.lawyerId);
    await prisma.$executeRawUnsafe('INSERT INTO "office_finance_members" ("id","lawyer_id") VALUES ($1,$2) ON CONFLICT ("lawyer_id") DO NOTHING',officeId('finance_legacy'),data.lawyerId);
    const identity = await prisma.$queryRawUnsafe<Array<{id:string;role:string}>>('SELECT u."id",u."role" FROM "users" u JOIN "lawyers" l ON lower(u."email")=lower(COALESCE(l."googleEmail",l."email")) WHERE l."id"=$1 LIMIT 1',data.lawyerId);
    if(!identity[0]){
      const lawyerEmail = await prisma.$queryRawUnsafe<Array<{email:string|null;googleEmail:string|null;fullName:string}>>('SELECT "email","googleEmail","fullName" FROM "lawyers" WHERE "id"=$1 LIMIT 1',data.lawyerId);
      const email=(lawyerEmail[0]?.googleEmail||lawyerEmail[0]?.email||'').trim().toLowerCase();
      if(email) await prisma.user.create({data:{name:lawyerEmail[0].fullName,email,passwordHash:bcrypt.hashSync(crypto.randomBytes(32).toString('base64url'),10),role:'VIEWER'}}).catch(()=>undefined);
    }
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'finance_admin_remove') {
    const id = z.string().parse(body.id);
    const rows = await prisma.$queryRawUnsafe<Array<{lawyer_id:string|null}>>('SELECT "lawyer_id" FROM "office_branch_managers" WHERE "id"=$1 AND "manager_type"=\'FINANCE_MANAGER\' LIMIT 1', id);
    await prisma.$executeRawUnsafe(`DELETE FROM "office_branch_managers" WHERE "id"=$1 AND "manager_type"='FINANCE_MANAGER'`, id);
    if(rows[0]?.lawyer_id) await prisma.$executeRawUnsafe(`DELETE FROM "office_finance_members" WHERE "lawyer_id"=$1`, rows[0].lawyer_id);
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'lawyer_add') {
    const data = z.object({ fullName:z.string().min(3).max(120), title:z.enum(['DOCTOR','ADVOCATE']), phone:z.string().min(6).max(20), email:z.string().email().max(120).optional(), specialization:z.string().max(200).optional(), bio:z.string().max(2000).optional(), position:z.string().max(120).optional() }).parse(body);
    const slug = await uniqueSlug(slugify(data.fullName));
    const email = data.email?.trim().toLowerCase() || null;
    const lawyer = await prisma.lawyer.create({ data:{ slug, fullName:data.fullName.trim(), title:data.title, phone:data.phone.trim(), email, googleEmail:email, specialization:data.specialization?.trim()||null, bio:data.bio?.trim()||null, position:data.position?.trim()||null, profilePhotoUrl:null, coverPhotoUrl:null, approvedAt:new Date(), active:true } });
    const scope = await getBranchScope(session);
    const requestedBranch = typeof body.branchId==='string' ? body.branchId : null;
    const branchId = (scope.allBranches ? (requestedBranch||'branch_main') : scope.officeManagerBranchIds[0]) || null;
    if (branchId) await prisma.$executeRawUnsafe('INSERT INTO "office_branch_lawyers" ("branch_id","lawyer_id") VALUES ($1,$2) ON CONFLICT DO NOTHING',branchId,lawyer.id);
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
    if(entry.entity_type==='client')await prisma.$executeRawUnsafe(`UPDATE "clients" SET "status"=COALESCE(NULLIF($2,''),'MAIN'),"archived_at"=NULL,"rejection_reason"=NULL,"updatedAt"=NOW() WHERE "id"=$1`,entry.entity_id,String(entry.snapshot_json?.status||'MAIN')); else if(entry.entity_type==='lawyer')await prisma.$executeRawUnsafe(`UPDATE "lawyers" SET "active"=true,"updatedAt"=NOW() WHERE "id"=$1`,entry.entity_id); else if(entry.entity_type==='case')await prisma.$executeRawUnsafe(`UPDATE "case_records" SET "archived_at"=NULL WHERE "id"=$1`,entry.entity_id); else if(entry.entity_type==='file')await prisma.$executeRawUnsafe(`UPDATE "client_files" SET "deleted_at"=NULL WHERE "id"=$1`,entry.entity_id); else if(entry.entity_type==='task')await prisma.$executeRawUnsafe(`UPDATE "tasks" SET "status"=COALESCE(NULLIF($2,''),'PENDING'),"updatedAt"=NOW() WHERE "id"=$1`,entry.entity_id,String(entry.snapshot_json?.status||'PENDING')); else if(entry.entity_type==='expense')await prisma.$executeRawUnsafe(`INSERT INTO "office_expenses" ("id","description","category","amount","status","created_by_user_id","created_by_lawyer_id","created_at","paid_at") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT ("id") DO NOTHING`,entry.entity_id,String(entry.snapshot_json?.description||'مصروف مسترجع'),entry.snapshot_json?.category??null,Number(entry.snapshot_json?.amount||0),String(entry.snapshot_json?.status||'PENDING'),entry.snapshot_json?.created_by_user_id??null,entry.snapshot_json?.created_by_lawyer_id??null,entry.snapshot_json?.created_at||new Date(),entry.snapshot_json?.paid_at||null);
    await prisma.$executeRawUnsafe(`UPDATE "office_archive" SET "restored_at"=NOW(),"restored_by_user_id"=$2 WHERE "id"=$1`,id,session.role==='admin'?session.userId:null); return NextResponse.json({ok:true});
  }
  if (body.action === 'expense_add') { const data=z.object({description:z.string().min(2).max(500),category:z.string().max(120).optional(),amount:z.number().nonnegative(),branchId:z.string().optional()}).parse(body); const scope=await getBranchScope(session); const branchId=scope.allBranches?(data.branchId||'branch_main'):scope.financeManagerBranchIds[0]; if(!branchId)return NextResponse.json({error:'يجب تحديد الفرع'},{status:400}); await prisma.$executeRawUnsafe(`INSERT INTO "office_expenses" ("id","branch_id","description","category","amount","status","created_by_user_id","created_by_lawyer_id") VALUES ($1,$2,$3,$4,$5,'PENDING',$6,$7)`,officeId('expense'),branchId,data.description,data.category??null,data.amount,session.role==='admin'?session.userId:null,session.role==='lawyer'?session.lawyerId:null); return NextResponse.json({ok:true}); }
  if (body.action === 'expense_mark_paid') { const id=z.string().parse(body.id); await prisma.$executeRawUnsafe(`UPDATE "office_expenses" SET "status"='PAID',"paid_at"=NOW() WHERE "id"=$1`,id); return NextResponse.json({ok:true}); }
  if (body.action === 'expense_delete') { const id=z.string().parse(body.id); const row=await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "office_expenses" WHERE "id"=$1 LIMIT 1`,id); if(row[0]) await prisma.$executeRawUnsafe(`INSERT INTO "office_archive" ("id","entity_type","entity_id","label","snapshot_json","deleted_by_user_id","deleted_by_lawyer_id") VALUES ($1,'expense',$2,$3,$4::jsonb,$5,$6)`,officeId('archive'),id,String(row[0].description),JSON.stringify(row[0]),session.role==='admin'?session.userId:null,session.role==='lawyer'?session.lawyerId:null); await prisma.$executeRawUnsafe(`DELETE FROM "office_expenses" WHERE "id"=$1`,id); return NextResponse.json({ok:true}); }
  if (body.action === 'due_add') { const data=z.object({lawyerId:z.string().optional(),branchId:z.string().optional(),description:z.string().min(2),amount:z.number().nonnegative()}).parse(body); const branchId=(await getBranchScope(session)).allBranches?(data.branchId||'branch_main'):(await getBranchScope(session)).financeManagerBranchIds[0]; if(!branchId)return NextResponse.json({error:'يجب تحديد الفرع'},{status:400}); await prisma.$executeRawUnsafe(`INSERT INTO "financial_dues" ("id","lawyer_id","branch_id","description","amount") VALUES ($1,$2,$3,$4,$5)`,officeId('due'),data.lawyerId??null,branchId,data.description,data.amount); return NextResponse.json({ok:true}); }
  return NextResponse.json({error:'إجراء غير معروف'},{status:400});
}
