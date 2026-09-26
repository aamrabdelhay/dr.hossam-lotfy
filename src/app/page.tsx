import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarClock, Landmark, Scale, Search, BriefcaseBusiness, ClipboardList, AlertTriangle, Users, MapPinned } from 'lucide-react';
import { getSidebarData, getFeed, getAdminStats } from '@/lib/queries';
import { getRecentLawyerStatusPosts } from '@/lib/lawyer-status';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth';
import { getSiteNav } from '@/lib/site-data';
import { SessionSidebar } from '@/components/session-sidebar';
import { LawyerStatusPosts } from '@/components/lawyer-status-posts';
import { Composer } from '@/components/composer';
import { Card, EmptyState } from '@/components/ui';
import { FeedWindow } from '@/components/feed-window';
import { copyFor, getSiteLanguage } from '@/lib/i18n';
import { getBranchScope } from '@/lib/branch-access';
import styles from './page-transition.module.css';

export default async function HomePage() {
  const language = await getSiteLanguage();
  const copy = copyFor(language);
  const session = await getCurrentUser();
  if (!session) redirect('/auth');
  const branchScope = await getBranchScope(session);
  const branchTaskIds = !branchScope.allBranches && branchScope.officeManager
    ? await prisma.$queryRawUnsafe<string[]>('SELECT "id" FROM "tasks" WHERE "branch_id"=ANY($1::text[])', branchScope.officeManagerBranchIds)
    : undefined;
  const navBranchId = !branchScope.allBranches && branchScope.officeManager ? branchScope.officeManagerBranchIds[0] : undefined;
  const [sidebar, feed, nav, stats, lawyerStatusPosts] = await Promise.all([getSidebarData(branchTaskIds), getFeed({ taskIds: branchTaskIds, limit: 1000 }), getSiteNav(navBranchId), getAdminStats(), getRecentLawyerStatusPosts()]);
  const lawyerSession = session?.role === 'lawyer' ? session : null;
  const isAdmin = session?.role === 'admin' || (session?.role === 'lawyer' && session.isAdmin);
  const canWriteTasks = session ? (session.role === 'admin' ? can(session.userRole, 'writeTasks') : session.isAdmin) : false;
  const quickTaskHref = isAdmin ? '/admin?tab=tasks' : '#task-composer';
  const statIcons = [CalendarClock, CalendarClock, AlertTriangle, ClipboardList, Users, MapPinned];
  const statTones = ['bg-gold-500/15 text-gold-600 ring-gold-500/30', 'bg-orange-500/10 text-orange-600 ring-orange-500/25', 'bg-red-600/10 text-red-600 ring-red-600/25', 'bg-navy-700/10 text-navy-700 ring-navy-700/20', 'bg-emerald-600/10 text-emerald-600 ring-emerald-600/25', 'bg-gold-600/10 text-gold-700 ring-gold-600/25'];

  return <div className={`${styles.enter} mx-auto flex w-full max-w-[1440px] gap-5 px-4 py-5 sm:px-6`}>
    <aside className="hidden w-[330px] shrink-0 lg:block"><div className="sticky top-[88px]"><SessionSidebar data={sidebar} isAdmin={isAdmin}/></div></aside>
    <section className="min-w-0 flex-1 space-y-4">
      <section aria-labelledby="dashboard-title" className="overflow-hidden rounded-2xl border border-navy-100/80 bg-white shadow-card"><div className="mesh-gold flex items-center justify-between gap-3 border-b border-navy-800 bg-gradient-to-l from-navy-950 via-navy-900 to-navy-850 px-4 py-4 sm:px-5"><span id="dashboard-title" aria-hidden="true" className="sr-only">{copy.officeFeed}</span></div><div className="grid grid-cols-2 gap-px bg-navy-100/70 sm:grid-cols-3 lg:grid-cols-6">{copy.stats.map((label,index)=>{const Icon=statIcons[index];return <Link key={label} href="/calendar" className="group relative bg-white p-3.5 transition-all duration-200 hover:bg-ivory-50 hover:shadow-soft sm:p-4"><span className={`mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl ring-1 ring-inset ${statTones[index]}`}><Icon size={15}/></span><strong className="block text-2xl font-extrabold leading-none text-navy-950">{[stats.today,stats.tomorrow,stats.critical,stats.uncompleted,stats.lawyers,stats.upcoming30][index]}</strong><span className="mt-1.5 block text-[10.5px] font-bold text-navy-400">{label}</span></Link>})}</div></section>
      {lawyerSession&&<div id="task-composer"><Composer lawyerName={lawyerSession.name} locations={nav.locations}/></div>}
      <div className="flex items-center justify-between"><h1 className="flex items-center gap-2.5 text-[15px] font-extrabold text-navy-900"><span className="h-4 w-1 rounded-full bg-gradient-to-b from-gold-400 to-gold-600"/>{copy.officeFeed}</h1><span className="rounded-full bg-navy-900/[0.06] px-2.5 py-1 text-[11px] font-bold text-navy-500">{feed.total} {copy.posts}</span></div>
      <LawyerStatusPosts posts={lawyerStatusPosts}/>{feed.items.length===0?<EmptyState title={copy.noPosts} hint={copy.noPostsHint}/>:<FeedWindow tasks={feed.items} sessionRole={session?.role} sessionLawyerId={lawyerSession?.lawyerId} canWriteTasks={canWriteTasks}/>} 
    </section>
    <aside className="hidden w-[250px] shrink-0 xl:block"><div className="sticky top-[88px] space-y-4"><Card className="p-4"><h3 className="mb-3 text-[12px] font-extrabold text-navy-800">{copy.quick}</h3><ul className="space-y-1 text-[12.5px] font-bold">
      <li><Link href="/locations" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 hover:bg-ivory-100"><Landmark size={14} className="text-gold-600"/>{copy.courts}</Link></li>
      <li><Link href="/lawyers" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 hover:bg-ivory-100"><Scale size={14} className="text-gold-600"/>{copy.lawyers}</Link></li>
      <li><Link href="/calendar" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 hover:bg-ivory-100"><CalendarClock size={14} className="text-gold-600"/>{copy.calendar}</Link></li>
      <li><Link href="/search" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 hover:bg-ivory-100"><Search size={14} className="text-gold-600"/>{copy.search}</Link></li>
      {session&&<li><Link href={quickTaskHref} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 hover:bg-ivory-100"><ClipboardList size={14} className="text-gold-600"/>{copy.assign}</Link></li>}
      {isAdmin&&<>
        <li><Link href="/admin/clients" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 hover:bg-ivory-100"><Users size={14} className="text-gold-600"/>{copy.clients}</Link></li>
        <li><Link href="/admin?tab=lawyers" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 hover:bg-ivory-100"><Users size={14} className="text-gold-600"/>{copy.addLawyer}</Link></li>
        <li><Link href="/admin?tab=locations" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 hover:bg-ivory-100"><Landmark size={14} className="text-gold-600"/>{copy.addLocation}</Link></li>
        <li><Link href="/admin?tab=cases" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-navy-600 hover:bg-ivory-100"><BriefcaseBusiness size={14} className="text-gold-600"/>{copy.cases}</Link></li>
      </>}
    </ul></Card></div></aside>
  </div>;
}
