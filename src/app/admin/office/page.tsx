import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAllBranches, getBranchScope } from '@/lib/branch-access';
import { isSeniorManagement, isFinanceManagement, isOfficeManager } from '@/lib/office-workflow';
import { OfficeManagementClient } from '@/components/admin/office-management-client';
import { RequestGroupsClient } from '@/components/admin/request-groups-client';
import { FinanceManagementClient } from '@/components/admin/finance-management-client';
import { SeniorAdminActions } from '@/components/admin/senior-admin-actions';

export const metadata: Metadata = { title: 'Loutfi Law Firm — مركز الإدارة' };

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
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6" dir="rtl">
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/archives" className="text-xs font-bold text-gold-700 hover:text-gold-800">
            الأرشيف العام
          </Link>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-navy-950">مركز إدارة Loutfi Law Firm</h1>
        <p className="mt-1 text-sm font-medium text-navy-400">
          اختر الفرع أولاً لفتح لوحة بياناته.
        </p>
      </div>

      <section className="mb-6 rounded-3xl border border-gold-200 bg-gradient-to-l from-white to-gold-50/40 p-5">
        <div className="mb-4">
          <h2 className="text-base font-black text-navy-950">اختر المكتب أو الفرع</h2>
          <p className="mt-1 text-[11px] font-semibold text-navy-400">
            كل فرع يفتح لوحة مستقلة بالموظفين والعملاء والقضايا والجلسات والإشعارات.
          </p>
        </div>

        {branches.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <Link
                key={branch.id}
                href={'/admin/office/branches/' + branch.id}
                className="group rounded-2xl border border-navy-100 bg-white p-4 text-right transition hover:border-gold-400 hover:shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-navy-950 group-hover:text-gold-700">{branch.name_ar}</p>
                    <p className="mt-1 text-[10px] font-semibold text-navy-400">{branch.address}</p>
                  </div>
                  <span className="rounded-full bg-gold-500/10 px-2.5 py-1 text-[9px] font-black text-gold-700">
                    {branch.is_main ? 'المقر الرئيسي' : 'فرع'}
                  </span>
                </div>
                <span className="mt-3 inline-flex rounded-full bg-navy-950 px-3 py-1.5 text-[10px] font-extrabold text-white">
                  فتح الفرع
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-navy-200 p-6 text-center text-sm font-bold text-navy-400">
            لا توجد فروع متاحة لهذا الحساب.
          </div>
        )}
      </section>

      {senior || officeManager ? (
        <div className="space-y-6">
          {senior && (
            <>
              <SeniorAdminActions />
              <RequestGroupsClient />
            </>
          )}
          <OfficeManagementClient />
        </div>
      ) : (
        <FinanceManagementClient canManage={finance} />
      )}
    </main>
  );
}
