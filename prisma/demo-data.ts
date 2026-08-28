import 'server-only';
import { prisma } from '@/lib/prisma';
import type { LawyerTitle, TaskStatus } from '@/lib/prisma';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * بيانات الاختبار (demo data)
 *
 * The office needs to flip between two modes from the admin area:
 *
 *  • «مسح بيانات الاختبار» — wipe every operational record so the platform can
 *    be used for real work: tasks, assignments, comments, cases + their event
 *    history, notifications, activity log and lawyer profiles.
 *
 *  • «استرجاع البيانات» — recreate a deterministic demo dataset to try things
 *    out again.
 *
 * Two things are NEVER touched, because losing them would lock the office out
 * or destroy reference data that is expensive to rebuild:
 *
 *  • `users`      — the staff/admin accounts you sign in with.
 *  • `locations`  — the 149-place legal directory synced on every deploy.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Suffix that tags every generated demo record. */
export const DEMO_TAG = '(ديمو)';

export type DemoStatus = {
  /** True when a demo dataset is currently present. */
  demoPresent: boolean;
  counts: {
    lawyers: number;
    tasks: number;
    cases: number;
    comments: number;
    notifications: number;
    activity: number;
  };
};

export async function getDemoStatus(): Promise<DemoStatus> {
  const [lawyers, tasks, cases, comments, notifications, activity, demoTasks, demoLawyers] = await Promise.all([
    prisma.lawyer.count(),
    prisma.task.count(),
    prisma.caseRecord.count(),
    prisma.comment.count(),
    prisma.notification.count(),
    prisma.activityLog.count(),
    prisma.task.count({ where: { description: { contains: DEMO_TAG } } }),
    prisma.lawyer.count({ where: { bio: { contains: DEMO_TAG } } }),
  ]);
  return {
    demoPresent: demoTasks > 0 || demoLawyers > 0,
    counts: { lawyers, tasks, cases, comments, notifications, activity },
  };
}

/**
 * Wipe all operational data. Deletion order matters even with cascades in
 * place — dependants first keeps the statement list valid on databases where a
 * constraint was created without ON DELETE CASCADE.
 */
export async function clearDemoData(): Promise<DemoStatus['counts']> {
  const before = (await getDemoStatus()).counts;

  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.caseEvent.deleteMany();
  await prisma.caseRecord.deleteMany();
  await prisma.accessToken.deleteMany();
  await prisma.lawyer.deleteMany();

  return before;
}

