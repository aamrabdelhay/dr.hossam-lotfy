import type { Metadata } from 'next';
import Link from 'next/link';
import { Phone, Briefcase } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSidebarData } from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { SessionSidebar } from '@/components/session-sidebar';
import { Avatar, Badge, Card, EmptyState } from '@/components/ui';
import { TITLE_LABEL } from '@/lib/constants';

export const metadata: Metadata = { title: 'المحامون' };

export default async function LawyersPage() {
  const [lawyers, sidebar, session] = await Promise.all([
    prisma.lawyer.findMany({
      where: { active: true, approvedAt: { not: null } },
      orderBy: [{ sortOrder: 'asc' }, { fullName: 'asc' }],
      include: {
        assignments: {
          where: { task: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, OR: [{ scheduledDate: { gte: new Date() } }, { scheduledDate: null }] } },
        },
        comments: {},
      },
    }),
    getSidebarData(),
    getCurrentUser(),
  ]);

  const sorted = [...lawyers].sort((a, b) => Number(b.isPrincipal) - Number(a.isPrincipal) || a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] gap-5 px-3 py-4 sm:px-6 sm:py-5">
      <aside className="hidden w-[330px] shrink-0 lg:block"><div className="sticky top-[88px]"><SessionSidebar data={sidebar} isAdmin={session?.role === 'admin'} /></div></aside>
      <div className="min-w-0 flex-1">
        <div className="mb-5">
          <h1 className="text-xl font-extrabold text-navy-950">المحامون</h1>
          <p className="mt-1 text-[13px] font-medium leading-6 text-navy-400">فريق المكتب — اضغط على أي محامي لفتح صفحته ومتابعة مهامه ونشاطه.</p>
        </div>
        {sorted.length === 0 ? <EmptyState title="لم يتم إضافة محامين بعد" hint="يضيف المسؤول المحامين من منطقة الإدارة." /> : (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((l) => (
              <Link key={l.id} href={`/lawyers/${l.slug}`} className="group min-w-0">
                <Card className={`card-hover h-full p-4 sm:p-5 ${l.isPrincipal ? 'border-gold-500/60 shadow-[0_0_0_1px_rgba(212,169,63,0.3)]' : 'hover:border-gold-500/50'}`}>
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <div className="shrink-0"><Avatar name={l.fullName} src={l.profilePhotoUrl} size={56} ring={l.isPrincipal} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <p className="break-words text-[14px] font-extrabold leading-6 text-navy-950 group-hover:underline sm:text-[15px]">{l.fullName}</p>
                        {l.isPrincipal && <Badge tone="gold">رئيس المكتب</Badge>}
                      </div>
                      <p className="mt-0.5 text-[12px] font-bold text-navy-400">{TITLE_LABEL[l.title]}</p>
                      {l.specialization && <p className="mt-1.5 flex items-start gap-1 text-[11.5px] font-semibold leading-5 text-navy-500"><Briefcase size={11} className="mt-1 shrink-0 text-gold-600" /><span className="break-words">{l.specialization}</span></p>}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-3">
                    {l.phone && <span className="flex min-w-0 items-center gap-1.5 font-latin text-[12px] font-semibold text-navy-500" dir="ltr"><Phone size={12} className="shrink-0 text-gold-600" /><span className="break-all">{l.phone}</span></span>}
                    <span className="ms-auto max-w-full text-[11px] font-bold text-navy-300">{l.assignments.length > 0 ? <Badge tone="gold">{l.assignments.length} مهمة قادمة</Badge> : 'لا مهام قادمة'}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
