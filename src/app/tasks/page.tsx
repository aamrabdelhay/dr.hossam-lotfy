import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TasksPageClient } from './tasks-page-client';

export const metadata = { title: 'التكليفات' };

export default async function TasksPage() {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');

  const admin = session.role === 'admin' || (session.role === 'lawyer' && session.isAdmin);
  const selfLawyer = session.role === 'lawyer'
    ? await prisma.lawyer.findUnique({ where: { id: session.lawyerId }, select: { id: true, fullName: true, isPrincipal: true } })
    : null;
  if (session.role === 'lawyer' && !selfLawyer) redirect('/');

  const [lawyers, locations, cases] = await Promise.all([
    admin
      ? prisma.lawyer.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { fullName: 'asc' }], select: { id: true, fullName: true, isPrincipal: true } })
      : Promise.resolve(selfLawyer ? [selfLawyer] : []),
    prisma.location.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }], select: { id: true, slug: true, name: true, nameEn: true, type: true, subType: true, governorate: true, city: true, district: true, workingHours: true, jurisdiction: true, distanceBucket: true, services: true, description: true } }),
    prisma.caseRecord.findMany({ orderBy: { id: 'desc' }, take: 200, select: { id: true, name: true, number: true } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
      <TasksPageClient
        locations={locations.map((location) => ({ ...location, type: location.type as string }))}
        lawyers={lawyers.map((lawyer) => ({ id: lawyer.id, name: lawyer.fullName, isPrincipal: lawyer.isPrincipal }))}
        cases={cases}
        ownPost={!admin}
      />
    </div>
  );
}
