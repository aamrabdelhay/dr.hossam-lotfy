import Link from 'next/link';
import { CalendarClock, Landmark, Scale, Search, BriefcaseBusiness, ClipboardList, AlertTriangle, Users, MapPinned, ArrowUpLeft } from 'lucide-react';
import { getSidebarData, getFeed, getAdminStats } from '@/lib/queries';
import { getRecentLawyerStatusPosts } from '@/lib/lawyer-status';
import { can } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';
import { getSiteNav } from '@/lib/site-data';
import { SessionSidebar } from '@/components/session-sidebar';
import { PostCard } from '@/components/post-card';
import { LawyerStatusPosts } from '@/components/lawyer-status-posts';
import { Composer } from '@/components/composer';
import { EmptyState } from '@/components/ui';
import { FeedMore } from '@/components/feed-more';

const FEED_PAGE_SIZE = 12;

export default async function HomePage({ searchParams }: { searchParams: Promise<{ feedPage?: string }> }) {
  const session = await getCurrentUser();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.feedPage ?? '1', 10) || 1);
  const [sidebar, feed, nav, stats, lawyerStatusPosts] = await Promise.all([
    getSidebarData(), getFeed({ limit: FEED_PAGE_SIZE, offset: (page - 1) * FEED_PAGE_SIZE }), getSiteNav(), getAdminStats(), getRecentLawyerStatusPosts(),
  ]);
  const lawyerSession = session?.role === 'lawyer' ? session : null;
  const isAdmin = session?.role === 'admin';
  const canWriteTasks = session ? (session.role === 'admin' && can(session.userRole, 'writeTasks')) : false;
  const metrics = [
    { label: 'جلسات اليوم', value: stats.today, icon: CalendarClock, note: 'تحتاج متابعة اليوم', href: '/calendar' },
    { label: 'جلسات الغد', value: stats.tomorrow, icon: CalendarClock, note: 'أولوية قريبة', href: '/calendar' },
    { label: 'جلسات حرجة', value: stats.critical, icon: AlertTriangle, note: 'تحتاج انتباهًا', href: '/calendar' },
    { label: 'مهام مفتوحة', value: stats.uncompleted, icon: ClipboardList, note: 'قيد التنفيذ', href: '/search' },
    { label: 'المحامون', value: stats.lawyers, icon: Users, note: 'الفريق النشط', href: '/lawyers' },
    { label: 'المواعيد القادمة', value: stats.upcoming30, icon: MapPinned, note: 'خلال 30 يومًا', href: '/calendar' },
  ];

  return (
    <div className="editorial-shell mx-auto flex w-full max-w-[1480px] gap-8 px-4 py-7 sm:px-6 lg:px-8">
      <aside className="hidden w-[285px] shrink-0 lg:block">
        <div className="sticky top-[92px]"><SessionSidebar data={sidebar} isAdmin={isAdmin} /></div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="editorial-hero mb-8">
          <div className="editorial-kicker">LAW OFFICE · INTERNAL DESK</div>
          <div className="mt-2 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="editorial-display">أولويات اليوم</h1>
              <p className="editorial-dek">مواعيد، مهام ومستندات تحتاج إلى انتباه المكتب.</p>
            </div>
            <div className="editorial-date"><span>اليوم</span><strong>{new Intl.DateTimeFormat('ar-EG', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}</strong></div>
          </div>
          <div className="editorial-rule mt-6" />
        </header>

        <section className="mb-8" aria-labelledby="priority-title">
          <div className="mb-3 flex items-end justify-between">
            <div><p className="editorial-kicker">TODAY'S PRIORITIES</p><h2 id="priority-title" className="editorial-section-title">نظرة سريعة</h2></div>
            <Link href="/calendar" className="editorial-link">التقويم <ArrowUpLeft size={14} /></Link>
          </div>
          <div className="editorial-metric-grid">
            {metrics.map(({ label, value, icon: Icon, note, href }, index) => (
              <Link href={href} key={label} className={`editorial-metric ${index < 3 ? 'editorial-metric-priority' : ''}`}>
                <div className="flex items-start justify-between gap-3"><span className="editorial-metric-index">0{index + 1}</span><Icon size={17} strokeWidth={1.5} /></div>
                <strong>{value}</strong><span>{label}</span><small>{note}</small>
              </Link>
            ))}
          </div>
        </section>

        {lawyerSession && <div className="mb-7"><Composer lawyerName={lawyerSession.name} locations={nav.locations} /></div>}

        <section className="editorial-content-grid">
          <div className="min-w-0">
            <div className="mb-4 flex items-end justify-between border-b border-[#d9d2c5] pb-3">
              <div><p className="editorial-kicker">OFFICE RECORD</p><h2 className="editorial-section-title">سجل المكتب</h2></div>
              <span className="editorial-count">{feed.total} سجل</span>
            </div>
            <LawyerStatusPosts posts={lawyerStatusPosts} />
            {feed.items.length === 0 ? <EmptyState title="لا توجد سجلات حالياً" hint="ستظهر هنا مهام المحامين والجلسات والنشاط الإداري لحظة إضافتها." /> : <div className="space-y-5">{feed.items.map((t) => <PostCard key={t.id} task={t} sessionRole={session?.role} sessionLawyerId={lawyerSession?.lawyerId} canWriteTasks={canWriteTasks} />)}</div>}
            {feed.total > page * FEED_PAGE_SIZE && <FeedMore nextPage={page + 1} currentQuery={`feedPage=${page + 1}`} />}
          </div>

          <aside className="editorial-brief hidden xl:block">
            <p className="editorial-kicker">OFFICE INDEX</p>
            <h3 className="editorial-brief-title">الوصول السريع</h3>
            <nav className="mt-4">
              <Link href="/locations"><Landmark size={15} />المحاكم والأماكن</Link>
              <Link href="/lawyers"><Scale size={15} />المحامون</Link>
              <Link href="/calendar"><CalendarClock size={15} />التقويم</Link>
              <Link href="/search"><Search size={15} />البحث المتقدم</Link>
              {isAdmin && <Link href="/admin?tab=cases"><BriefcaseBusiness size={15} />ملفات القضايا</Link>}
            </nav>
            <div className="editorial-note mt-8">
              <span>ملاحظة المكتب</span>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
