import Link from 'next/link';
import { Archive, ArrowLeft, CalendarDays, UserRound } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatDay } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function CaseArchivePage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cases = await prisma.caseRecord.findMany({
    where: {
      tasks: { some: { scheduledDate: { lt: today } } },
    },
    include: {
      events: { orderBy: { createdAt: 'desc' } },
      tasks: {
        where: { scheduledDate: { lt: today } },
        orderBy: [{ scheduledDate: 'desc' }, { scheduledTime: 'desc' }],
        take: 20,
        include: {
          location: { select: { name: true } },
          assignees: { include: { lawyer: { select: { fullName: true } } } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="min-h-[calc(100vh-68px)] bg-ivory-100 px-4 py-8 sm:px-6 lg:px-10" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-gold-700"><Archive size={18} /><span className="text-xs font-bold tracking-widest">CASE ARCHIVE</span></div>
            <h1 className="text-2xl font-extrabold text-navy-950 sm:text-3xl">أرشيف القضايا</h1>
            <p className="mt-1 text-sm font-medium text-navy-400">القضايا التي انتهت مواعيد جلساتها مع الاحتفاظ بسجلها وتاريخها.</p>
          </div>
          <Link href="/" className="flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-xs font-bold text-navy-600 shadow-soft transition hover:text-gold-700"><ArrowLeft size={14} /> الرئيسية</Link>
        </div>

        {cases.length === 0 ? (
          <div className="rounded-3xl border border-navy-100 bg-white p-12 text-center shadow-soft">
            <Archive className="mx-auto mb-3 text-gold-500" size={30} />
            <h2 className="font-extrabold text-navy-900">لا توجد قضايا مؤرشفة بعد</h2>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {cases.map((c) => (
              <article key={c.id} className="overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-soft">
                <div className="border-b border-navy-100 bg-gradient-to-l from-navy-950 to-navy-900 px-5 py-4 text-white">
                  <h2 className="font-extrabold">{c.clientName || c.name}</h2>
                  {c.clientName && <p className="mt-1 text-xs text-gold-300">القضية: {c.name} — {c.number}</p>}
                </div>
                <div className="space-y-3 p-5">
                  {c.tasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-navy-100 bg-ivory-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-navy-500"><CalendarDays size={13} className="text-gold-600" />{task.scheduledDate ? formatDay(task.scheduledDate) : 'بدون تاريخ'}{task.scheduledTime ? ` — ${task.scheduledTime}` : ''}</div>
                      <p className="mt-1 text-sm font-bold text-navy-900">{task.description || 'جلسة / مهمة'}</p>
                      <p className="mt-1 text-xs text-navy-400">{task.location.name}</p>
                      {task.assignees.length > 0 && <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-navy-400"><UserRound size={12} />{task.assignees.map((a) => a.lawyer.fullName).join('، ')}</p>}
                    </div>
                  ))}
                  {c.events.length > 0 && (
                    <div className="border-t border-navy-100 pt-3">
                      <p className="mb-2 text-xs font-extrabold text-navy-700">السجل</p>
                      <div className="space-y-2">
                        {c.events.slice(0, 8).map((e) => <div key={e.id} className="text-xs text-navy-500"><span className="font-bold text-gold-700">{formatDay(e.createdAt)}:</span> {e.description}</div>)}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
