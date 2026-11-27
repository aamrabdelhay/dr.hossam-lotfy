import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { WalletCards, ShieldCheck } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSeniorManagement, isFinanceManagement } from '@/lib/office-workflow';
import { ProfileRequests } from '@/components/profile-requests';

export const metadata: Metadata = { title: 'الطلبات والمستحقات المالية' };
export const dynamic = 'force-dynamic';
const STATUS: Record<string, string> = { PENDING: 'معلّق', APPROVED: 'تمت الموافقة', REJECTED: 'مرفوض', PAID: 'مدفوع' };
const money = (n: unknown) => `${Number(n || 0).toLocaleString('ar-EG')} جنيه`;

export default async function MyFinancePage() {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');
  const [senior, finance] = await Promise.all([isSeniorManagement(session), isFinanceManagement(session)]);
  // Only the signed-in person's own rows are read here.
  const mine = session.role === 'lawyer'
    ? await prisma.$queryRawUnsafe<any[]>(`SELECT "id","title","reason","status","payload_json","created_at" FROM "office_requests" WHERE "type"='FINANCE' AND "requested_by_lawyer_id"=$1 ORDER BY "created_at" DESC LIMIT 50`, session.lawyerId).catch(() => [])
    : await prisma.$queryRawUnsafe<any[]>(`SELECT "id","title","reason","status","payload_json","created_at" FROM "office_requests" WHERE "type"='FINANCE' AND "requested_by_user_id"=$1 ORDER BY "created_at" DESC LIMIT 50`, session.userId).catch(() => []);
  const dues = session.role === 'lawyer'
    ? await prisma.$queryRawUnsafe<any[]>(`SELECT "id","description","amount","status","created_at" FROM "financial_dues" WHERE "lawyer_id"=$1 ORDER BY "created_at" DESC LIMIT 50`, session.lawyerId).catch(() => [])
    : [];
  const open = dues.filter((d) => d.status !== 'PAID').reduce((s, d) => s + Number(d.amount || 0), 0);
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5" dir="rtl">
      <div className="flex items-center gap-2"><WalletCards size={20} className="text-gold-600" /><h1 className="text-xl font-extrabold text-navy-950">الطلبات والمستحقات المالية</h1></div>
      {(senior || finance) && <Link href="/admin/finance" className="flex items-center gap-2 rounded-2xl bg-navy-950 p-4 text-sm font-extrabold text-white"><ShieldCheck size={18} className="text-gold-400" />فتح الإدارة المالية</Link>}
      <ProfileRequests only="FINANCE" />
      <section className="rounded-2xl border border-navy-100 bg-white p-4">
        <h2 className="mb-3 text-base font-extrabold text-navy-950">طلباتي</h2>
        {!mine.length ? <p className="text-sm text-navy-400">لا توجد طلبات.</p> : <div className="space-y-2">{mine.map((r) => <div key={r.id} className="rounded-xl border border-navy-100 p-3 text-xs"><div className="flex justify-between gap-2"><b>{r.title}</b><span className="font-bold text-gold-700">{STATUS[r.status] || r.status}</span></div><div className="mt-1 text-navy-500">{r.payload_json?.amount !== undefined ? money(r.payload_json.amount) + ' · ' : ''}{new Date(r.created_at).toLocaleDateString('ar-EG')}</div>{r.reason && <p className="mt-1 text-navy-600">{r.reason}</p>}</div>)}</div>}
      </section>
      {session.role === 'lawyer' && (
        <section className="rounded-2xl border border-navy-100 bg-white p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-extrabold text-navy-950">مستحقاتي</h2><b className="text-gold-700">{money(open)}</b></div>
          {!dues.length ? <p className="text-sm text-navy-400">لا توجد مستحقات.</p> : <div className="space-y-2">{dues.map((d) => <div key={d.id} className="flex justify-between gap-2 rounded-xl border border-navy-100 p-3 text-xs"><div><b>{d.description}</b><div className="text-navy-400">{new Date(d.created_at).toLocaleDateString('ar-EG')}</div></div><div className="text-end"><b>{money(d.amount)}</b><div className="text-navy-400">{STATUS[d.status] || d.status}</div></div></div>)}</div>}
        </section>
      )}
    </main>
  );
}
