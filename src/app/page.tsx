import Link from 'next/link';
import { CalendarClock, Landmark, Scale, Search, GaugeCircle } from 'lucide-react';
import { getSidebarData, getFeed, getAdminStats } from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { getSiteNav } from '@/lib/site-data';
import { SessionSidebar } from '@/components/session-sidebar';
import { PostCard } from '@/components/post-card';
import { Composer } from '@/components/composer';
import { Card, EmptyState } from '@/components/ui';
import { FeedMore } from '@/components/feed-more';

const FEED_PAGE_SIZE = 12;

export default async function HomePage({ searchParams }: { searchParams: Promise<{ feedPage?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.feedPage ?? '1', 10) || 1);

  const [sidebar, feed, session, nav, stats] = await Promise.all([
    getSidebarData(),
    getFeed({ limit: FEED_PAGE_SIZE, offset: (page - 1) * FEED_PAGE_SIZE }),
    getCurrentUser(),
    getSiteNav(),
    getAdminStats(),
  ]);

  const lawyerSession = session?.role === 'lawyer' ? session : null;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] gap-5 px-4 py-5 sm:px-6">
      {/* Right sidebar (start side in RTL) */}
      <aside className="hidden w-[330px] shrink-0 lg:block">
        <div className="sticky top-[84px]">
          <SessionSidebar data={sidebar} isAdmin={session?.role === 'admin'} />
        </div>
      </aside>

      {/* Center feed */}
      <section className="min-w-0 flex-1 space-y-4">
        {lawyerSession && (
          <Composer
            lawyerName={lawyerSession.name}
            locations={nav.locations}
          />
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-extrabold text-navy-900">فيد المكتب</h1>
          <span className="text-[11px] font-semibold text-navy-300">{feed.total} منشور</span>
        </div>

        {feed.items.length === 0 ? (
          <EmptyState
            title="لا توجد منشورات حالياً"
            hint="ستظهر هنا مهام المحامين والجلسات والنشاط الإداري لحظة إضافتها."
          />
        ) : (
          <div className="space-y-4">
            {feed.items.map((t) => (
              <PostCard
                key={t.id}
                task={t}
                sessionRole={session?.role}
                sessionLawyerId={lawyerSession?.lawyerId}
              />
            ))}
          </div>
        )}

        {feed.total > page * FEED_PAGE_SIZE && (
          <FeedMore nextPage={page + 1} currentQuery={params.feedPage ? `feedPage=${page + 1}` : `feedPage=${page + 1}`} />
        )}
      </section>

      {/* Left quick panel */}
      <aside className="hidden w-[250px] shrink-0 xl:block">
        <div className="sticky top-[84px] space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b border-navy-100 bg-navy-950 px-4 py-3">
              <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-ivory-50">
                <GaugeCircle size={15} className="text-gold-400" />
                نظرة سريعة
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-px bg-navy-100">
              {[
                { label: 'اليوم', value: stats.today, href: '/calendar' },
                { label: 'غداً', value: stats.tomorrow, href: '/calendar' },
                { label: 'حرجة (3 أيام)', value: stats.critical, href: '/calendar' },
                { label: 'مهام مفتوحة', value: stats.uncompleted, href: '/calendar' },
              ].map((s) => (
                <Link key={s.label} href={s.href} className="bg-white px-4 py-3 hover:bg-ivory-50">
                  <span className="block text-xl font-extrabold text-navy-950">{s.value}</span>
                  <span className="block text-[10.5px] font-bold text-navy-300">{s.label}</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-[12px] font-extrabold text-navy-800">تنقّل سريع</h3>
            <ul className="space-y-1 text-[12.5px] font-bold">
              <li>
                <Link href="/locations" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-navy-600 hover:bg-ivory-100 hover:text-navy-950">
                  <Landmark size={14} className="text-gold-600" />
                  المحاكم والأماكن
                </Link>
              </li>
              <li>
                <Link href="/lawyers" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-navy-600 hover:bg-ivory-100 hover:text-navy-950">
                  <Scale size={14} className="text-gold-600" />
                  المحامون
                </Link>
              </li>
              <li>
                <Link href="/calendar" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-navy-600 hover:bg-ivory-100 hover:text-navy-950">
                  <CalendarClock size={14} className="text-gold-600" />
                  التقويم
                </Link>
              </li>
              <li>
                <Link href="/search" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-navy-600 hover:bg-ivory-100 hover:text-navy-950">
                  <Search size={14} className="text-gold-600" />
                  البحث المتقدم
                </Link>
              </li>
            </ul>
          </Card>

          <Card className="border-gold-500/30 bg-gradient-to-b from-navy-950 to-navy-900 p-4">
            <p className="text-[11px] font-bold leading-6 text-ivory-300">
              <span className="text-gold-300">من أين نبدأ؟</span>
              <br />
              كل جلسة ومهمة تسجّل مرة واحدة، وتظهر تلقائياً في الفيد، والصفحات، والتقويم، والشريط الجانبي.
            </p>
          </Card>
        </div>
      </aside>
    </div>
  );
}
