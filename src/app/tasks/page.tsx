import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TaskCreator } from '@/components/admin/task-creator';
import { Card } from '@/components/ui';
import { ClipboardList } from 'lucide-react';

export const metadata = { title: 'التكليفات' };

export default async function TasksPage() {
  const session = await getCurrentUser();
  if (!session) redirect('/auth');

  const admin = session.role === 'admin' || (session.role === 'lawyer' && session.isAdmin);
  const selfLawyer = session.role === 'lawyer' ? await prisma.lawyer.findUnique({ where: { id: session.lawyerId }, select: { id: true, fullName: true, isPrincipal: true } }) : null;
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
      <Card className="mb-5 overflow-hidden">
        <div className="bg-navy-950 px-5 py-5 text-right sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-gold-400 ring-1 ring-gold-500/30"><ClipboardList size={21} /></span>
            <div>
              <h1 className="text-xl font-extrabold text-ivory-50">التكليفات</h1>
              <p className="mt-1 text-xs font-semibold text-ivory-300">إضافة تكليف مباشرة بدون الدخول إلى قائمة الإدارة</p>
            </div>
          </div>
        </div>
      </Card>

      <TaskCreator
        open
        onClose={() => undefined}
        locations={locations.map((l) => ({ ...l, type: l.type as string }))}
        lawyers={lawyers.map((l) => ({ id: l.id, name: l.fullName, isPrincipal: l.isPrincipal }))}
        cases={cases}
        ownPost={!admin}
      />
    </div>
  );
}