const dayOffset = (days: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Recreate the demo dataset. Idempotent: it clears first, so pressing the
 * button twice yields exactly the same state.
 */
export async function restoreDemoData(): Promise<DemoStatus['counts']> {
  await clearDemoData();

  const mk = (i: number, data: {
    slug: string;
    fullName: string;
    title: LawyerTitle;
    specialization: string;
    bio: string;
    position: string;
    isPrincipal?: boolean;
  }) => prisma.lawyer.create({ data: { sortOrder: i, approvedAt: new Date(), ...data } });

  const principal = await mk(0, {
    slug: 'dr-hossam-lotfy',
    fullName: 'DR. Hossam Lotfy',
    title: 'DOCTOR' as LawyerTitle,
    specialization: 'محامٍ أمام محكمة النقض والمحاكم الدستورية والإدارية العليا',
    bio: `مؤسس ورئيس المكتب. ${DEMO_TAG}`,
    position: 'Founder & Senior Partner',
    isPrincipal: true,
  });
  const ahmed = await mk(1, {
    slug: 'ahmed-el-seidi',
    fullName: 'Ahmed El-Seidi',
    title: 'ADVOCATE' as LawyerTitle,
    specialization: 'القضايا التجارية والبنكية',
    bio: `محامي بالاستئناف العالي. ${DEMO_TAG}`,
    position: 'Senior Advocate',
  });
  const mohamed = await mk(2, {
    slug: 'mohamed-ahmed',
    fullName: 'Mohamed Ahmed',
    title: 'ADVOCATE' as LawyerTitle,
    specialization: 'القضايا المدنية والعقارية',
    bio: `متخصص في منازعات الملكية. ${DEMO_TAG}`,
    position: 'Advocate',
  });

  const court =
    (await prisma.location.findFirst({ where: { name: { contains: 'شمال الجيزة الابتدائية' } } })) ??
    (await prisma.location.findFirst({ where: { type: 'COURT' } }));
  const tax = (await prisma.location.findFirst({ where: { type: 'TAX_OFFICE' } })) ?? court;

  if (!court || !tax) {
    throw new Error('لا توجد أماكن مسجلة بعد — لا يمكن إنشاء بيانات الاختبار.');
  }

  // A case whose date has already passed → shows up in /cases/archive with no
  // future date, i.e. "تحتاج متابعة".
  const overdueCase = await prisma.caseRecord.create({
    data: {
      name: `قضية تعويض مدني ${DEMO_TAG}`,
      number: '1180/2025',
      clientName: 'شركة النيل للتجارة',
      events: {
        create: [
          { description: `تم فتح الملف ${DEMO_TAG}`, type: 'note', authorName: 'الإدارة' },
          { description: `تم تحديد جلسة أولى ${DEMO_TAG}`, type: 'note', authorName: 'الإدارة' },
        ],
      },
    },
  });

  // A case that was adjourned to a new date → "تأجّلت / لها موعد قادم".
  const adjournedCase = await prisma.caseRecord.create({
    data: {
      name: `استئناف حكم تجاري ${DEMO_TAG}`,
      number: '742/2026',
      clientName: 'أحمد عبد الرحمن',
      events: {
        create: [{ description: `تأجلت الجلسة لجلسة جديدة ${DEMO_TAG}`, type: 'note', authorName: 'الإدارة' }],
      },
    },
  });

  await prisma.task.create({
    data: {
      locationId: court.id,
      caseId: overdueCase.id,
      description: `حضور جلسة تعويض ${DEMO_TAG}`,
      scheduledDate: dayOffset(-9),
      scheduledTime: '10:00',
      status: 'PENDING' as TaskStatus,
      assignees: { create: [{ lawyerId: ahmed.id }] },
    },
  });
  await prisma.task.create({
    data: {
      locationId: court.id,
      caseId: adjournedCase.id,
      description: `جلسة استئناف — أُجّلت ${DEMO_TAG}`,
      scheduledDate: dayOffset(-3),
      scheduledTime: '09:00',
      status: 'COMPLETED' as TaskStatus,
      completedAt: new Date(),
      assignees: { create: [{ lawyerId: mohamed.id }] },
    },
  });
  await prisma.task.create({
    data: {
      locationId: court.id,
      caseId: adjournedCase.id,
      description: `الجلسة الجديدة بعد التأجيل ${DEMO_TAG}`,
      scheduledDate: dayOffset(6),
      scheduledTime: '09:30',
      status: 'PENDING' as TaskStatus,
      assignees: { create: [{ lawyerId: mohamed.id }, { lawyerId: ahmed.id }] },
    },
  });
  await prisma.task.create({
    data: {
      locationId: court.id,
      description: `حضور جلسة واحدة ${DEMO_TAG}`,
      scheduledDate: dayOffset(1),
      scheduledTime: '09:30',
      status: 'PENDING' as TaskStatus,
      assignees: { create: [{ lawyerId: ahmed.id }, { lawyerId: mohamed.id }] },
    },
  });
  await prisma.task.create({
    data: {
      locationId: tax.id,
      description: `فصل ضريبي ${DEMO_TAG}`,
      scheduledDate: dayOffset(3),
      status: 'PENDING' as TaskStatus,
      assignees: { create: [{ lawyerId: principal.id }] },
    },
  });

  return (await getDemoStatus()).counts;
}
