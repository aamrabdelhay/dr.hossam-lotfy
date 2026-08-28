import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toTaskVM, type TaskVM } from '@/lib/queries';
import { TITLE_LABEL } from '@/lib/constants';
import { getSiteNav } from '@/lib/site-data';
import { LawyerProfileEditor } from '@/components/lawyer-profile-editor';
import { Composer } from '@/components/composer';
import { PostCard } from '@/components/post-card';

export const metadata: Metadata = { title: 'صفحة المحامي' };

function cleanDemo(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/\(تجريبي\)/g, '').replace(/\(تجريبية\)/g, '').replace(/\s{2,}/g, ' ').trim();
}

function getFeminineTitle(fullName: string, title: string): string {
  const lower = fullName.toLowerCase();
  if (lower.includes('mona') || lower.includes('sara') || fullName.includes('مونا') || fullName.includes('سارا')) return 'محامية';
  return TITLE_LABEL[title] ?? title;
}

export default async function LawyerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lawyer = await prisma.lawyer.findUnique({
    where: { slug },
    include: {
      assignments: {
        include: {
          task: {
            include: {
              location: true,
              caseRecord: true,
              author: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } },
              assignees: { select: { lawyer: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } }, completedAt: true } },
              comments: { select: { createdAt: true }, take: 1, orderBy: { createdAt: 'desc' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
    },
  });

  if (!lawyer) notFound();
  const session = await getCurrentUser();
  const isSelf = session?.role === 'lawyer' && session.lawyerId === lawyer.id;
  const isAdminSession = session?.role === 'admin';
  if (!lawyer.approvedAt && !isSelf && !isAdminSession) notFound();

  const nav = await getSiteNav();
  const tasks: TaskVM[] = lawyer.assignments.map((a) => toTaskVM(a.task as never));
  const activeTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED' || t.completedAt != null);
  const upcomingTasks = activeTasks.filter((t) => !t.scheduledDate || new Date(t.scheduledDate) >= new Date());
  const specialization = cleanDemo(lawyer.specialization) || '—';

  return (
    <main className="min-h-screen bg-[#F4F6F9]">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Lawyer identity — intentionally no initials/avatar card. */}
        <header className="mb-8 rounded-3xl border border-navy-100 bg-white px-5 py-7 shadow-card sm:px-8 sm:py-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-gold-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                LAWYER PROFILE
              </p>
              <h1 className="text-3xl font-bold leading-tight text-navy-950 sm:text-4xl" style={{ fontFamily: 'Inter, Cairo, sans-serif' }}>
                {lawyer.fullName}
              </h1>
              {(isSelf || isAdminSession) && lawyer.email && (
                <p className="mt-2 text-sm text-navy-400" dir="ltr" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {lawyer.email}
                </p>
              )}
              <p className="mt-3 text-sm text-navy-500" style={{ fontFamily: 'Cairo, sans-serif' }}>
                {getFeminineTitle(lawyer.fullName, lawyer.title)} · {specialization}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-gold-500/10 px-3 py-1.5 text-[11px] font-bold text-gold-700">مهام نشطة {activeTasks.length}</span>
              <span className="rounded-full bg-navy-900/5 px-3 py-1.5 text-[11px] font-bold text-navy-600">مكتملة {completedTasks.length}</span>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-700">قادمة {upcomingTasks.length}</span>
            </div>
          </div>

          {isSelf && (
            <div className="mt-6 border-t border-navy-100 pt-5">
              <LawyerProfileEditor
                lawyerId={lawyer.id}
                fullName={lawyer.fullName}
                phone={lawyer.phone}
                specialization={lawyer.specialization}
                bio={lawyer.bio}
                profilePhotoUrl={lawyer.profilePhotoUrl}
              />
            </div>
          )}
        </header>

        {/* Composer for the lawyer's own feed. */}
        {isSelf && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-950" style={{ fontFamily: 'Cairo, sans-serif' }}>إضافة مهمة</h2>
              <span className="text-[11px] text-navy-400">ستظهر كمشاركة في صفحتك</span>
            </div>
            <Composer lawyerName={lawyer.fullName} lawyerPhoto={lawyer.profilePhotoUrl} locations={nav.locations} />
          </section>
        )}

        {/* Facebook-style task feed */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-gold-600">OFFICE FEED</p>
              <h2 className="mt-1 text-xl font-bold text-navy-950" style={{ fontFamily: 'Cairo, sans-serif' }}>مهام ومواعيد المحامي</h2>
            </div>
            <span className="text-xs text-navy-400">{tasks.length} مشاركة</span>
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-navy-200 bg-white px-6 py-12 text-center text-sm text-navy-400 shadow-soft" style={{ fontFamily: 'Cairo, sans-serif' }}>
              لا توجد مهام أو مواعيد مسجلة لهذا المحامي حتى الآن.
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <PostCard
                  key={task.id}
                  task={task}
                  sessionRole={session?.role}
                  sessionLawyerId={session?.role === 'lawyer' ? session.lawyerId : undefined}
                  canWriteTasks={session?.role === 'admin' ? true : undefined}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
