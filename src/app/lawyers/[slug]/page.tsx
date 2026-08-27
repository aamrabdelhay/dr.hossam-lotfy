import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toTaskVM, type TaskVM } from '@/lib/queries';
import { TITLE_LABEL } from '@/lib/constants';
import { LawyerProfileEditor } from '@/components/lawyer-profile-editor';

export const metadata: Metadata = { title: 'صفحة المحامي' };

// helpers
function cleanDemo(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/\(تجريبي\)/g, '').replace(/\(تجريبية\)/g, '').replace(/\s{2,}/g, ' ').trim();
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatDayMonth(dateStr: string | null): { dayMonth: string; year: string } {
  if (!dateStr) return { dayMonth: '—', year: '' };
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = d.getFullYear().toString();
    return { dayMonth: `${day} ${month}`, year };
  } catch {
    return { dayMonth: dateStr, year: '' };
  }
}

function formatTimeDisplay(timeStr: string | null): string {
  if (!timeStr) return '';
  // timeStr like "12:30" or "09:30"
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!m) return timeStr;
  let h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, '0')}:${min} ${ampm}`;
}

function formatActivityDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    PENDING: 'SCHEDULED',
    IN_PROGRESS: 'IN PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  };
  return map[s] ?? s;
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    CREATED: 'TASK SCHEDULED',
    EDITED: 'TASK UPDATED',
    ASSIGNED: 'TASK ASSIGNED',
    REASSIGNED: 'TASK REASSIGNED',
    COMPLETED: 'TASK COMPLETED',
    COMMENTED: 'COMMENT ADDED',
    DELETED: 'TASK DELETED',
    PHOTO_UPDATED: 'PROFILE UPDATED',
    PROFILE_UPDATED: 'PROFILE UPDATED',
    LOCATION_ADDED: 'LOCATION ADDED',
    LAWYER_ADDED: 'LAWYER ADDED',
  };
  return map[action] ?? action.replace(/_/g, ' ');
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getFeminineTitle(fullName: string, title: string): string {
  const lower = fullName.toLowerCase();
  if (lower.includes('mona') || lower.includes('sara') || fullName.includes('مونا') || fullName.includes('سارا')) {
    return 'محامية';
  }
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
      activities: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!lawyer) notFound();
  const session = await getCurrentUser();
  const isSelf = session?.role === 'lawyer' && session.lawyerId === lawyer.id;
  const isAdminSession = session?.role === 'admin';

  // A self-registered lawyer who is still waiting for approval has no public
  // profile — only the office (or the lawyer's own pending session) may see it.
  if (!lawyer.approvedAt && !isSelf && !isAdminSession) notFound();
  const pendingApproval = !lawyer.approvedAt;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const allVMs: TaskVM[] = lawyer.assignments.map((a) => toTaskVM(a.task as never));
  const upcomingVMs = allVMs.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (t.scheduledDate == null || new Date(t.scheduledDate) >= today),
  );
  const completedVMs = allVMs.filter((t) => t.status === 'COMPLETED' || t.completedAt != null);
  const activeCount = allVMs.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;

  // Cleaned fields
  const specializationClean = cleanDemo(lawyer.specialization) || '—';
  const bioClean = cleanDemo(lawyer.bio);
  const fullNameUpper = lawyer.fullName.toUpperCase();
  const initials = getInitials(lawyer.fullName);

  // For مجالات العمل — try to derive from specialization or use fallback
  const workFields = specializationClean.includes('التسجيل') || specializationClean.includes('العقاري')
    ? 'البيع — نقل الملكية — الرهن'
    : specializationClean;

  return (
    <div className="min-h-screen bg-[#F4F6F9]" style={{ backgroundColor: '#F4F6F9' }}>
      <div className="mx-auto w-full max-w-[1200px] px-6 py-10 sm:px-8 lg:px-12">
        {/* Minimal stats bar */}
        <div className="mb-10 flex flex-wrap items-center gap-2.5 border-b border-[#E8ECF2] pb-5">
          <span className="rounded-full bg-white px-3.5 py-1.5 text-[10.5px] font-bold tracking-[1px] uppercase text-[#5B6B84] shadow-soft ring-1 ring-[#E8ECF2]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '1px' }}>
            UPCOMING SESSIONS <span className="ms-1.5 text-[14px] text-[#1D2433]">{pad2(upcomingVMs.length)}</span>
          </span>
          <span className="rounded-full bg-white px-3.5 py-1.5 text-[10.5px] font-bold tracking-[1px] uppercase text-[#5B6B84] shadow-soft ring-1 ring-[#E8ECF2]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '1px' }}>
            ACTIVE TASKS <span className="ms-1.5 text-[14px] text-[#1D2433]">{pad2(activeCount)}</span>
          </span>
          <span className="rounded-full bg-white px-3.5 py-1.5 text-[10.5px] font-bold tracking-[1px] uppercase text-[#5B6B84] shadow-soft ring-1 ring-[#E8ECF2]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '1px' }}>
            COMPLETED TASKS <span className="ms-1.5 text-[14px] text-[#1D2433]">{pad2(completedVMs.length)}</span>
          </span>
        </div>

        {/* 02 — LAWYER PROFILE HERO */}
        <div className="grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-16">
          {/* Photo left */}
          <div>
            <div className="relative">
              <span aria-hidden className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-gold-500/15 via-transparent to-navy-600/15 blur-sm" />
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-[#D9DFE9] bg-white shadow-card">
                {lawyer.profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lawyer.profilePhotoUrl} alt={lawyer.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#FBFCFD] to-[#EAEFF4]">
                    <span
                      className="text-[56px] font-semibold text-[#1D2433]"
                      style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, letterSpacing: '1px' }}
                    >
                      {initials}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info right */}
          <div className="flex flex-col justify-center">
            <h1
              className="text-[2.4rem] font-bold uppercase tracking-[1px] text-[#1D2433] leading-[1.15]"
              style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '1px' }}
            >
              {fullNameUpper}
            </h1>
            <p
              className="mt-3 text-[11px] font-bold tracking-[2px] uppercase text-[#A07E2C]"
              style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '2px' }}
            >
              Attorney at Law
            </p>
            <div className="my-4 h-px w-10 bg-[#A07E2C]" style={{ backgroundColor: '#A07E2C' }} />
            <p
              className="text-[14px] text-[#5B6B84] leading-7"
              style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
            >
              {specializationClean}
            </p>
            {bioClean && (
              <p
                className="mt-5 max-w-[560px] text-[13px] leading-7 text-[#1D2433]/80"
                style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
              >
                {bioClean}
              </p>
            )}
            <p
              className="mt-8 text-[10px] font-bold tracking-[2px] uppercase text-[#A07E2C]"
              style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '2px', color: '#A07E2C' }}
            >
              DR. HOSSAM LOTFY LAW FIRM
            </p>

            {isSelf && (
              <div className="mt-5">
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

            {/* Contact minimal */}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {lawyer.phone && (
                <a href={`tel:${lawyer.phone}`} className="rounded-full border border-[#E8ECF2] bg-white px-4 py-2 text-[12px] text-[#5B6B84] shadow-soft transition-all hover:border-gold-500/40 hover:text-[#1D2433]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }} dir="ltr">
                  {lawyer.phone}
                </a>
              )}
              {/* Public contact = name + phone only. E-mail is private (office / owner). */}
              {(isSelf || isAdminSession) && lawyer.email && (
                <a href={`mailto:${lawyer.email}`} className="rounded-full border border-[#E8ECF2] bg-white px-4 py-2 text-[12px] text-[#5B6B84] shadow-soft transition-all hover:border-gold-500/40 hover:text-[#1D2433]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }} dir="ltr">
                  {lawyer.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 03 — PROFESSIONAL PROFILE */}
        <div className="mt-16">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#A07E2C]/[0.08] px-3.5 py-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-[#A07E2C] ring-1 ring-inset ring-[#A07E2C]/20" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '1.5px' }}>
            PROFESSIONAL PROFILE
          </p>
          <div className="mt-4 max-w-[720px] border-t border-[#E8ECF2]">
            {[
              { label: 'الاسم', value: lawyer.fullName },
              { label: 'الصفة', value: getFeminineTitle(lawyer.fullName, lawyer.title) },
              { label: 'المكتب', value: 'DR. HOSSAM LOTFY LAW FIRM' },
              { label: 'التخصص', value: specializationClean },
              { label: 'مجالات العمل', value: workFields },
              { label: 'الحالة', value: pendingApproval ? 'بانتظار الاعتماد' : 'ACTIVE', isBadge: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-[#E8ECF2] py-3">
                <span className="text-[13px] text-[#5B6B84]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                  {row.label}
                </span>
                {row.isBadge ? (
                  <span
                    className="border border-[#1D2433] px-2 py-0.5 text-[9px] tracking-[1px] uppercase text-[#1D2433]"
                    style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '1px' }}
                  >
                    {row.value}
                  </span>
                ) : (
                  <span className="text-[13px] font-medium text-[#1D2433]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                    {row.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 04 — UPCOMING SESSIONS */}
        <div className="mt-16">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#A07E2C]/[0.08] px-3.5 py-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-[#A07E2C] ring-1 ring-inset ring-[#A07E2C]/20" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '1.5px' }}>
            UPCOMING SESSIONS
          </p>
          <h2 className="mt-2.5 text-[1.15rem] font-bold text-[#1D2433]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            الجلسات والمواعيد القادمة
          </h2>

          <div className="mt-6 border-t border-[#E8ECF2]">
            {upcomingVMs.length === 0 ? (
              <p className="py-8 text-[13px] text-[#5B6B84]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                لا توجد جلسات قادمة حالياً
              </p>
            ) : (
              upcomingVMs.map((task) => {
                const { dayMonth, year } = formatDayMonth(task.scheduledDate);
                const time = formatTimeDisplay(task.scheduledTime);
                const locName = cleanDemo(task.location.name);
                const desc = cleanDemo(task.description);
                return (
                  <div key={task.id} className="grid grid-cols-[90px_110px_1fr] gap-4 border-b border-[#E8ECF2] py-5 sm:gap-6">
                    {/* Date */}
                    <div>
                      <p className="text-[1.1rem] leading-none text-[#1D2433]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                        {dayMonth}
                      </p>
                      <p className="mt-1 text-[11px] tracking-[1px] text-[#5B6B84]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                        {year}
                      </p>
                    </div>
                    {/* Time */}
                    <div>
                      <p className="text-[11px] tracking-[1px] text-[#1D2433]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                        {time || '—'}
                      </p>
                      <div className="mt-2 h-px w-12 bg-[#E8ECF2]" />
                      <p className="mt-2 text-[9px] tracking-[1px] uppercase text-[#5B6B84]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                        {statusLabel(task.status)}
                      </p>
                    </div>
                    {/* Info */}
                    <div className="min-w-0">
                      <Link href={`/locations/${task.location.slug}`} className="text-[12px] text-[#5B6B84] hover:text-[#1D2433] transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                        {locName}
                      </Link>
                      <Link href={`/sessions/${task.id}`} className="mt-1 block text-[13px] font-medium text-[#1D2433] hover:underline" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                        {desc}
                      </Link>
                      <div className="mt-3 flex gap-4">
                        <Link href={`/sessions/${task.id}`} className="text-[11px] tracking-[0.5px] text-[#D4AF51] hover:text-[#1D2433] transition-colors" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                          التفاصيل
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 05 — LEGAL TASKS */}
        <div className="mt-16">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#A07E2C]/[0.08] px-3.5 py-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-[#A07E2C] ring-1 ring-inset ring-[#A07E2C]/20" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '1.5px' }}>
            LEGAL TASKS
          </p>
          <h2 className="mt-2.5 text-[1.15rem] font-bold text-[#1D2433]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            المهام القانونية
          </h2>

          <div className="mt-6 border-t border-[#E8ECF2]">
            {allVMs.length === 0 ? (
              <p className="py-8 text-[13px] text-[#5B6B84]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                لا توجد مهام مسجلة
              </p>
            ) : (
              allVMs.map((task) => {
                const locName = cleanDemo(task.location.name);
                const desc = cleanDemo(task.description);
                return (
                  <div key={`task-${task.id}`} className="flex items-center justify-between gap-4 border-b border-[#E8ECF2] py-4">
                    <div className="min-w-0 flex-1">
                      <Link href={`/sessions/${task.id}`} className="block truncate text-[13px] font-medium text-[#1D2433] hover:underline" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                        {desc}
                      </Link>
                      <Link href={`/locations/${task.location.slug}`} className="mt-1 block text-[12px] text-[#5B6B84]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                        {locName}
                      </Link>
                    </div>
                    <span className="shrink-0 text-[9px] tracking-[1px] uppercase text-[#5B6B84]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '1px' }}>
                      {statusLabel(task.status)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 06 — RECENT LEGAL ACTIVITY */}
        <div className="mt-16">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#A07E2C]/[0.08] px-3.5 py-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-[#A07E2C] ring-1 ring-inset ring-[#A07E2C]/20" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '1.5px' }}>
            RECENT LEGAL ACTIVITY
          </p>
          <h2 className="mt-2.5 text-[1.15rem] font-bold text-[#1D2433]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            النشاط القانوني الأخير
          </h2>

          <div className="mt-6 border-t border-[#E8ECF2]">
            {lawyer.activities.length === 0 && completedVMs.length === 0 ? (
              <p className="py-8 text-[13px] text-[#5B6B84]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                لا يوجد نشاط حديث
              </p>
            ) : (
              <>
                {/* Activities from ActivityLog */}
                {lawyer.activities.map((act) => {
                  const dateStr = formatActivityDate(act.createdAt);
                  const typeLabel = actionLabel(act.action);
                  const summary = cleanDemo(act.summary);
                  return (
                    <div key={act.id} className="grid grid-cols-[110px_130px_1fr] gap-4 border-b border-[#E8ECF2] py-4">
                      <span className="font-mono text-[11px] text-[#5B6B84]">{dateStr}</span>
                      <span className="text-[9px] tracking-[1px] uppercase text-[#1D2433]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '1px' }}>
                        {typeLabel}
                      </span>
                      <span className="text-[13px] text-[#1D2433]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                        {summary}
                      </span>
                    </div>
                  );
                })}
                {/* Fallback: show completed tasks as activity if no activity log */}
                {lawyer.activities.length === 0 &&
                  completedVMs.map((task) => {
                    const dateStr = task.completedAt ? formatActivityDate(new Date(task.completedAt)) : task.scheduledDate ? formatActivityDate(new Date(task.scheduledDate)) : '';
                    return (
                      <div key={`completed-${task.id}`} className="grid grid-cols-[110px_130px_1fr] gap-4 border-b border-[#E8ECF2] py-4">
                        <span className="font-mono text-[11px] text-[#5B6B84]">{dateStr}</span>
                        <span className="text-[9px] tracking-[1px] uppercase text-[#1D2433]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                          TASK COMPLETED
                        </span>
                        <Link href={`/sessions/${task.id}`} className="text-[13px] text-[#1D2433] hover:underline" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                          {cleanDemo(task.description)}
                        </Link>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
