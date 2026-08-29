import type { Metadata } from 'next';
import Link from 'next/link';
import { Archive } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAdminStats, getFeed } from '@/lib/queries';
import { AdminShell } from '@/components/admin/admin-shell';
import { permissionsOf } from '@/lib/rbac';

export const metadata: Metadata = { title: 'منطقة الإدارة' };

export default async function AdminPage() {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');

  let adminIdentity: { userId: string; name: string; role: string } | null = null;
  if (session.role === 'admin') {
    adminIdentity = { userId: session.userId, name: session.name, role: session.userRole };
  } else if (session.isAdmin) {
    const email = (await prisma.lawyer.findUnique({ where: { id: session.lawyerId }, select: { email: true, googleEmail: true } }))?.googleEmail || (await prisma.lawyer.findUnique({ where: { id: session.lawyerId }, select: { email: true } }))?.email;
    if (email) {
      const account = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() }, select: { id: true, name: true, role: true } });
      if (account && (account.role === 'SUPER_ADMIN' || account.role === 'ADMIN')) adminIdentity = { userId: account.id, name: session.name, role: 'SUPER_ADMIN' };
    }
  }
  if (!adminIdentity) redirect('/');

  const [stats, lawyers, locations, cases, feed, activity, notifications] = await Promise.all([
    getAdminStats(),
    prisma.lawyer.findMany({
      orderBy: [{ sortOrder: 'asc' }, { fullName: 'asc' }],
      include: { assignments: { where: { task: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, OR: [{ scheduledDate: { gte: new Date() } }, { scheduledDate: null }] } } } },
    }),
    prisma.location.findMany({
      select: { id: true, slug: true, name: true, nameEn: true, type: true, subType: true, governorate: true, city: true, district: true, workingHours: true, jurisdiction: true, distanceBucket: true, services: true, description: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    }),
    prisma.caseRecord.findMany({ orderBy: { id: 'desc' }, take: 100, include: { events: { orderBy: { createdAt: 'desc' }, take: 100 } } }),
    getFeed({ limit: 15 }),
    prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12, include: { lawyer: { select: { fullName: true, slug: true } } } }),
    prisma.notification.findMany({ where: { userId: adminIdentity.userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);

  return (
    <Suspense fallback={null}>
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-5 sm:px-6">
        <div className="mb-3 flex justify-start">
          <Link href="/admin/lawyers/archive" className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-[11px] font-extrabold text-navy-700 shadow-soft transition hover:border-gold-500 hover:text-gold-700">
            <Archive size={14} className="text-gold-600" />
            أرشيف المحامين المحذوفين
          </Link>
        </div>
      </div>
      <AdminShell
        session={adminIdentity}
        permissions={permissionsOf('SUPER_ADMIN')}
        stats={stats}
        lawyers={lawyers.map((l) => ({ id: l.id, slug: l.slug, name: l.fullName, title: l.title, phone: l.phone, email: l.email, googleEmail: l.googleEmail, approved: l.approvedAt != null, specialization: l.specialization, bio: l.bio, position: l.position, photo: l.profilePhotoUrl, isPrincipal: l.isPrincipal, active: l.active, upcoming: l.assignments.length }))}
        locations={locations.map((l) => ({ ...l, type: l.type as string }))}
        cases={cases.map((c) => ({ id: c.id, name: c.name, number: c.number, clientName: c.clientName, events: c.events.map((e) => ({ id: e.id, description: e.description, type: e.type, authorName: e.authorName, createdAt: e.createdAt.toISOString() })) }))}
        feedTasks={feed.items}
        activity={activity.map((a) => ({ id: a.id, action: a.action, summary: a.summary, createdAt: a.createdAt.toISOString() }))}
        notifications={notifications.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() }))}
      />
    </Suspense>
  );
}
