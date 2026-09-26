import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, ShieldCheck } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getAllBranches, getBranchScope } from '@/lib/branch-access';
import { isSeniorManagement, isFinanceManagement, isOfficeManager } from '@/lib/office-workflow';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'مركز إدارة الفروع' };

export default async function OfficeManagementPage() {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');

  const senior = await isSeniorManagement(session);
  const finance = await isFinanceManagement(session);
  const officeManager = await isOfficeManager(session);
  if (!senior && !finance && !officeManager) redirect('/');

  const allBranches = await getAllBranches();
  const scope = await getBranchScope(session);
  const branches = senior ? allBranches : allBranches.filter((branch) => scope.branchIds.includes(branch.id));

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8" dir="rtl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black tracking-[1.5px] text-gold-700">إدارة الفروع</p>
          <h1 className="mt-2 text-2xl font-extrabold text-navy-950">اختر المكتب أو الفرع</h1>
          <p className="mt-1 text-sm font-medium text-navy-400">بعد اختيار الفرع ستفتح لك صفحته الكاملة بالموظفين والعملاء والقضايا والجلسات والإشعارات.</p>
        </div>
        {(senior || officeManager || finance) && (
          <Link href="/admin/office/control" className="inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-xs font-extrabold text-white">
            <ShieldCheck size={15}/> أدوات الإدارة العامة
          </Link>
        )}
      </div>

      {branches.length ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <Link key={branch.id} href={'/admin/office/branches/' + branch.id} className="group overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-soft transition hover:border-gold-400 hover:shadow-lift">
              <div className="bg-navy-950 p-5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-gold-300"><Building2 size={15}/><span className="text-[10px] font-black">Loutfi</span></div>
                    <h2 className="mt-2 text-lg font-black group-hover:text-gold-300">{branch.name_ar}</h2>
                    <p className="mt-1 text-[11px] text-ivory-300">{branch.address}</p>
                  </div>
                  {branch.is_main && <span className="rounded-full bg-gold-500/15 px-2.5 py-1 text-[9px] font-black text-gold-300">المقر الرئيسي</span>}
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-[11px] font-bold text-navy-500">فتح الصفحة الكاملة للفرع</span>
                <span className="rounded-full bg-gold-500/10 px-3 py-1.5 text-[10px] font-extrabold text-gold-700">فتح الفرع</span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-8 text-center text-sm font-bold text-navy-400">لا توجد فروع متاحة لهذا الحساب.</div>
      )}

      <div className="mt-6 rounded-2xl border border-gold-200 bg-gold-50/40 p-4 text-[11px] font-semibold leading-6 text-navy-600">
        أنت ترى فقط الفروع المسموح لك بإدارتها. الإدارة العليا ترى جميع الفروع.
      </div>
    </main>
  );
}