import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, CalendarDays, Clock, FileText, UserRound, StickyNote, PlusCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSidebarData, getTaskVM } from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { SessionSidebar } from '@/components/session-sidebar';
import { PostCard } from '@/components/post-card';
import { EditTrigger } from '@/components/session-edit-trigger';
import { ActivityTimeline } from '@/components/activity-timeline';
import { type CommentVM } from '@/components/comment-section';
import { Badge, Card, EmptyState } from '@/components/ui';
import { StatusBadge, UrgencyBadge } from '@/components/urgency';
import { formatFullDate, formatTimeOfDay, formatDateTime } from '@/lib/dates';
import { LOCATION_TYPE_LABEL, TITLE_LABEL } from '@/lib/constants';

export const metadata: Metadata = { title: 'تفاصيل الجلسة' };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  // Public session details — visitors can read; actions stay gated server-side.
  const session = await getCurrentUser();

  const { id } = await params;
  const [task, sidebar, locations, lawyers, taskActivity] = await Promise.all([
    getTaskVM(id, true),
    getSidebarData(),
    prisma.location.findMany({ select: { id: true, slug: true, name: true, type: true }, orderBy: [{ type: 'asc' }, { name: 'asc' }] }),
    prisma.lawyer.findMany({ where: { active: true, approvedAt: { not: null } }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } }),
    prisma.activityLog.findMany({ where: { taskId: id }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);

  if (!task) notFound();

  const raw = task.raw;
  const role = session?.role;
  const myLawyerId = session?.role === 'lawyer' ? session.lawyerId : null;
  const myAdminId = session?.role === 'admin' ? session.userId : null;
  const isAdmin = role === 'admin';
  const iAmAuthor = myLawyerId != null && task.author?.id === myLawyerId;
  const canEdit = isAdmin || iAmAuthor;
  const canWriteTasks = session !== null && session.role === 'admin' && can(session.userRole, 'writeTasks');

  const commentsVM: CommentVM[] = raw.comments.map((c) => ({
    id: c.id,
    text: c.text,
    createdAt: c.createdAt.toISOString(),
    author: c.authorLawyer ? { name: c.authorLawyer.fullName, photo: c.authorLawyer.profilePhotoUrl } : c.authorUser ? { name: c.authorUser.name, photo: null } : c.authorName ? { name: c.authorName, photo: null } : null,
    authorRole: c.authorLawyer ? 'lawyer' : c.authorUser ? 'admin' : 'guest',
    isMine: (role === 'lawyer' && c.authorLawyerId === myLawyerId) || (role === 'admin' && c.authorUserId === myAdminId),
    canDelete: (role === 'lawyer' && c.authorLawyerId === myLawyerId) || (role === 'admin' && c.authorUserId === myAdminId),
  }));

  const date = task.scheduledDate ? new Date(`${task.scheduledDate}T12:00:00`) : null;
  const time = formatTimeOfDay(task.scheduledTime);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] gap-5 px-4 py-5 sm:px-6">
      <aside className="hidden w-[330px] shrink-0 lg:block"><div className="sticky top-[88px]"><SessionSidebar data={sidebar} isAdmin={isAdmin} /></div></aside>
      <div className="min-w-0 flex-1 space-y-5">
        <Card className="overflow-hidden">
          <div className="bg-navy-950 px-5 py-4"><div className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-gold-400">تفاصيل</p><h1 className="mt-1 text-lg font-extrabold leading-7 text-ivory-50 sm:text-xl">{task.description}</h1></div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={task.status} />{task.scheduledDate && task.status !== 'COMPLETED' && <UrgencyBadge urgency={task.urgency} />}</div></div></div>
          <div className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <Detail icon={<MapPin size={15} />} label="المكان"><Link href={`/locations/${task.location.slug}`} className="font-extrabold text-navy-900 hover:underline">{task.location.name}</Link><span className="text-[11px] font-bold text-navy-300">{LOCATION_TYPE_LABEL[task.location.type]}</span></Detail>
            <Detail icon={<CalendarDays size={15} />} label="التاريخ واليوم">{date ? <span className="font-extrabold text-navy-900">{formatFullDate(date)}</span> : 'غير محدد'}</Detail>
            <Detail icon={<Clock size={15} />} label="الساعة">{time ? <span className="font-extrabold text-navy-900">{time}</span> : 'غير محدد'}</Detail>
            {(task.caseName || task.caseNumber) && <Detail icon={<FileText size={15} />} label="القضية"><span className="font-extrabold text-navy-900">{task.caseName}</span><span className="font-latin text-[11px] font-bold text-navy-400">{task.caseNumber}</span></Detail>}
            <Detail icon={<UserRound size={15} />} label="المكلّفون"><div className="flex flex-wrap gap-1.5 pt-0.5">{task.lawyers.length === 0 ? <span className="text-[12px] font-bold text-navy-300">غير مسند</span> : task.lawyers.map((l) => <Link key={l.id} href={`/lawyers/${l.slug}`}><Badge tone={l.completed ? 'green' : 'outline'}>{l.completed ? '✓ ' : ''}{l.name}</Badge></Link>)}</div></Detail>
            <Detail icon={<PlusCircle size={15} />} label="الإضافة"><span className="text-[12.5px] font-bold text-navy-700">{task.author ? `${task.author.name} (${TITLE_LABEL[task.author.title]})` : raw.createdBy ? `إدارة — ${raw.createdBy.name}` : 'إدارة المكتب'}</span><span className="text-[11px] font-semibold text-navy-300">{formatDateTime(raw.createdAt)}</span></Detail>
          </div>
          {task.notes && <div className="mx-5 mb-5 flex items-start gap-2 rounded-lg border border-gold-500/25 bg-gold-500/[0.06] px-3 py-2.5"><StickyNote size={14} className="mt-1 shrink-0 text-gold-600" /><div><p className="text-[11px] font-extrabold text-gold-700">ملاحظات</p><p className="mt-0.5 text-[13px] leading-6 text-navy-700">{task.notes}</p></div></div>}
        </Card>
        <PostCard task={task} comments={commentsVM} sessionRole={role} sessionLawyerId={myLawyerId ?? undefined} canWriteTasks={canWriteTasks} initiallyOpen />
        {canEdit && <React.Suspense fallback={null}><EditTrigger task={{ id: task.id, description: task.description, notes: task.notes, locationId: task.location.id, caseName: task.caseName, caseNumber: task.caseNumber, scheduledDate: task.scheduledDate, scheduledTime: task.scheduledTime, status: task.status, lawyerIds: task.lawyerIds }} locations={locations} lawyers={lawyers.map((l) => ({ id: l.id, name: l.fullName }))} /></React.Suspense>}
        <div><h2 className="mb-3 text-[15px] font-extrabold text-navy-900">سجل النشاط على هذه المهمة</h2>{taskActivity.length === 0 ? <EmptyState title="لم يتم تسجيل أي نشاط" hint="تظهر هنا كل الأحداث: إنشاء، تعديل، إسناد، تنفيذ، تعليقات، حذف." /> : <Card className="p-5"><ActivityTimeline items={taskActivity} /></Card>}</div>
      </div>
    </div>
  );
}

function Detail({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return <div><p className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold text-navy-400"><span className="text-gold-600">{icon}</span>{label}</p><div className="text-[13px] leading-6">{children}</div></div>;
}
