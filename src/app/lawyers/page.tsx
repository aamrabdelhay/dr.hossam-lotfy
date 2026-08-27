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
          where: {
            task: {
              status: { notIn: ['COMPLETED', 'CANCELLED'] },
              OR: [{ scheduledDate: { gte: new Date() } }, { scheduledDate: null }],
            },
          },
        },
        comments: {},
      },
    }),
    getSidebarData(),
    getCurrentUser(),
  ]);

  const sorted = [...lawyers].sort((a, b) => Number(b.isPrincipal) - Number(a.isPrincipal) || a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] gap-5 px-4 py-5 sm:px-6">
      <aside className="hidden w-[330px] shrink-0 lg:block">
        <div className="sticky top-[88px]">
          <SessionSidebar data={sidebar} isAdmin={session?.role === 'admin'} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-5">
          <h1 className="text-xl font-extrabold text-navy-950">المحامون</h1>
          <p className="mt-1 text-[13px] font-medium text-navy-400">
            فريق المكتب — اضغط على أي محامي لفتح صفحته ومتابعة مهامه ونشاطه.
          </p>
        </div>

        {sorted.length === 0 ? (
          <EmptyState title="لم يتم إضافة محامين بعد" hint="يضيف المسؤول المحامين من منطقة الإدارة." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((l) => (
              <Link key={l.id} href={`/lawyers/${l.slug}`} className="group">
                <Card className={`card-hover h-full p-5 ${l.isPrincipal ? 'border-gold-500/60 shadow-[0_0_0_1px_rgba(212,169,63,0.3)]' : 'hover:border-gold-500/50'}`}>
                  <div className="flex items-start gap-4">
                    <Avatar name={l.fullName} src={l.profilePhotoUrl} size={64} ring={l.isPrincipal} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[15px] font-extrabold text-navy-950 group-hover:underline">{l.fullName}</p>
                        {l.isPrincipal && <Badge tone="gold">رئيس المكتب</Badge>}
                      </div>
                      <p className="mt-0.5 text-[12px] font-bold text-navy-400">{TITLE_LABEL[l.title]}</p>
                      {l.specialization && (
                        <p className="mt-1.5 flex items-center gap-1 truncate text-[11.5px] font-semibold text-navy-500">
                          <Briefcase size={11} className="shrink-0 text-gold-600" />
                          {l.specialization}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-navy-100 pt-3">
                    {l.phone && (
                      <span className="flex items-center gap-1.5 font-latin text-[12px] font-semibold text-navy-500" dir="ltr">
                        <Phone size={12} className="text-gold-600" />
                        {l.phone}
                      </span>
                    )}
                    <span className="ms-auto text-[11px] font-bold text-navy-300">
                      {l.assignments.length > 0 ? (
                        <Badge tone="gold">{l.assignments.length} مهمة قادمة</Badge>
                      ) : (
                        'لا مهام قادمة'
                      )}
                    </span>
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
