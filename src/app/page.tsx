import Link from 'next/link';
import { CalendarClock, Landmark, Scale, Search, BriefcaseBusiness, ClipboardList, AlertTriangle, Users, MapPinned } from 'lucide-react';
import { getSidebarData, getFeed, getAdminStats } from '@/lib/queries';
import { getRecentLawyerStatusPosts } from '@/lib/lawyer-status';
import { can } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';
import { getSiteNav } from '@/lib/site-data';
import { SessionSidebar } from '@/components/session-sidebar';
import { LawyerStatusPosts } from '@/components/lawyer-status-posts';
import { Composer } from '@/components/composer';
import { Card, EmptyState } from '@/components/ui';
import { FeedWindow } from '@/components/feed-window';

export default async function HomePage() {
  const session = await getCurrentUser();
  const [sidebar, feed, nav, stats, lawyerStatusPosts] = await Promise.all([
    getSidebarData(),
    getFeed({ limit: 1000 }),
    getSiteNav(),
    getAdminStats(),
    getRecentLawyerStatusPosts(),
  ]);

  const lawyerSession = session?.role === 'lawyer' ? session : null;
  const isAdmin = session?.role === 'admin' || (session?.role === 'lawyer' && session.isAdmin);
  const canWriteTasks = session ? (session.role === 'admin' ? can(session.userRole, 'writeTasks') : session.isAdmin) : false;

  return (
    <div className="page-enter mx-auto flex w-full max-w-[1440px] gap-5 px-4 py-5 sm:px-6">
      <aside className="hidden w-[330px] shrink-0 lg:block">
        <div className="sticky top-[88px]"><SessionSidebar data={sidebar} isAdmin={isAdmin} /></div>
      </aside>

      <section className="min-w-0 flex-1 space-y-4">
        <section aria-labelledby="dashboard-title" className="overflow-hidden rounded-2xl border border-navy-100/80 bg-white shadow-card">
          <div className="mesh-gold flex items-center justify-between gap-3 border-b border-navy-800 bg-gradient-to-l from-navy-950 via-navy-900 to-navy-850 px-4 py-4 sm:px-5">
            <span id="dashboard-title" aria-hidden="true" className="sr-only">إحصاءات المكتب</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-navy-100/70 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'جلسات اليوم', value: stats.today, icon: CalendarClock, tone: 'bg-gold-500/15 text-gold-600 ring-gold-500/30' },
              { label: 'جلسات الغد', value: stats.tomorrow, icon: CalendarClock, tone: 'bg-orange-500/10 text-orange-600 ring-orange-500/25' },
              { label: 'جلسات حرجة', value: stats.critical, icon: AlertTriangle, tone: 'bg-red-600/10 text-red-600 ring-red-600/25' },
              { label: 'مهام مفتوحة', value: stats.uncompleted, icon: ClipboardList, tone: 'bg-navy-700/10 text-navy-700 ring-navy-700/20' },
              { label: 'المحامون', value: stats.lawyers, icon: Users, tone: 'bg-emerald-600/10 text-emerald-600 ring-emerald-600/25' },
              { label: 'المواعيد القادمة', value: stats.upcoming30, icon: MapPinned, tone: 'bg-gold-600/10 text-gold-700 ring-gold-600/25' },
            ].map((item) => {
              const Icon = item.icon;
              return <Link key={item.label} href="/calendar" className="group relative bg-white p-3.5 transition-all duration-200 hover:bg-ivory-50 hover:shadow-soft sm:p-4"><span className={`mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-200 group-hover:scale-110 ${item.tone}`}><Icon size={15} /></span><strong className="block text-2xl font-extrabold leading-none text-navy-950">{item.value}</strong><span className="mt-1.5 block text-[10.5px] font-bold text-navy-400">{item.label}</span></Link>;
            })}
          </div>
          <div className="flex items-center gap-3 border-t border-navy-100 px-4 py-3 text-[11px] font-semibold text-navy-400 sm:px-5">
            <BriefcaseBusiness size={14} className="text-gold-600" /><span>توزيع المواعيد خلال الشهر</span>
            <div className="flex h-6 flex-1 items-end gap-1" aria-label="مؤشر المواعيد القادمة">{[stats.today, stats.tomorrow, stats.critical, stats.important, stats.upcoming30].map((v, i) => <span key={i} className="min-w-2 flex-1 rounded-t-full bg-gradient-to-t from-gold-600/60 to-gold-400/80 transition-all" style={{ height: `${Math.max(18, Math.min(100, (v + 1) * 14))}%` }} />)}</div>
            <span className="hidden text-navy-300 sm:inline">حتى ٣٠ يوماً</span>
          </div>
        </section>

        {lawyerSession && <Composer lawyerName={lawyerSession.name} locations={nav.locations} />}

        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2.5 text-[15px] font-extrabold text-navy-900"><span className="h-4 w-1 rounded-full bg-gradient-to-b from-gold-400 to-gold-600" />فيد المكتب</h1>
          <span className="rounded-full bg-navy-900/[0.06] px-2.5 py-1 text-[11px] font-bold text-navy-500">{feed.total} منشور</span>
        </div>

        <LawyerStatusPosts posts={lawyerStatusPosts} />

        {feed.items.length === 0 ? (
          <EmptyState title="لا توجد منشورات حالياً" hint="ستظهر هنا مهام المحامين والجلسات والنشاط الإداري لحظة إضافتها." />
        ) : (
          <FeedWindow tasks={feed.items} sessionRole={session?.role} sessionLawyerId={lawyerSession?.lawyerId} canWriteTasks={canWriteTasks} />
        )}
      </section>

      <aside className="hidden w-[250px] shrink-0 xl:block">
        <div className="sticky top-[88px] space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-[12px] font-extrabold text-navy-800">تنقّل سريع</h3>
            <ul className="space-y-1 text-[12.5px] font-bold">
              <li><Link href="/locations" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 transition-colors hover:bg-ivory-100 hover:text-navy-950"><Landmark size={14} className="text-gold-600" />المحاكم والجهات الحكومية</Link></li>
              <li><Link href="/lawyers" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 transition-colors hover:bg-ivory-100 hover:text-navy-950"><Scale size={14} className="text-gold-600" />المحامون</Link></li>
              <li><Link href="/calendar" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 transition-colors hover:bg-ivory-100 hover:text-navy-950"><CalendarClock size={14} className="text-gold-600" />التقويم</Link></li>
              <li><Link href="/search" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 transition-colors hover:bg-ivory-100 hover:text-navy-950"><Search size={14} className="text-gold-600" />البحث المتقدم</Link></li>
              {isAdmin && <li><Link href="/admin?tab=cases" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-bold text-navy-600 transition-colors hover:bg-ivory-100 hover:text-navy-950"><BriefcaseBusiness size={14} className="text-gold-600" />ملفات القضايا</Link></li>}
            </ul>
          </Card>
        </div>
      </aside>
    </div>
  );
}
