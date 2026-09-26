import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, Building2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getAllBranches, getBranchScope } from '@/lib/branch-access';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
import { getFeed, type AdminStats } from '@/lib/queries';
import { AdminShell } from '@/components/admin/admin-shell';
import { permissionsOf } from '@/lib/rbac';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'إدارة الفرع' };

export default async function BranchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');
  const { id } = await params;
  const senior = await isSeniorManagement(session);
  const scope = await getBranchScope(session);
  const allBranches = await getAllBranches();
  const visibleBranches = scope.allBranches ? allBranches : allBranches.filter((b) => scope.branchIds.includes(b.id));
  const branch = allBranches.find((b) => b.id === id);
  if (!branch) notFound();
  if (!senior && !scope.branchIds.includes(id)) redirect('/admin/office');

  if (!senior) {
    return (
      <main dir="rtl" className="mx-auto w-full max-w-[1250px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-5"><Link href="/admin/office" className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-[11px] font-bold text-navy-600"><ArrowRight size={14} /> الرجوع إلى اختيار الفروع</Link></div>
        <section className="rounded-3xl border border-gold-200 bg-white p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-700"><Building2 size={17} /></span><div><p className="text-[10px] font-black text-gold-700">الفرع</p><h1 className="text-xl font-extrabold text-navy-950">{branch.name_ar}</h1><p className="mt-1 text-xs font-semibold text-navy-400">{branch.address}</p></div></div><p className="mt-5 text-sm leading-7 text-navy-600">هذا الحساب يملك إدارة هذا الفرع فقط.</p></section>
      </main>
    );
  }

  const adminIdentity = await getAdminIdentity(session);
  const [stats, taskIds, lawyers, locations, cases, categories, activity, notifications, feed] = await Promise.all([
    getBranchAdminStats(id),
    prisma.$queryRawUnsafe<string[]>('SELECT "id" FROM "tasks" WHERE "branch_id"=$1 ORDER BY "createdAt" DESC LIMIT 1000', id),
    prisma.$queryRawUnsafe<any[]>('SELECT l."id",l."slug",l."fullName",l."title",l."phone",l."email",l."googleEmail",l."specialization",l."bio",l."position",l."profilePhotoUrl" AS "photo",l."isPrincipal",l."active",l."approvedAt",COUNT(ta."id") FILTER (WHERE ta."completedAt" IS NULL AND t."status" NOT IN (\'CANCELLED\') AND (t."scheduledDate" >= CURRENT_DATE OR t."scheduledDate" IS NULL))::int AS "upcoming" FROM "office_branch_lawyers" bl INNER JOIN "lawyers" l ON l."id"=bl."lawyer_id" LEFT JOIN "task_assignments" ta ON ta."lawyerId"=l."id" LEFT JOIN "tasks" t ON t."id"=ta."taskId" AND t."branch_id"=$1 WHERE bl."branch_id"=$1 GROUP BY l."id",l."slug",l."fullName",l."title",l."phone",l."email",l."googleEmail",l."specialization",l."bio",l."position",l."profilePhotoUrl",l."isPrincipal",l."active",l."approvedAt" ORDER BY l."sortOrder",l."fullName"', id),
    prisma.$queryRawUnsafe<any[]>('SELECT "id","slug","name","nameEn","type","subType","governorate","city","district","workingHours","jurisdiction","distanceBucket","services","description" FROM "locations" ORDER BY "type","name"'),
    prisma.$queryRawUnsafe<any[]>('SELECT c."id",c."name",c."number",c."clientName",c."category_id",COALESCE(c."workflow_status",\'UNDER_REVIEW\') AS "workflow_status" FROM "case_records" c WHERE c."branch_id"=$1 ORDER BY c."id" DESC LIMIT 100', id),
    prisma.$queryRawUnsafe<any[]>('SELECT "id","name_ar","name_en","sort_order","active" FROM "office_case_categories" ORDER BY "sort_order","name_ar"'),
    prisma.activityLog.findMany({where:{OR:[...(taskIds.length?[{taskId:{in:taskIds}}]:[]),...(lawyers.length?[{lawyerId:{in:lawyers.map((l)=>l.id)}}]:[])]},orderBy:{createdAt:'desc'},take:50,include:{lawyer:{select:{fullName:true,slug:true}}}}),
    adminIdentity ? prisma.notification.findMany({where:{userId:adminIdentity.userId},orderBy:{createdAt:'desc'},take:30}) : [],
    getFeed({taskIds,limit:15}),
  ]);

  const caseIds = cases.map((c) => c.id);
  const eventRows = caseIds.length ? await prisma.$queryRawUnsafe<any[]>('SELECT "id","caseId","description","type","authorName","createdAt" FROM "case_events" WHERE "caseId"=ANY($1::text[]) ORDER BY "createdAt" DESC',caseIds) : [];
  const eventsByCase = new Map<string, any[]>();
  for (const event of eventRows) { const list = eventsByCase.get(event.caseId) ?? []; if (list.length < 100) list.push(event); eventsByCase.set(event.caseId,list); }

  const lawyerRows = lawyers.map((l) => ({id:l.id,slug:l.slug,name:l.fullName,title:l.title,phone:l.phone??null,email:l.email??null,googleEmail:l.googleEmail??null,approved:l.approvedAt!=null,specialization:l.specialization??null,bio:l.bio??null,position:l.position??null,photo:l.photo??null,isPrincipal:!!l.isPrincipal,active:!!l.active,upcoming:Number(l.upcoming??0),branchName:branch.name_ar}));

  return (
    <main dir="rtl" className="mx-auto w-full max-w-[1520px] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-200 bg-gold-50/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3"><Building2 size={17} className="shrink-0 text-gold-700"/><div className="min-w-0"><p className="text-[9px] font-black text-gold-700">الإدارة — الفرع الحالي</p><p className="truncate text-sm font-extrabold text-navy-950">{branch.name_ar}<span className="font-semibold text-navy-400"> — {branch.address}</span></p></div></div>
        <div className="flex flex-wrap gap-2">{visibleBranches.map((item)=><Link key={item.id} href={'/admin/office/branches/'+item.id} className={'rounded-full px-3 py-1.5 text-[10px] font-extrabold '+(item.id===id?'bg-navy-950 text-white':'bg-white text-navy-700 border border-navy-200 hover:bg-navy-50')}>{item.name_ar}</Link>)}<Link href="/admin/office" className="rounded-full border border-navy-200 bg-white px-3 py-1.5 text-[10px] font-extrabold text-navy-700">اختيار فرع</Link></div>
      </div>
      <AdminShell branchId={id} branchName={branch.name_ar} session={adminIdentity} permissions={permissionsOf('SUPER_ADMIN')} stats={stats} lawyers={lawyerRows}
        locations={locations.map((l)=>({...l,type:l.type as string}))}
        cases={cases.map((c)=>({id:c.id,name:c.name,number:c.number,clientName:c.clientName,category_id:c.category_id??null,events:(eventsByCase.get(c.id)??[]).map((e)=>({id:e.id,description:e.description,type:e.type,authorName:e.authorName,createdAt:new Date(e.createdAt).toISOString()}))}))}
        feedTasks={feed.items} categories={categories}
        activity={activity.map((a)=>({id:a.id,action:a.action,summary:a.summary,createdAt:a.createdAt.toISOString()}))}
        notifications={notifications.map((n)=>({id:n.id,type:n.type,title:n.title,body:n.body,link:n.link,readAt:n.readAt?.toISOString()??null,createdAt:n.createdAt.toISOString()}))}
      />
    </main>
  );
}

