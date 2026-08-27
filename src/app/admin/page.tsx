import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAdminStats, getFeed, toTaskVM } from '@/lib/queries';
import { AdminShell } from '@/components/admin/admin-shell';
import { permissionsOf } from '@/lib/rbac';

export const metadata: Metadata = { title: 'منطقة الإدارة' };

export default async function AdminPage() {
  const session = await getCurrentUser();
  if (!session || session.role !== 'admin') {
    redirect('/admin/login');
  }

  const [stats, lawyers, locations, cases, feed, activity, notifications] = await Promise.all([
    getAdminStats(),
    prisma.lawyer.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { fullName: 'asc' }],
      include: {
        assignments: {
          where: {
            task: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, OR: [{ scheduledDate: { gte: new Date() } }, { scheduledDate: null }] },
          },
        },
      },
    }),
    prisma.location.findMany({
      select: {
        id: true, slug: true, name: true, nameEn: true, type: true, subType: true,
        governorate: true, city: true, district: true, address: true, phone: true, email: true,
        website: true, googleMapsUrl: true, workingHours: true, jurisdiction: true,
        distanceBucket: true, services: true, description: true,
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    }),
    prisma.caseRecord.findMany({ orderBy: { id: 'desc' }, take: 100 }),
    getFeed({ limit: 15 }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { lawyer: { select: { fullName: true, slug: true } } },
    }),
    prisma.notification.findMany({ where: { userId: session.userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);

  return (
    <Suspense fallback={null}>
      <AdminShell
        session={{ userId: session.userId, name: session.name, role: session.userRole }}
        permissions={permissionsOf(session.userRole)}
        stats={stats}
        lawyers={lawyers.map((l) => ({
          id: l.id,
          slug: l.slug,
          name: l.fullName,
          title: l.title,
          phone: l.phone,
          email: l.email,
          specialization: l.specialization,
          bio: l.bio,
          position: l.position,
          photo: l.profilePhotoUrl,
          isPrincipal: l.isPrincipal,
          active: l.active,
          upcoming: l.assignments.length,
        }))}
        locations={locations.map((l) => ({ ...l, type: l.type as string }))}
        cases={cases.map((c) => ({ id: c.id, name: c.name, number: c.number }))}
        feedTasks={feed.items.map((t) => t)}
        activity={activity.map((a) => ({ id: a.id, action: a.action, summary: a.summary, createdAt: a.createdAt.toISOString() }))}
        notifications={notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
          readAt: n.readAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </Suspense>
  );
}
