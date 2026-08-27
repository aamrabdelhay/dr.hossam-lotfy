import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Landmark, Building2, MapPin, Clock, FileText } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSidebarData, toTaskVM } from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { LOCATION_TYPE_LABEL } from '@/lib/constants';
import { SessionSidebar } from '@/components/session-sidebar';
import { PostCard } from '@/components/post-card';
import { ActivityTimeline } from '@/components/activity-timeline';
import { Badge, Card, EmptyState } from '@/components/ui';
import { formatFullDate } from '@/lib/dates';

export const metadata: Metadata = { title: 'صفحة المكان' };

export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [location, sidebar, session] = await Promise.all([
    prisma.location.findUnique({
      where: { slug },
      include: {
        tasks: {
          include: {
            location: true,
            caseRecord: true,
            author: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } },
            assignees: {
              select: {
                lawyer: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } },
                completedAt: true,
              },
            },
            comments: { select: { createdAt: true }, take: 1, orderBy: { createdAt: 'desc' } },
          },
          orderBy: [{ scheduledDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
          take: 60,
        },
      },
    }),
    getSidebarData(),
    getCurrentUser(),
  ]);

  if (!location) notFound();

  const activity = await prisma.activityLog.findMany({
    where: { locationId: location.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const upcoming = location.tasks.filter((t) => t.scheduledDate && new Date(t.scheduledDate) >= new Date() && t.status !== 'COMPLETED').length;
  const IsCourt = location.type === 'COURT';

  const tasksVM = location.tasks.map((t) => toTaskVM(t as never));

  return (
    <div className="mx-auto flex w-full max-w-[1440px] gap-5 px-4 py-5 sm:px-6">
      <aside className="hidden w-[330px] shrink-0 lg:block">
        <div className="sticky top-[84px]">
          <SessionSidebar data={sidebar} isAdmin={session?.role === 'admin'} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Header */}
        <Card className="overflow-hidden">
          <div className={`relative px-5 py-8 sm:px-8 ${IsCourt ? 'bg-navy-950' : 'bg-navy-900'}`}>
            <div className="gold-hairline absolute inset-x-0 bottom-0" />
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-gold-400 ring-1 ring-gold-500/40">
                {IsCourt ? <Landmark size={30} /> : <Building2 size={30} />}
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold text-ivory-50 sm:text-2xl">{location.name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge tone="gold">{LOCATION_TYPE_LABEL[location.type] ?? location.type}</Badge>
                  {location.address && (
                    <span className="flex items-center gap-1 text-[12px] font-semibold text-ivory-300">
                      <MapPin size={12} className="text-gold-400" />
                      {location.address}
                    </span>
                  )}
                </div>
              </div>
              <div className="ms-auto hidden gap-4 sm:flex">
                <div className="text-center">
                  <p className="text-xl font-extrabold text-gold-300">{upcoming}</p>
                  <p className="text-[10px] font-bold text-ivory-300">جلسات قادمة</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-extrabold text-gold-300">{location.tasks.length}</p>
                  <p className="text-[10px] font-bold text-ivory-300">نشاط مسجل</p>
                </div>
              </div>
            </div>
            {location.description && <p className="mt-4 max-w-2xl text-[12.5px] leading-6 text-ivory-300">{location.description}</p>}
          </div>
        </Card>

        {/* Directory info — extended location profile */}
        {(location.phone || location.email || location.workingHours || location.services.length > 0 || location.googleMapsUrl || location.distanceBucket || location.jurisdiction || location.governorate) && (
          <Card className="mt-4 p-5">
            <div className="grid gap-4 text-[12.5px] sm:grid-cols-2 lg:grid-cols-3">
              {location.governorate && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-navy-300">النطاق</p>
                  <p className="mt-1 font-bold text-navy-800">
                    {[location.governorate, location.city, location.district].filter(Boolean).join(' — ')}
                    {location.subType ? ` · ${location.subType}` : ''}
                  </p>
                </div>
              )}
              {location.workingHours && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-navy-300">مواعيد العمل</p>
                  <p className="mt-1 font-bold text-navy-800">{location.workingHours}</p>
                </div>
              )}
              {location.jurisdiction && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-navy-300">الاختصاص</p>
                  <p className="mt-1 font-bold text-navy-800">{location.jurisdiction}</p>
                </div>
              )}
              {location.phone && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-navy-300">الهاتف</p>
                  <a href={`tel:${location.phone}`} className="ltr mt-1 inline-block font-bold text-navy-800 hover:text-gold-700">{location.phone}</a>
                </div>
              )}
              {location.email && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-navy-300">البريد الإلكتروني</p>
                  <a href={`mailto:${location.email}`} className="ltr mt-1 inline-block font-bold text-navy-800 hover:text-gold-700">{location.email}</a>
                </div>
              )}
              {location.distanceBucket && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-navy-300">المسافة من مكتب الدقي</p>
                  <p className="mt-1 font-bold text-navy-800">
                    {location.distanceBucket}
                    {location.distanceFromDokki ? ` · ${location.distanceFromDokki} كم` : ''}
                  </p>
                </div>
              )}
              {location.services.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-navy-300">الخدمات</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {location.services.map((s) => (
                      <Badge key={s} tone="outline">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-1">
                {location.googleMapsUrl && (
                  <a href={location.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 px-3 py-1.5 text-[12px] font-extrabold text-navy-700 transition hover:border-gold-500 hover:text-gold-700">
                    <MapPin size={13} />
                    الموقع على الخريطة
                  </a>
                )}
                {location.hasOnlineService && <Badge tone="green">خدمة أونلاين متاحة</Badge>}
                {location.requiresPersonal && <Badge tone="amber">الحضور الشخصي مطلوب</Badge>}
              </div>
            </div>
          </Card>
        )}

        {/* Feed */}
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-navy-900">سجل النشاط — من نازل هنا وإمتى</h2>
            <span className="text-[11px] font-semibold text-navy-300">ترتيب زمني</span>
          </div>
          {tasksVM.length === 0 ? (
            <EmptyState title="لا توجد نشاطات في هذا المكان بعد" hint="بمجرد إضافة جلسة أو مهمة لهذا المكان ستظهر هنا مع كل التفاصيل." />
          ) : (
            <div className="space-y-4">
              {tasksVM.map((t) => (
                <div key={t.id} className="flex gap-3">
                  <div className="flex w-20 shrink-0 flex-col items-center pt-2">
                    {t.scheduledDate ? (
                      <>
                        <span className="text-[11px] font-extrabold text-gold-700">{formatFullDate(new Date(`${t.scheduledDate}T12:00:00`)).split('،')[0]}</span>
                        {t.scheduledTime && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-navy-300">
                            <Clock size={10} />
                            {t.scheduledTime}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-navy-300">
                        <FileText size={10} />
                        بلا تاريخ
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <PostCard
                      task={t}
                      sessionRole={session?.role}
                      sessionLawyerId={session?.role === 'lawyer' ? session.lawyerId : undefined}
                      canWriteTasks={session?.role === 'admin' && can(session.userRole, 'writeTasks')}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity history */}
        <div className="mt-8">
          <h2 className="mb-3 text-[15px] font-extrabold text-navy-900">السجل التاريخي</h2>
          {activity.length === 0 ? (
            <EmptyState title="لم يتم تسجيل أي نشاط" hint="ستظهر هنا أحداث إنشاء وتعديل وإنهاء المهام المرتبطة بهذا المكان." />
          ) : (
            <Card className="p-5">
              <ActivityTimeline items={activity} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
