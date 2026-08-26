import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Phone, Mail, Briefcase, CalendarClock, CheckCheck, PenLine, KeyRound } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSidebarData, getLawyerFeed, toTaskVM, type TaskVM } from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { SessionSidebar } from '@/components/session-sidebar';
import { PostCard } from '@/components/post-card';
import { Composer } from '@/components/composer';
import { SessionCard } from '@/components/session-card';
import { ActivityTimeline } from '@/components/activity-timeline';
import { Avatar, Badge, Card, EmptyState } from '@/components/ui';
import { TITLE_LABEL, LOCATION_TYPE_LABEL } from '@/lib/constants';

export const metadata: Metadata = { title: 'صفحة المحامي' };

export default async function LawyerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [lawyer, sidebar, session, navLocations] = await Promise.all([
    prisma.lawyer.findUnique({
      where: { slug },
      include: {
        assignments: {
          include: {
            task: {
              include: {
                location: true,
                caseRecord: true,
                author: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } },
                assignees: {
                  select: { lawyer: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } }, completedAt: true },
                },
                comments: { select: { createdAt: true }, take: 1, orderBy: { createdAt: 'desc' } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        activities: { orderBy: { createdAt: 'desc' }, take: 15 },
      },
    }),
    getSidebarData(),
    getCurrentUser(),
    prisma.location.findMany({ select: { id: true, slug: true, name: true, type: true }, orderBy: [{ type: 'asc' }, { name: 'asc' }] }),
  ]);

  if (!lawyer) notFound();

  const isMe = session?.role === 'lawyer' && session.lawyerId === lawyer.id;
  const isAdmin = session?.role === 'admin';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const allVMs: TaskVM[] = lawyer.assignments.map((a) => toTaskVM(a.task as never));
  const feedVMs = await getLawyerFeed(lawyer.id);
  const upcomingVMs = allVMs.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (t.scheduledDate == null || new Date(t.scheduledDate) >= today),
  );
  const completedVMs = allVMs.filter((t) => t.status === 'COMPLETED' || t.completedAt != null);

  const stats = [
    { label: 'جلسات قادمة', value: upcomingVMs.length, icon: CalendarClock },
    { label: 'مهام مسجلة', value: allVMs.length, icon: PenLine },
    { label: 'مهام مكتملة', value: completedVMs.length, icon: CheckCheck },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1440px] gap-5 px-4 py-5 sm:px-6">
      <aside className="hidden w-[330px] shrink-0 lg:block">
        <div className="sticky top-[84px]">
          <SessionSidebar data={sidebar} isAdmin={isAdmin} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Profile header */}
        <Card className="overflow-hidden">
          <div className="relative h-36 sm:h-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lawyer.coverPhotoUrl ?? '/cover.png'} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 to-transparent" />
            <div className="gold-hairline absolute inset-x-0 bottom-0" />
          </div>
          <div className="px-5 pb-5 sm:px-7">
            <div className="-mt-12 flex flex-wrap items-end gap-4 sm:-mt-14">
              <Avatar name={lawyer.fullName} src={lawyer.profilePhotoUrl} size={104} ring className="bg-white p-1" />
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold text-navy-950 sm:text-2xl">{lawyer.fullName}</h1>
                  <Badge tone="gold">{TITLE_LABEL[lawyer.title]}</Badge>
                  {lawyer.isPrincipal && <Badge tone="navy">رئيس المكتب</Badge>}
                </div>
                {lawyer.position && <p className="mt-1 text-[12px] font-bold text-navy-400">{lawyer.position}</p>}
              </div>
              <div className="flex gap-6 pb-2">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-xl font-extrabold text-navy-950">{s.value}</p>
                    <p className="text-[10px] font-bold text-navy-300">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-semibold text-navy-500">
              {lawyer.phone && (
                <span className="flex items-center gap-1.5 font-latin" dir="ltr">
                  <Phone size={12} className="text-gold-600" />
                  {lawyer.phone}
                </span>
              )}
              {lawyer.email && (
                <span className="flex items-center gap-1.5 font-latin" dir="ltr">
                  <Mail size={12} className="text-gold-600" />
                  {lawyer.email}
                </span>
              )}
              {lawyer.specialization && (
                <span className="flex items-center gap-1.5">
                  <Briefcase size={12} className="text-gold-600" />
                  {lawyer.specialization}
                </span>
              )}
            </div>
            {lawyer.bio && <p className="mt-3 max-w-3xl text-[12.5px] leading-6 text-navy-600">{lawyer.bio}</p>}
          </div>
        </Card>

        {/* Composer (own profile only) */}
        {isMe && (
          <div className="mt-4">
            <Composer lawyerName={lawyer.fullName} lawyerPhoto={lawyer.profilePhotoUrl} locations={navLocations} />
          </div>
        )}
        {!isMe && isAdmin && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] px-4 py-3 text-[12px] font-semibold text-navy-600">
            <KeyRound size={14} className="text-gold-600" />
            لتسند مهمة لهذا المحامي، استخدم «إضافة مهمة» من منطقة الإدارة — سيظهر هنا في صفحته وفي الفيد الرئيسي.
          </div>
        )}

        {/* Upcoming */}
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-navy-900">
            <CalendarClock size={16} className="text-gold-600" />
            الجلسات والمهام القادمة
          </h2>
          {upcomingVMs.length === 0 ? (
            <EmptyState title="لا توجد مهام قادمة حالياً" hint="عندما يسندها المسؤول أو ينشئها المحامي ستظهر هنا مرتبة زمنياً." />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {upcomingVMs.map((t) => (
                <SessionCard key={t.id} task={t} />
              ))}
            </div>
          )}
        </div>

        {/* Feed */}
        <div className="mt-8">
          <h2 className="mb-3 text-[15px] font-extrabold text-navy-900">الفيد — البوستات والمهام</h2>
          {feedVMs.length === 0 ? (
            <EmptyState title="لا توجد منشورات بعد" hint="بوستات المحامي ومهامه المسندة إليه ستظهر هنا بالترتيب." />
          ) : (
            <div className="space-y-4">
              {feedVMs.map((t) => (
                <PostCard key={t.id} task={t} sessionRole={session?.role} sessionLawyerId={isMe ? lawyer.id : undefined} />
              ))}
            </div>
          )}
        </div>

        {/* Completed */}
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-navy-900">
            <CheckCheck size={16} className="text-emerald-600" />
            مهام مكتملة
          </h2>
          {completedVMs.length === 0 ? (
            <EmptyState title="لا توجد مهام مكتملة بعد" />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {completedVMs.map((t) => (
                <SessionCard key={t.id} task={t} />
              ))}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="mt-8">
          <h2 className="mb-3 text-[15px] font-extrabold text-navy-900">النشاط الأخير</h2>
          {lawyer.activities.length === 0 ? (
            <EmptyState title="لم يتم تسجيل أي نشاط" />
          ) : (
            <Card className="p-5">
              <ActivityTimeline items={lawyer.activities} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
