import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, Bell, BriefcaseBusiness, MapPin, Users, WalletCards, UserRound, FolderTree, FileText, CalendarDays } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getBranchScope, hasBranchAccess, branchSummary, getAllBranches } from '@/lib/branch-access';
import { getLawyerManagementLabels, isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
import { Card, EmptyState } from '@/components/ui';

export const metadata: Metadata = { title: 'تفاصيل الفرع' };

export default async function BranchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');
  const { id } = await params;
  const senior = await isSeniorManagement(session);
  if (!senior && !(await hasBranchAccess(session, id, 'office'))) redirect('/admin/office');

  const allBranches = await getAllBranches();
  const summary = await branchSummary(id);
  if (!summary) notFound();

  const managerRows = await prisma.$queryRawUnsafe<Array<{ id:string; manager_type:string; lawyer_id:string|null; user_id:string|null; lawyer_name:string|null; user_name:string|null }>>(
    'SELECT m."id",m."manager_type",m."lawyer_id",m."user_id",l."fullName" AS "lawyer_name",u."name" AS "user_name" FROM "office_branch_managers" m LEFT JOIN "lawyers" l ON l."id"=m."lawyer_id" LEFT JOIN "users" u ON u."id"=m."user_id" WHERE m."branch_id"=$1 ORDER BY m."manager_type"',
    id,
  );
  const lawyerIds = summary.lawyers.map((l:any) => l.id);
  const userIds = managerRows.map(m => m.user_id).filter((x): x is string => !!x);
  const notifications = lawyerIds.length || userIds.length
    ? await prisma.notification.findMany({
        where: { OR: [
          ...(lawyerIds.length ? [{ lawyerId: { in: lawyerIds } }] : []),
          ...(userIds.length ? [{ userId: { in: userIds } }] : []),
        ] },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { lawyer: { select: { fullName: true } }, user: { select: { name: true } } },
      })
    : [];

  const officeManager = managerRows.find(m => m.manager_type === 'OFFICE_MANAGER');
  const financeManager = managerRows.find(m => m.manager_type === 'FINANCE_MANAGER');
  const management = await getLawyerManagementLabels(lawyerIds);
  const caseRows = await prisma.$queryRawUnsafe<any[]>('SELECT cr."id",cr."name",cr."number",cr."clientName",cr."clientId",cr."category_id",cat."name_ar" AS "category_name" FROM "case_records" cr LEFT JOIN "office_case_categories" cat ON cat."id"=cr."category_id" WHERE COALESCE(cr."branch_id",$1)=$1 AND cr."archived_at" IS NULL ORDER BY cat."sort_order" NULLS LAST,cr."id" DESC',id);
  const caseGroups = caseRows.reduce((groups:any[],row:any)=>{const key=row.category_id||'uncategorized';let group=groups.find((x:any)=>x.id===key);if(!group){group={id:key,name:row.category_name||'قضايا غير مصنفة',cases:[]};groups.push(group);}group.cases.push(row);return groups;},[]);

  return (
    <main dir="rtl" className="mx-auto w-full max-w-[1250px] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/office" className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-[11px] font-bold text-navy-600 shadow-soft"><ArrowRight size={14}/> الرجوع إلى مركز الإدارة</Link>
        <Link href="/admin?tab=lawyers" className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-[11px] font-bold text-navy-600"><Users size={14}/> كل المحامين</Link>
      </div>

      <Card className="mb-5 overflow-hidden border-gold-200">
        <div className="bg-navy-950 px-6 py-7 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black tracking-[1.5px] text-gold-300">فرع المكتب</p>
              <p className="mt-2 inline-flex rounded-full bg-gold-500/15 px-3 py-1.5 text-[10px] font-black text-gold-300">أنت الآن داخل هذا الفرع</p>
              <h1 className="mt-2 text-2xl font-extrabold">{summary.branch.name_ar}</h1>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ivory-300"><MapPin size={15} className="text-gold-400"/>{summary.branch.address}</p>
            </div>
            {summary.branch.is_main && <span className="rounded-full bg-gold-500/15 px-3 py-1.5 text-[10px] font-black text-gold-300">المقر الرئيسي</span>}
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <Card className="border-navy-100 p-4"><div className="flex items-center gap-2 text-navy-400"><Users size={15}/><span className="text-xs font-bold">محامو الفرع</span></div><p className="mt-2 text-2xl font-black text-navy-950">{summary.lawyers.length}</p></Card>
          <Card className="border-navy-100 p-4"><div className="flex items-center gap-2 text-navy-400"><BriefcaseBusiness size={15}/><span className="text-xs font-bold">قضايا الفرع</span></div><p className="mt-2 text-2xl font-black text-navy-950">{summary.cases.length}</p></Card>
          <Card className="border-navy-100 p-4"><div className="flex items-center gap-2 text-navy-400"><Bell size={15}/><span className="text-xs font-bold">إشعارات الفرع</span></div><p className="mt-2 text-2xl font-black text-navy-950">{notifications.length}</p></Card>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-navy-950"><Users size={17} className="text-gold-600"/>محامو الفرع</h2>
            {summary.lawyers.length===0 ? <EmptyState title="لا يوجد محامون مرتبطون بهذا الفرع."/> : <div className="space-y-2">{summary.lawyers.map((l:any)=><Link key={l.id} href={'/lawyers/'+(l.slug ?? l.id)} className="flex items-center gap-3 rounded-xl border border-navy-100 px-3 py-3 hover:bg-ivory-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-950 text-gold-400"><UserRound size={15}/></span><div className="min-w-0"><p className="truncate text-xs font-extrabold text-navy-900">{l.fullName}</p><p className="mt-1 text-[10px] text-navy-400">{l.title ?? 'محامٍ'}</p><div className="mt-1 flex flex-wrap gap-1">{(management[l.id]??[]).map((label)=><span key={label} className="rounded-full bg-gold-500/10 px-2 py-0.5 text-[8px] font-extrabold text-gold-700">{label}</span>)}</div></div></Link>)}</div>}
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-navy-950"><WalletCards size={17} className="text-gold-600"/>إدارة الفرع</h2>
            <div className="space-y-2">
              <div className="rounded-xl bg-ivory-50 px-3 py-3 text-xs"><span className="font-bold text-navy-400">مدير المكتب</span><p className="mt-1 font-extrabold text-navy-900">{officeManager?.lawyer_name || officeManager?.user_name || 'غير محدد'}</p></div>
              <div className="rounded-xl bg-ivory-50 px-3 py-3 text-xs"><span className="font-bold text-navy-400">المدير المالي</span><p className="mt-1 font-extrabold text-navy-900">{financeManager?.lawyer_name || financeManager?.user_name || 'غير محدد'}</p></div>
            </div>
          </Card>
        </section>

        <section className="lg:col-span-2 lg:col-start-2">
          <Card className="mb-5 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-navy-950"><Users size={17} className="text-gold-600"/>عملاء الفرع</h2>
            {summary.clients.length===0?<EmptyState title="لا يوجد عملاء مرتبطون بهذا الفرع."/>:<div className="grid gap-2 sm:grid-cols-2">{summary.clients.map((client:any)=><Link key={client.id} href={'/admin/clients/'+client.id} className="rounded-xl border border-navy-100 p-3 hover:bg-ivory-50"><p className="text-xs font-extrabold text-navy-900">{client.name}</p><p className="mt-1 text-[10px] text-navy-400">{client.phone||client.email||'بيانات الاتصال غير مسجلة'}</p></Link>)}</div>}
          </Card>
        </section>

        <section className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="border-b border-navy-100 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-extrabold text-navy-950"><FolderTree size={17} className="text-gold-600"/>قضايا الفرع حسب النوع</h2><p className="mt-1 text-[11px] text-navy-400">كل قسم يظهر فقط إذا كانت هناك قضية منه داخل الفرع.</p></div>
            {caseGroups.length===0 ? <div className="p-8"><EmptyState title="لا توجد قضايا مرتبطة بهذا الفرع." hint="يمكن ربط القضايا بالفرع من مركز الإدارة." /></div> : <div className="space-y-3 p-5">{caseGroups.map((group:any)=><section key={group.id} className="rounded-2xl border border-navy-100 bg-ivory-50 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-black text-navy-900">{group.name}</h3><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-navy-400">{group.cases.length}</span></div><div className="grid gap-2 md:grid-cols-2">{group.cases.map((c:any)=><Link key={c.id} href={'/cases/'+c.id} className="rounded-xl bg-white p-3 hover:bg-gold-50"><div className="flex items-start gap-2"><FileText size={14} className="mt-0.5 text-gold-600"/><div className="min-w-0"><p className="truncate text-xs font-extrabold text-navy-900">{c.name}</p><p className="mt-1 text-[10px] text-navy-400">{c.number}{c.clientName ? ' — ' + c.clientName : ''}</p></div></div></Link>)}</div></section>)}</div>}
          </Card>

          <Card className="mt-5 overflow-hidden">
            <div className="border-b border-navy-100 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-extrabold text-navy-950"><Bell size={17} className="text-gold-600"/>إشعارات الفرع</h2><p className="mt-1 text-[11px] text-navy-400">إشعارات محامي ومديري هذا الفرع فقط.</p></div>
            {notifications.length===0 ? <div className="p-8"><EmptyState title="لا توجد إشعارات لهذا الفرع حالياً." /></div> : <div className="divide-y divide-navy-100">{notifications.map(n=><div key={n.id} className="px-5 py-4"><div className="flex items-center gap-2"><Bell size={13} className="text-gold-600"/><p className="text-xs font-extrabold text-navy-900">{n.title}</p>{!n.readAt&&<span className="h-2 w-2 rounded-full bg-gold-500"/>}</div>{n.body&&<p className="mt-1 text-[11px] leading-6 text-navy-500">{n.body}</p>}<p className="mt-1 text-[10px] text-navy-300">{n.lawyer?.fullName || n.user?.name || 'الإدارة'} — {n.createdAt.toLocaleString('ar-EG',{hour12:false})}</p></div>)}</div>}
          </Card>
        </section>
      </div>
    </main>
  );
}
