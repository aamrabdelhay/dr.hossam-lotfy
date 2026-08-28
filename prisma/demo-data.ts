import 'server-only';
import { prisma } from '@/lib/prisma';
import type { LawyerTitle, TaskStatus } from '@/lib/prisma';
import { DEMO_TAG } from '@/lib/demo-mode';

export type DemoStatus = {
  demoPresent: boolean;
  counts: { lawyers: number; tasks: number; cases: number; comments: number; notifications: number; activity: number };
};

export async function getDemoStatus(): Promise<DemoStatus> {
  const [lawyers, tasks, cases, comments, notifications, activity] = await Promise.all([
    prisma.lawyer.count({ where: { bio: { contains: DEMO_TAG } } }),
    prisma.task.count({ where: { description: { contains: DEMO_TAG } } }),
    prisma.caseRecord.count({ where: { name: { contains: DEMO_TAG } } }),
    prisma.comment.count({ where: { task: { description: { contains: DEMO_TAG } } } }),
    prisma.notification.count({ where: { lawyer: { bio: { contains: DEMO_TAG } } } }),
    prisma.activityLog.count({ where: { OR: [{ task: { description: { contains: DEMO_TAG } } }, { lawyer: { bio: { contains: DEMO_TAG } } }] } }),
  ]);
  return { demoPresent: lawyers + tasks + cases > 0, counts: { lawyers, tasks, cases, comments, notifications, activity } };
}

/** Delete ONLY records explicitly tagged as demo. Real records are never touched. */
export async function clearDemoData(): Promise<DemoStatus['counts']> {
  const before = (await getDemoStatus()).counts;
  const demoTasks = await prisma.task.findMany({ where: { description: { contains: DEMO_TAG } }, select: { id: true } });
  const demoCases = await prisma.caseRecord.findMany({ where: { name: { contains: DEMO_TAG } }, select: { id: true } });
  const demoLawyers = await prisma.lawyer.findMany({ where: { bio: { contains: DEMO_TAG } }, select: { id: true } });
  const taskIds = demoTasks.map((x) => x.id);
  const caseIds = demoCases.map((x) => x.id);
  const lawyerIds = demoLawyers.map((x) => x.id);

  await prisma.$transaction(async (tx) => {
    if (taskIds.length) {
      await tx.activityLog.deleteMany({ where: { taskId: { in: taskIds } } });
      await tx.notification.deleteMany({ where: { lawyerId: { in: lawyerIds } } });
      await tx.comment.deleteMany({ where: { taskId: { in: taskIds } } });
      await tx.taskAssignment.deleteMany({ where: { taskId: { in: taskIds } } });
      await tx.task.deleteMany({ where: { id: { in: taskIds } } });
    }
    if (caseIds.length) {
      await tx.caseEvent.deleteMany({ where: { caseId: { in: caseIds } } });
      await tx.caseRecord.deleteMany({ where: { id: { in: caseIds } } });
    }
    if (lawyerIds.length) {
      await tx.activityLog.deleteMany({ where: { lawyerId: { in: lawyerIds } } });
      await tx.notification.deleteMany({ where: { lawyerId: { in: lawyerIds } } });
      await tx.accessToken.deleteMany({ where: { lawyerId: { in: lawyerIds } } });
      await tx.taskAssignment.deleteMany({ where: { lawyerId: { in: lawyerIds } } });
      await tx.lawyer.deleteMany({ where: { id: { in: lawyerIds } } });
    }
  });
  return before;
}

