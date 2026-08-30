import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CalendarClient } from './calendar-client';
export const metadata: Metadata = { title: 'التقويم' };
export const dynamic = 'force-dynamic';
export default async function CalendarPage() {
  const session = await getCurrentUser();
  const isAdmin = !!session && (session.role === 'admin' || (session.role === 'lawyer' && session.isAdmin));
  const [locations, lawyers, cases] = await Promise.all([
    prisma.location.findMany({ select: { id: true, slug: true, name: true, type: true }, orderBy: [{ type: 'asc' }, { name: 'asc' }] }),
    prisma.lawyer.findMany({ where: { active: true, approvedAt: { not: null } }, select: { id: true, fullName: true, isPrincipal: true }, orderBy: [{ sortOrder: 'asc' }, { fullName: 'asc' }] }),
    prisma.caseRecord.findMany({ orderBy: { id: 'desc' }, take: 200 }),
  ]);
  return <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6"><CalendarClient isAdmin={isAdmin} locations={locations.map((l) => ({ id: l.id, slug: l.slug, name: l.name, type: l.type as string }))} lawyers={lawyers.map((l) => ({ id: l.id, name: l.fullName, isPrincipal: l.isPrincipal }))} cases={cases.map((c) => ({ id: c.id, name: c.name, number: c.number }))}/></div>;
}