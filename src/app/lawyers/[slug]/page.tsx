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
    <div className="min-h-screen bg-navy-950">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-10 sm:px-8 lg:px-12">
        {/* Minimal stats bar */}
        <div className="mb-10 flex flex-wrap items-center gap-2.5 border-b border-white/[0.06] pb-5">
          <span className="rounded-full bg-navy-850 px-3.5 py-1.5 text-[10.5px] font-bold tracking-[1px] uppercase text-navy-300 shadow-soft ring-1 ring-white/10" style={{ fontFamily: 'var(--font-arabic)', letterSpacing: '1px' }}>
            UPCOMING SESSIONS <span className="ms-1.5 text-[14px] text-ivory-100">{pad2(upcomingVMs.length)}</span>
          </span>
          <span className="rounded-full bg-navy-850 px-3.5 py-1.5 text-[10.5px] font-bold tracking-[1px] uppercase text-navy-300 shadow-soft ring-1 ring-white/10" style={{ fontFamily: 'var(--font-arabic)', letterSpacing: '1px' }}>
            ACTIVE TASKS <span className="ms-1.5 text-[14px] text-ivory-100">{pad2(activeCount)}</span>
          </span>
          <span className="rounded-full bg-navy-850 px-3.5 py-1.5 text-[10.5px] font-bold tracking-[1px] uppercase text-navy-300 shadow-soft ring-1 ring-white/10" style={{ fontFamily: 'var(--font-arabic)', letterSpacing: '1px' }}>
            COMPLETED TASKS <span className="ms-1.5 text-[14px] text-ivory-100">{pad2(completedVMs.length)}</span>
          </span>
        </div>

        {/* 02 — LAWYER PROFILE HERO */}
        <div className="grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-16">
          {/* Photo left */}
          <div>
            <div className="relative">
              <span aria-hidden className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-gold-500/15 via-transparent to-navy-600/15 blur-sm" />
              <div className="group relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-white/10 bg-navy-850 shadow-card">
                {lawyer.profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lawyer.profilePhotoUrl} alt={lawyer.fullName} className="h-full w-full object-cover grayscale transition-all duration-500 group-hover:scale-[1.02] group-hover:grayscale-0" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-navy-700 to-navy-800">
                    <span
                      className="text-[56px] font-semibold text-ivory-100"
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
              className="text-[2.4rem] font-bold uppercase tracking-[1px] text-ivory-100 leading-[1.15]"
              style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '1px' }}
            >
              {fullNameUpper}
            </h1>
            <p
              className="mt-3 text-[11px] font-bold tracking-[2px] uppercase text-gold-500"
              style={{ fontFamily: 'var(--font-arabic)', letterSpacing: '2px' }}
            >
              Attorney at Law
            </p>
            <div className="my-4 h-px w-10 bg-gold-500" style={{ backgroundColor: '#C8FF3D' }} />
            <p
              className="text-[14px] text-navy-300 leading-7"
              style={{ fontFamily: 'var(--font-arabic)' }}
            >
              {specializationClean}
            </p>
            {bioClean && (
              <p
                className="mt-5 max-w-[560px] text-[13px] leading-7 text-ivory-100/80"
                style={{ fontFamily: 'var(--font-arabic)' }}
              >
                {bioClean}
              </p>
            )}
            <p
              className="mt-8 text-[10px] font-bold tracking-[2px] uppercase text-gold-500"
              style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', color: '#C8FF3D' }}
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
                <a href={`tel:${lawyer.phone}`} className="rounded-full border border-white/[0.06] bg-navy-850 px-4 py-2 text-[12px] text-navy-300 shadow-soft transition-all hover:border-gold-500/40 hover:text-ivory-100" style={{ fontFamily: 'var(--font-arabic)' }} dir="ltr">
                  {lawyer.phone}
                </a>
              )}
              {lawyer.email && (
                <a href={`mailto:${lawyer.email}`} className="rounded-full border border-white/[0.06] bg-navy-850 px-4 py-2 text-[12px] text-navy-300 shadow-soft transition-all hover:border-gold-500/40 hover:text-ivory-100" style={{ fontFamily: 'var(--font-arabic)' }} dir="ltr">
                  {lawyer.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 03 — PROFESSIONAL PROFILE */}
        <div className="mt-16">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-gold-500/[0.08] px-3.5 py-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-gold-500 ring-1 ring-inset ring-gold-500/25" style={{ fontFamily: 'var(--font-arabic)', letterSpacing: '1.5px' }}>
            PROFESSIONAL PROFILE
          </p>
          <div className="mt-4 max-w-[720px] border-t border-white/[0.06]">
            {[
              { label: 'الاسم', value: lawyer.fullName },
              { label: 'الصفة', value: getFeminineTitle(lawyer.fullName, lawyer.title) },
              { label: 'المكتب', value: 'DR. HOSSAM LOTFY LAW FIRM' },
              { label: 'التخصص', value: specializationClean },
              { label: 'مجالات العمل', value: workFields },
              { label: 'الحالة', value: 'ACTIVE', isBadge: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-white/[0.06] py-3">
                <span className="text-[13px] text-navy-300" style={{ fontFamily: 'var(--font-arabic)' }}>
                  {row.label}
                </span>
                {row.isBadge ? (
                  <span
                    className="border border-gold-500/40 px-2 py-0.5 text-[9px] tracking-[1px] uppercase text-gold-500"
                    style={{ fontFamily: 'var(--font-arabic)', letterSpacing: '1px' }}
                  >
                    {row.value}
                  </span>
                ) : (
                  <span className="text-[13px] font-medium text-ivory-100" style={{ fontFamily: 'var(--font-arabic)' }}>
                    {row.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 04 — UPCOMING SESSIONS */}
        <div className="mt-16">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-gold-500/[0.08] px-3.5 py-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-gold-500 ring-1 ring-inset ring-gold-500/25" style={{ fontFamily: 'var(--font-arabic)', letterSpacing: '1.5px' }}>
            UPCOMING SESSIONS
          </p>
          <h2 className="mt-2.5 text-[1.15rem] font-bold text-ivory-100" style={{ fontFamily: 'var(--font-arabic)' }}>
            الجلسات والمواعيد القادمة
          </h2>

          <div className="mt-6 border-t border-white/[0.06]">
            {upcomingVMs.length === 0 ? (
              <p className="py-8 text-[13px] text-navy-300" style={{ fontFamily: 'var(--font-arabic)' }}>
                لا توجد جلسات قادمة حالياً
              </p>
            ) : (
              upcomingVMs.map((task) => {
                const { dayMonth, year } = formatDayMonth(task.scheduledDate);
                const time = formatTimeDisplay(task.scheduledTime);
                const locName = cleanDemo(task.location.name);
                const desc = cleanDemo(task.description);
                const mapsHref = task.location.address
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.location.address)}`
                  : null;
                return (
                  <div key={task.id} className="grid grid-cols-[90px_110px_1fr] gap-4 border-b border-white/[0.06] py-5 sm:gap-6">
                    {/* Date */}
                    <div>
                      <p className="text-[1.1rem] leading-none text-ivory-100" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {dayMonth}
                      </p>
                      <p className="mt-1 text-[11px] tracking-[1px] text-navy-300" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {year}
                      </p>
                    </div>
                    {/* Time */}
                    <div>
                      <p className="text-[11px] tracking-[1px] text-ivory-100" style={{ fontFamily: 'var(--font-arabic)' }}>
                        {time || '—'}
                      </p>
                      <div className="mt-2 h-px w-12 bg-white/10" />
                      <p className="mt-2 text-[9px] tracking-[1px] uppercase text-navy-300" style={{ fontFamily: 'var(--font-arabic)' }}>
                        {statusLabel(task.status)}
                      </p>
                    </div>
                    {/* Info */}
                    <div className="min-w-0">
                      <Link href={`/locations/${task.location.slug}`} className="text-[12px] text-navy-300 hover:text-ivory-100 transition-colors" style={{ fontFamily: 'var(--font-arabic)' }}>
                        {locName}
                      </Link>
                      <Link href={`/sessions/${task.id}`} className="mt-1 block text-[13px] font-medium text-ivory-100 hover:underline" style={{ fontFamily: 'var(--font-arabic)' }}>
                        {desc}
                      </Link>
                      <div className="mt-3 flex gap-4">
                        <Link href={`/sessions/${task.id}`} className="text-[11px] tracking-[0.5px] text-gold-500 hover:text-ivory-100 transition-colors" style={{ fontFamily: 'var(--font-arabic)' }}>
                          التفاصيل
                        </Link>
                        {mapsHref && (
                          <a href={mapsHref} target="_blank" rel="noreferrer" className="text-[11px] tracking-[0.5px] text-navy-300 hover:text-ivory-100 transition-colors" style={{ fontFamily: 'var(--font-arabic)' }}>
                            الاتجاهات
                          </a>
                        )}
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
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-gold-500/[0.08] px-3.5 py-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-gold-500 ring-1 ring-inset ring-gold-500/25" style={{ fontFamily: 'var(--font-arabic)', letterSpacing: '1.5px' }}>
            LEGAL TASKS
          </p>
          <h2 className="mt-2.5 text-[1.15rem] font-bold text-ivory-100" style={{ fontFamily: 'var(--font-arabic)' }}>
            المهام القانونية
          </h2>

          <div className="mt-6 border-t border-white/[0.06]">
            {allVMs.length === 0 ? (
              <p className="py-8 text-[13px] text-navy-300" style={{ fontFamily: 'var(--font-arabic)' }}>
                لا توجد مهام مسجلة
              </p>
            ) : (
              allVMs.map((task) => {
                const locName = cleanDemo(task.location.name);
                const desc = cleanDemo(task.description);
                return (
                  <div key={`task-${task.id}`} className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-4">
                    <div className="min-w-0 flex-1">
                      <Link href={`/sessions/${task.id}`} className="block truncate text-[13px] font-medium text-ivory-100 hover:underline" style={{ fontFamily: 'var(--font-arabic)' }}>
                        {desc}
                      </Link>
                      <Link href={`/locations/${task.location.slug}`} className="mt-1 block text-[12px] text-navy-300" style={{ fontFamily: 'var(--font-arabic)' }}>
                        {locName}
                      </Link>
                    </div>
                    <span className="shrink-0 text-[9px] tracking-[1px] uppercase text-navy-300" style={{ fontFamily: 'var(--font-arabic)', letterSpacing: '1px' }}>
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
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-gold-500/[0.08] px-3.5 py-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-gold-500 ring-1 ring-inset ring-gold-500/25" style={{ fontFamily: 'var(--font-arabic)', letterSpacing: '1.5px' }}>
            RECENT LEGAL ACTIVITY
          </p>
          <h2 className="mt-2.5 text-[1.15rem] font-bold text-ivory-100" style={{ fontFamily: 'var(--font-arabic)' }}>
            النشاط القانوني الأخير
          </h2>

          <div className="mt-6 border-t border-white/[0.06]">
            {lawyer.activities.length === 0 && completedVMs.length === 0 ? (
              <p className="py-8 text-[13px] text-navy-300" style={{ fontFamily: 'var(--font-arabic)' }}>
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
                    <div key={act.id} className="grid grid-cols-[110px_130px_1fr] gap-4 border-b border-white/[0.06] py-4">
                      <span className="font-mono text-[11px] text-navy-300">{dateStr}</span>
                      <span className="text-[9px] tracking-[1px] uppercase text-ivory-100" style={{ fontFamily: 'var(--font-arabic)', letterSpacing: '1px' }}>
                        {typeLabel}
                      </span>
                      <span className="text-[13px] text-ivory-100" style={{ fontFamily: 'var(--font-arabic)' }}>
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
                      <div key={`completed-${task.id}`} className="grid grid-cols-[110px_130px_1fr] gap-4 border-b border-white/[0.06] py-4">
                        <span className="font-mono text-[11px] text-navy-300">{dateStr}</span>
                        <span className="text-[9px] tracking-[1px] uppercase text-ivory-100" style={{ fontFamily: 'var(--font-arabic)' }}>
                          TASK COMPLETED
                        </span>
                        <Link href={`/sessions/${task.id}`} className="text-[13px] text-ivory-100 hover:underline" style={{ fontFamily: 'var(--font-arabic)' }}>
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
