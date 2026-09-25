import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, Bell, BriefcaseBusiness, MapPin, Users, WalletCards, UserRound } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getBranchScope, hasBranchAccess, branchSummary } from '@/lib/branch-access';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
import { Card, EmptyState } from '@/components/ui';

export const metadata: Metadata = { title: 'تفاصيل الفرع' };

export default async function BranchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');
  const { id } = await params;
  const senior = await isSeniorManagement(session);
  if (!senior && !(await hasBranchAccess(session, id, 'office'))) redirect('/admin/office');

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
            {summary.lawyers.length===0 ? <EmptyState title="لا يوجد محامون مرتبطون بهذا الفرع."/> : <div className="space-y-2">{summary.lawyers.map((l:any)=><Link key={l.id} href={'/lawyers/'+(l.slug ?? l.id)} className="flex items-center gap-3 rounded-xl border border-navy-100 px-3 py-3 hover:bg-ivory-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-950 text-gold-400"><UserRound size={15}/></span><div className="min-w-0"><p className="truncate text-xs font-extrabold text-navy-900">{l.fullName}</p><p className="mt-1 text-[10px] text-navy-400">{l.title ?? 'محامٍ'}</p></div></Link>)}</div>}
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-navy-950"><WalletCards size={17} className="text-gold-600"/>إدارة الفرع</h2>
            <div className="space-y-2">
              <div className="rounded-xl bg-ivory-50 px-3 py-3 text-xs"><span className="font-bold text-navy-400">مدير المكتب</span><p className="mt-1 font-extrabold text-navy-900">{officeManager?.lawyer_name || officeManager?.user_name || 'غير محدد'}</p></div>
              <div className="rounded-xl bg-ivory-50 px-3 py-3 text-xs"><span className="font-bold text-navy-400">المدير المالي</span><p className="mt-1 font-extrabold text-navy-900">{financeManager?.lawyer_name || financeManager?.user_name || 'غير محدد'}</p></div>
            </div>
          </Card>
        </section>

        <section className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="border-b border-navy-100 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-extrabold text-navy-950"><BriefcaseBusiness size={17} className="text-gold-600"/>قضايا الفرع</h2><p className="mt-1 text-[11px] text-navy-400">قضايا المكتب الحالية والمحفوظة ضمن هذا الفرع.</p></div>
            {summary.cases.length===0 ? <div className="p-8"><EmptyState title="لا توجد قضايا مرتبطة بهذا الفرع." hint="يمكن ربط القضايا بالفرع من مركز الإدارة." /></div> : <div className="divide-y divide-navy-100">{summary.cases.map((c:any)=><Link key={c.id} href={'/cases/'+c.id} className="flex items-center gap-3 px-5 py-4 hover:bg-ivory-50"><span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-gold-500/10 px-2 text-[10px] font-black text-gold-700">{c.number ?? '#'}</span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-navy-900">{c.name}</p><p className="mt-1 text-[10px] text-navy-400">{c.number}{c.clientName ? ' — ' + c.clientName : ''}</p></div></Link>)}</div>}
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
