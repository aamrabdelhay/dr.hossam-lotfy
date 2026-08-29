import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, EmptyState } from '@/components/ui';
import { NotificationLink } from '@/components/notification-link';
import { PersonalReminderCreator } from '@/components/personal-reminder-creator';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/dates';
export const metadata: Metadata = { title: 'الإشعارات' };
export default async function NotificationsPage() {
  const session = await getCurrentUser(); if (!session) redirect('/');
  const owner = session.role === 'admin' ? { userId: session.userId } : { lawyerId: session.lawyerId }; const now = new Date();
  const where = session.role === 'admin' ? owner : { ...owner, OR: [{ type: { not: 'PERSONAL_REMINDER' } }, { type: 'PERSONAL_REMINDER', createdAt: { lte: now } }] };
  const notifications = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 60 });
  const TYPE_LABEL: Record<string, string> = { TASK_ASSIGNED: 'مهمة جديدة', TASK_EDITED: 'تعديل مهمة', SESSION_CRITICAL: 'جلسة حرجة', SESSION_TOMORROW: 'جلسة غداً', COMMENT: 'تعليق', TASK_COMPLETED: 'تم التنفيذ', TASK_DELETED: 'حذف مهمة', POST_CREATED: 'بوست جديد', ANNOUNCEMENT: 'إعلان', PERSONAL_REMINDER: 'تذكير شخصي', LAWYER_FIRST_LOGIN: 'أول تسجيل دخول' };
  return <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6"><div className="mb-5 flex items-center justify-between gap-3"><h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-950"><Bell size={20} className="text-gold-600" />الإشعارات</h1><div className="flex items-center gap-3"><span className="text-[12px] font-bold text-navy-400">{notifications.filter((n) => !n.readAt && (session.role === 'admin' || n.createdAt <= now)).length} غير مقروء</span><PersonalReminderCreator /></div></div><Card className="divide-y divide-navy-100">{notifications.length === 0 ? <div className="p-8"><EmptyState title="لا توجد إشعارات" hint="ستصلك هنا تنبيهات المهام الجديدة والتعليقات والجلسات القريبة والتذكيرات الشخصية." /></div> : notifications.map((n) => <NotificationLink key={n.id} id={n.id} href={n.link ?? '#'} read={!!n.readAt} className={cn('flex items-start gap-3 px-4 py-3.5 hover:bg-ivory-50', !n.readAt && 'bg-gold-500/[0.05]')}><span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', !n.readAt ? 'bg-gold-500/20 text-gold-700' : 'bg-navy-900/5 text-navy-400')}>{n.type === 'TASK_COMPLETED' ? <CheckCheck size={15} /> : <Bell size={15} />}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className={cn('text-[13px] font-extrabold', n.readAt ? 'text-navy-600' : 'text-navy-950')}>{n.title}</span><span className="rounded bg-navy-900/5 px-1.5 py-px text-[10px] font-bold text-navy-400">{TYPE_LABEL[n.type] ?? n.type}</span>{!n.readAt && <span className="h-2 w-2 rounded-full bg-gold-500" />}</span>{n.body && <span className="mt-0.5 block text-[12px] font-semibold leading-6 text-navy-500">{n.body}</span>}<span className="mt-0.5 block text-[10.5px] font-semibold text-navy-300">{n.type === 'PERSONAL_REMINDER' && n.createdAt > now ? `موعد التذكير: ${formatDateTime(n.createdAt)}` : formatDateTime(n.createdAt)}</span></span></NotificationLink>)}</Card></div>;
}
