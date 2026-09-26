import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { isSeniorManagement, isFinanceManagement, isOfficeManager } from '@/lib/office-workflow';
import { OfficeManagementClient } from '@/components/admin/office-management-client';
import { RequestGroupsClient } from '@/components/admin/request-groups-client';
import { FinanceManagementClient } from '@/components/admin/finance-management-client';
import { SeniorAdminActions } from '@/components/admin/senior-admin-actions';

export const metadata: Metadata = { title: 'أدوات الإدارة العامة' };

export default async function OfficeControlPage() {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');

  const senior = await isSeniorManagement(session);
  const finance = await isFinanceManagement(session);
  const officeManager = await isOfficeManager(session);
  if (!senior && !finance && !officeManager) redirect('/');

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6" dir="rtl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[1.5px] text-gold-700">الإدارة</p>
          <h1 className="mt-2 text-2xl font-extrabold text-navy-950">أدوات الإدارة العامة</h1>
          <p className="mt-1 text-sm font-medium text-navy-400">إدارة الصلاحيات والفروع والطلبات والحسابات وأقسام القضايا.</p>
        </div>
        <Link href="/admin/office" className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-[11px] font-bold text-navy-600">
          <ArrowRight size={14}/> العودة لاختيار الفروع
        </Link>
      </div>
      <div className="mb-5 rounded-2xl border border-gold-200 bg-gold-50/40 p-4 text-xs font-bold text-navy-700">
        <ShieldCheck size={15} className="me-2 inline text-gold-700"/> هذه الصفحة للإعدادات والإجراءات العامة؛ بيانات كل فرع موجودة داخل صفحة الفرع نفسها.
      </div>
      {senior || officeManager ? (
        <div className="space-y-6">
          {senior && <><SeniorAdminActions /><RequestGroupsClient /></>}
          <OfficeManagementClient />
        </div>
      ) : (
        <FinanceManagementClient canManage={finance} />
      )}
    </main>
  );
}