async function getAdminIdentity(session: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!session) throw new Error('Missing session');
  if (session.role === 'admin') return {userId:session.userId,name:session.name,role:session.userRole};
  const lawyer = await prisma.lawyer.findUnique({where:{id:session.lawyerId},select:{email:true,googleEmail:true}});
  const email=(lawyer?.googleEmail||lawyer?.email||'').trim().toLowerCase();
  if(email) {
    const account=await prisma.user.findUnique({where:{email},select:{id:true,name:true,role:true}});
    if(account&&['ADMIN','SUPER_ADMIN'].includes(account.role)) return {userId:account.id,name:session.name,role:account.role};
  }
  return {userId:session.lawyerId,name:session.name,role:'SUPER_ADMIN'};
}

async function getBranchAdminStats(branchId:string):Promise<AdminStats>{
  const today=new Date(); today.setHours(0,0,0,0);
  const d=(n:number)=>{const x=new Date(today);x.setDate(x.getDate()+n);return x;};
  const rows=await prisma.$queryRawUnsafe<any[]>(
    'SELECT COUNT(*) FILTER (WHERE "status" <> \'CANCELLED\' AND "scheduledDate" >= $2 AND "scheduledDate" < $3)::int AS "today", COUNT(*) FILTER (WHERE "status" <> \'CANCELLED\' AND "scheduledDate" >= $3 AND "scheduledDate" < $4)::int AS "tomorrow", COUNT(*) FILTER (WHERE "status" NOT IN (\'COMPLETED\',\'CANCELLED\') AND "scheduledDate" >= $3 AND "scheduledDate" < $5)::int AS "critical", COUNT(*) FILTER (WHERE "status" NOT IN (\'COMPLETED\',\'CANCELLED\') AND "scheduledDate" >= $6 AND "scheduledDate" < $7)::int AS "important", COUNT(*) FILTER (WHERE "status" NOT IN (\'COMPLETED\',\'CANCELLED\') AND "scheduledDate" >= $8 AND "scheduledDate" < $9)::int AS "upcoming30", COUNT(*) FILTER (WHERE "status" IN (\'PENDING\',\'IN_PROGRESS\'))::int AS "uncompleted", COUNT(*) FILTER (WHERE "status"=\'COMPLETED\')::int AS "completed" FROM "tasks" WHERE "branch_id"=$1',
    branchId,today,d(1),d(2),d(3),d(4),d(14),d(15),d(31)
  );
  const [casesCount,lawyersCount,locationsCount]=await Promise.all([
    prisma.$queryRawUnsafe<any[]>('SELECT COUNT(*)::int AS count FROM "case_records" WHERE "branch_id"=$1',branchId),
    prisma.$queryRawUnsafe<any[]>('SELECT COUNT(*)::int AS count FROM "office_branch_lawyers" WHERE "branch_id"=$1',branchId),
    prisma.location.count(),
  ]);
  const row=rows[0]??{};
  return {today:Number(row.today??0),tomorrow:Number(row.tomorrow??0),critical:Number(row.critical??0),important:Number(row.important??0),upcoming30:Number(row.upcoming30??0),uncompleted:Number(row.uncompleted??0),completed:Number(row.completed??0),lawyers:Number(lawyersCount[0]?.count??0),locations:Number(locationsCount),cases:Number(casesCount[0]?.count??0)};
}