const dayOffset = (days: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

export async function restoreDemoData(): Promise<DemoStatus['counts']> {
  // IMPORTANT: this clears demo records only. Real production records remain untouched.
  await clearDemoData();

  const mk = (i: number, data: { slug: string; fullName: string; title: LawyerTitle; specialization: string; bio: string; position: string; isPrincipal?: boolean }) =>
    prisma.lawyer.create({ data: { sortOrder: i, approvedAt: new Date(), ...data, bio: `${data.bio} ${DEMO_TAG}` } });

  const principal = await mk(0, { slug: `demo-dr-hossam-lotfy-${Date.now()}`, fullName: 'DR. Hossam Lotfy', title: 'DOCTOR' as LawyerTitle, specialization: 'محامٍ أمام محكمة النقض والمحاكم الدستورية والإدارية العليا', bio: 'مؤسس ورئيس المكتب.', position: 'Founder & Senior Partner', isPrincipal: true });
  const ahmed = await mk(1, { slug: `demo-ahmed-el-seidi-${Date.now()}`, fullName: 'Ahmed El-Seidi', title: 'ADVOCATE' as LawyerTitle, specialization: 'القضايا التجارية والبنكية', bio: 'محامي بالاستئناف العالي.', position: 'Senior Advocate' });
  const mohamed = await mk(2, { slug: `demo-mohamed-ahmed-${Date.now()}`, fullName: 'Mohamed Ahmed', title: 'ADVOCATE' as LawyerTitle, specialization: 'القضايا المدنية والعقارية', bio: 'متخصص في منازعات الملكية.', position: 'Advocate' });

  const court = (await prisma.location.findFirst({ where: { name: { contains: 'شمال الجيزة الابتدائية' } } })) ?? (await prisma.location.findFirst({ where: { type: 'COURT' } }));
  const tax = (await prisma.location.findFirst({ where: { type: 'TAX_OFFICE' } })) ?? court;
  if (!court || !tax) throw new Error('لا توجد أماكن مسجلة بعد — لا يمكن إنشاء بيانات الاختبار.');

  const overdueCase = await prisma.caseRecord.create({ data: { name: `قضية تعويض مدني ${DEMO_TAG}`, number: `DEMO-1180-${Date.now()}`, clientName: 'شركة النيل للتجارة', events: { create: [{ description: `تم فتح الملف ${DEMO_TAG}`, type: 'note', authorName: 'الإدارة' }, { description: `تم تحديد جلسة أولى ${DEMO_TAG}`, type: 'note', authorName: 'الإدارة' }] } } });
  const adjournedCase = await prisma.caseRecord.create({ data: { name: `استئناف حكم تجاري ${DEMO_TAG}`, number: `DEMO-742-${Date.now()}`, clientName: 'أحمد عبد الرحمن', events: { create: [{ description: `تأجلت الجلسة لجلسة جديدة ${DEMO_TAG}`, type: 'note', authorName: 'الإدارة' }] } } });

  const createTask = (locationId: string, caseId: string | undefined, description: string, date: Date, time: string | undefined, status: TaskStatus, lawyerIds: string[]) =>
    prisma.task.create({ data: { locationId, caseId, description: `${description} ${DEMO_TAG}`, scheduledDate: date, scheduledTime: time, status, completedAt: status === 'COMPLETED' ? new Date() : null, assignees: { create: lawyerIds.map((lawyerId) => ({ lawyerId })) } } });

  await createTask(court.id, overdueCase.id, 'حضور جلسة تعويض', dayOffset(-9), '10:00', 'PENDING' as TaskStatus, [ahmed.id]);
  await createTask(court.id, adjournedCase.id, 'جلسة استئناف — أُجّلت', dayOffset(-3), '09:00', 'COMPLETED' as TaskStatus, [mohamed.id]);
  await createTask(court.id, adjournedCase.id, 'الجلسة الجديدة بعد التأجيل', dayOffset(6), '09:30', 'PENDING' as TaskStatus, [mohamed.id, ahmed.id]);
  await createTask(court.id, undefined, 'حضور جلسة واحدة', dayOffset(1), '09:30', 'PENDING' as TaskStatus, [ahmed.id, mohamed.id]);
  await createTask(tax.id, undefined, 'فصل ضريبي', dayOffset(3), undefined, 'PENDING' as TaskStatus, [principal.id]);

  return (await getDemoStatus()).counts;
}
