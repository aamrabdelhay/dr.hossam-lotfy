import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { isSeniorManagement, isFinanceManagement } from '@/lib/office-workflow';
import { FinanceHub } from '@/components/admin/finance-hub';

export const metadata: Metadata = { title: 'الإدارة المالية' };

export default async function AdminFinancePage() {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');
  const [senior, finance] = await Promise.all([isSeniorManagement(session), isFinanceManagement(session)]);
  if (!senior && !finance) redirect('/');
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6" dir="rtl">
      <Link href="/admin/office" className="mb-3 inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-[11px] font-bold text-navy-600"><ArrowRight size={14} /> الإدارة</Link>
      <FinanceHub canManage={senior || finance} canAssignMembers={senior} />
    </main>
  );
}
