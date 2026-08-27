import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarClock, Landmark, Scale, Search, BriefcaseBusiness, ClipboardList, AlertTriangle, Users, MapPinned } from 'lucide-react';
import { getSidebarData, getFeed, getAdminStats } from '@/lib/queries';
import { can } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';
import { getSiteNav } from '@/lib/site-data';
import { SessionSidebar } from '@/components/session-sidebar';
import { PostCard } from '@/components/post-card';
import { Composer } from '@/components/composer';
import { Card, EmptyState } from '@/components/ui';
import { FeedMore } from '@/components/feed-more';

const FEED_PAGE_SIZE = 12;

export default async function HomePage({ searchParams }: { searchParams: Promise<{ feedPage?: string }> }) {
  const session = await getCurrentUser();
  if (!session) redirect('/admin/login');

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.feedPage ?? '1', 10) || 1);

  const [sidebar, feed, nav, stats] = await Promise.all([
    getSidebarData(),
    getFeed({ limit: FEED_PAGE_SIZE, offset: (page - 1) * FEED_PAGE_SIZE }),
    getSiteNav(),
    getAdminStats(),
  ]);

  const lawyerSession = session.role === 'lawyer' ? session : null;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] gap-5 px-4 py-5 sm:px-6">
      <aside className="hidden w-[330px] shrink-0 lg:block">
        <div className="sticky top-[84px]">
          <SessionSidebar data={sidebar} isAdmin={session.role === 'admin'} />
        </div>
      </aside>

      <section className="min-w-0 flex-1 space-y-4">
        <section aria-labelledby="dashboard-title" className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-[0_3px_14px_rgba(7,17,28,0.07)]">
          <div className="flex items-center justify-between gap-3 border-b border-navy-100 bg-navy-950 px-4 py-4 sm:px-5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-gold-300">مركز القيادة</p>
              <h1 id="dashboard-title" className="mt-1 text-lg font-extrabold text-ivory-50">حالة المكتب اليوم</h1>
            </div>
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-ivory-200 sm:inline-flex">تحديث مباشر من السجلات</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-navy-100 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'جلسات اليوم', value: stats.today, icon: CalendarClock, tone: 'bg-gold-500' },
              { label: 'جلسات الغد', value: stats.tomorrow, icon: CalendarClock, tone: 'bg-orange-500' },
              { label: 'جلسات حرجة', value: stats.critical, icon: AlertTriangle, tone: 'bg-red-600' },
              { label: 'مهام مفتوحة', value: stats.uncompleted, icon: ClipboardList, tone: 'bg-navy-700' },
              { label: 'المحامون', value: stats.lawyers, icon: Users, tone: 'bg-emerald-600' },
              { label: 'المواعيد القادمة', value: stats.upcoming30, icon: MapPinned, tone: 'bg-gold-600' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href="/calendar" className="group relative bg-white p-3.5 transition hover:bg-ivory-50 sm:p-4">
                  <span className={`absolute inset-x-0 top-0 h-1 ${item.tone}`} />
                  <Icon size={16} className="mb-2 text-navy-300 transition group-hover:text-gold-600" />
                  <strong className="block text-2xl font-extrabold leading-none text-navy-950">{item.value}</strong>
                  <span className="mt-1.5 block text-[10.5px] font-bold text-navy-400">{item.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3 border-t border-navy-100 px-4 py-3 text-[11px] font-semibold text-navy-400 sm:px-5">
            <BriefcaseBusiness size={14} className="text-gold-600" />
            <span>توزيع المواعيد خلال الشهر</span>
            <div className="flex h-6 flex-1 items-end gap-1" aria-label="مؤشر المواعيد القادمة">
              {[stats.today, stats.tomorrow, stats.critical, stats.important, stats.upcoming30].map((v, i) => (
                <span key={i} className="min-w-2 flex-1 rounded-t-sm bg-gold-500/70" style={{ height: `${Math.max(18, Math.min(100, (v + 1) * 14))}%` }} />
              ))}
            </div>
            <span className="hidden text-navy-300 sm:inline">حتى ٣٠ يوماً</span>
          </div>
        </section>

        {lawyerSession && <Composer lawyerName={lawyerSession.name} locations={nav.locations} />}

        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-extrabold text-navy-900">فيد المكتب</h1>
          <span className="text-[11px] font-semibold text-navy-300">{feed.total} منشور</span>
        </div>

        {feed.items.length === 0 ? (
          <EmptyState title="لا توجد منشورات حالياً" hint="ستظهر هنا مهام المحامين والجلسات والنشاط الإداري لحظة إضافتها." />
        ) : (
          <div className="space-y-4">
            {feed.items.map((t) => (
              <PostCard key={t.id} task={t} sessionRole={session.role} sessionLawyerId={lawyerSession?.lawyerId} canWriteTasks={session.role === 'admin' && can(session.userRole, 'writeTasks')} />
            ))}
          </div>
        )}

        {feed.total > page * FEED_PAGE_SIZE && <FeedMore nextPage={page + 1} currentQuery={`feedPage=${page + 1}`} />}
      </section>

      <aside className="hidden w-[250px] shrink-0 xl:block">
        <div className="sticky top-[84px] space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-[12px] font-extrabold text-navy-800">تنقّل سريع</h3>
            <ul className="space-y-1 text-[12.5px] font-bold">
              <li><Link href="/locations" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-navy-600 hover:bg-ivory-100 hover:text-navy-950"><Landmark size={14} className="text-gold-600" />المحاكم والأماكن</Link></li>
              <li><Link href="/lawyers" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-navy-600 hover:bg-ivory-100 hover:text-navy-950"><Scale size={14} className="text-gold-600" />المحامون</Link></li>
              <li><Link href="/calendar" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-navy-600 hover:bg-ivory-100 hover:text-navy-950"><CalendarClock size={14} className="text-gold-600" />التقويم</Link></li>
              <li><Link href="/search" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-navy-600 hover:bg-ivory-100 hover:text-navy-950"><Search size={14} className="text-gold-600" />البحث المتقدم</Link></li>
              {session.role === 'admin' && <li><Link href="/admin?tab=cases" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] font-bold text-navy-600 hover:bg-ivory-100 hover:text-navy-950"><BriefcaseBusiness size={14} className="text-gold-600" />ملفات القضايا</Link></li>}
            </ul>
          </Card>
        </div>
      </aside>
    </div>
  );
}
