/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, LawyerTitle, LocationType, TaskStatus, Prisma } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─────────────────────────── helpers ───────────────────────────

function dayOffset(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function at(days: number, time: string): Date {
  const d = dayOffset(days);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

// ─────────────────────────── main ───────────────────────────

async function main() {
  console.log('🌱 Seeding DR. HOSSAM LOTFY LAW FIRM…');

  // wipe (in FK order)
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.caseRecord.deleteMany();
  await prisma.accessToken.deleteMany();
  await prisma.location.deleteMany();
  await prisma.lawyer.deleteMany();
  await prisma.user.deleteMany();

  // ── admin user ──
  const admin = await prisma.user.create({
    data: {
      name: 'DR. Hossam Lotfy',
      email: 'admin@loutfilawfirm.net',
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Loutfy@Admin2026', 10),
      role: 'ADMIN',
    },
  });

  // ── lawyers ──
  const mkLawyer = (i: number, data: Prisma.LawyerCreateInput) =>
    prisma.lawyer.create({ data: { sortOrder: i, ...data } });

  const hsl = await mkLawyer(0, {
    slug: 'dr-hossam-lotfy',
    fullName: 'DR. Hossam Lotfy',
    title: LawyerTitle.DOCTOR,
    phone: '01000000001',
    email: 'hossam@loutfilawfirm.net',
    specialization: 'محامٍ أمام محكمة النقض والمحاكم الدستورية والإدارية العليا',
    bio: 'مؤسس ورئيس المكتب. محامٍ بالاستئناف العالي والمحاكم الدستورية العليا، بخبرة تتجاوز 30 عاماً في القضايا التجارية والدستورية والإدارية.',
    position: 'Founder & Senior Partner',
    isPrincipal: true,
  });

  const ahmed = await mkLawyer(1, {
    slug: 'ahmed-el-seidi',
    fullName: 'Ahmed El-Seidi',
    title: LawyerTitle.ADVOCATE,
    phone: '01000000002',
    specialization: 'القضايا التجارية والبنكية',
    bio: 'محامي بالاستئناف العالي، متخصص في المنازعات التجارية والبنكية.',
    position: 'Senior Advocate',
  });

  const mohamed = await mkLawyer(2, {
    slug: 'mohamed-ahmed',
    fullName: 'Mohamed Ahmed',
    title: LawyerTitle.ADVOCATE,
    phone: '01000000003',
    specialization: 'القضايا المدنية والعقارية',
    bio: 'محامٍ متخصص في القضايا المدنية والعقارية ومنازعات الملكية.',
    position: 'Advocate',
  });

  const omar = await mkLawyer(3, {
    slug: 'omar-khalid',
    fullName: 'Omar Khalid',
    title: LawyerTitle.DOCTOR,
    phone: '01000000004',
    specialization: 'القضاء الإداري والتعويضات',
    bio: 'دكتور في القانون العام، متخصص في القضاء الإداري وقضايا التعويضات.',
    position: 'Advocate',
  });

  const sara = await mkLawyer(4, {
    slug: 'sara-ibrahim',
    fullName: 'Sara Ibrahim',
    title: LawyerTitle.ADVOCATE,
    phone: '01000000005',
    specialization: 'استثمار وشركات',
    bio: 'محامية متخصصة في قانون الاستثمار تأسيس الشركات والمنازعات الضريبية.',
    position: 'Advocate',
  });

  const youssef = await mkLawyer(5, {
    slug: 'youssef-mostafa',
    fullName: 'Youssef Mostafa',
    title: LawyerTitle.ADVOCATE,
    phone: '01000000006',
    specialization: 'القضايا الجنائية',
    bio: 'محامٍ متخصص في القضايا الجنائية والإجراءات الجنائية.',
    position: 'Advocate',
  });

  const mona = await mkLawyer(6, {
    slug: 'mona-saeed',
    fullName: 'Mona Saeed',
    title: LawyerTitle.ADVOCATE,
    phone: '01000000007',
    specialization: 'التسجيل العقاري الشهر العقاري',
    bio: 'محامية متخصصة في الشهر العقاري والنقل والبيع الرهني.',
    position: 'Advocate',
  });

  const karim = await mkLawyer(7, {
    slug: 'karim-adel',
    fullName: 'Karim Adel',
    title: LawyerTitle.ADVOCATE,
    phone: '01000000008',
    specialization: 'منازعات العمل',
    bio: 'محامٍ متخصص في منازعات العمل والأجور والتأمينات.',
    position: 'Advocate',
  });

  // ── locations ──
  const mkLoc = (data: Parameters<typeof prisma.location.create>[0]['data']) => prisma.location.create({ data });

  const southCourt = await mkLoc({ slug: 'cairo-south-court', name: 'محكمة جنوب القاهرة', type: LocationType.COURT, address: 'المعادي - القاهرة' });
  const northCourt = await mkLoc({ slug: 'cairo-north-court', name: 'محكمة شمال القاهرة', type: LocationType.COURT, address: 'بولاق الدكرور - الجيزة' });
  const gizaCourt = await mkLoc({ slug: 'giza-court', name: 'محكمة الجيزة', type: LocationType.COURT, address: 'شارع التحرير - الجيزة' });
  const appealCourt = await mkLoc({ slug: 'cairo-court-of-appeal', name: 'محكمة استئناف القاهرة', type: LocationType.COURT, address: 'مدينة نصر - القاهرة' });
  const cassation = await mkLoc({ slug: 'court-of-cassation', name: 'محكمة النقض', type: LocationType.COURT, address: 'شارع 26 يوليو - القاهرة' });
  const adminCourt = await mkLoc({ slug: 'supreme-admin-court', name: 'المحكمة الإدارية العليا', type: LocationType.COURT, address: 'ميدان التحرير - القاهرة' });
  const constitutionCourt = await mkLoc({ slug: 'constitutional-court', name: 'المحكمة الدستورية العليا', type: LocationType.COURT, address: 'شارع 26 يوليو - القاهرة' });
  const prosecution = await mkLoc({ slug: 'public-prosecution', name: 'النيابة العامة', type: LocationType.GOVERNMENT_AGENCY, address: 'قصر العدالة - الدقي' });
  const investment = await mkLoc({ slug: 'investment-authority', name: 'هيئة الاستثمار', type: LocationType.INVESTMENT_AGENCY, address: 'شارع القصر العيني - القاهرة' });
  const realEstate = await mkLoc({ slug: 'real-estate-dokki', name: 'الشهر العقاري - الدقي', type: LocationType.REAL_ESTATE_REGISTRATION, address: 'شارع النيل - الدقي' });
  const expertsOffice = await mkLoc({ slug: 'experts-office', name: 'مكتب خبراء المحاكم', type: LocationType.EXPERTS_OFFICE, address: 'شارع 26 يوليو - القاهرة' });
  const govCenter = await mkLoc({ slug: 'giza-gov-center', name: 'مركز خدمات حكومي - الجيزة', type: LocationType.GOVERNMENT_AGENCY, address: 'الدقي - الجيزة' });

  // ── cases (fictional demo data) ──
  const c1 = await prisma.caseRecord.create({
    data: { name: 'الطعن في نزاع ملكية عقاري', number: 'الطعن رقم 4521 لسنة 96 ق (تجريبي)', description: 'قضية تجريبية للعرض فقط — نزاع ملكية على عقار بمدينة نصر.' },
  });
  const c2 = await prisma.caseRecord.create({
    data: { name: 'منازعة إدارية في قرار منع أعمال', number: 'رقم 2210 لسنة 92 ق (تجريبي)', description: 'قضية تجريبية للعرض فقط.' },
  });
  const c3 = await prisma.caseRecord.create({
    data: { name: 'أمر حبس احتياطي — شركة النيل للتجارة', number: 'جنح رقم 884 لسنة 2026 (تجريبي)', description: 'قضية تجريبية للعرض فقط.' },
  });
  const c4 = await prisma.caseRecord.create({
    data: { name: 'تأسيس شركة — Nile Logistics', number: 'ملف استثمار 2026/114 (تجريبي)', description: 'ملف تجريبي للعرض فقط — إجراءات تأسيس شركة استثمار.' },
  });

  // ── tasks / sessions ──
  type TaskInput = {
    location: { id: string };
    caseId?: string;
    description: string;
    notes?: string;
    scheduledDate?: Date;
    scheduledTime?: string;
    status?: TaskStatus;
    lawyers: Array<{ id: string }>;
    completedDaysAgo?: number;
    authorId?: string;
    createdById?: string;
  };

  async function mkTask(t: TaskInput) {
    const now = new Date();
    const completedAt = t.completedDaysAgo != null ? at(-t.completedDaysAgo, '15:00') : undefined;
    const task = await prisma.task.create({
      data: {
        locationId: t.location.id,
        caseId: t.caseId,
        description: t.description,
        notes: t.notes,
        scheduledDate: t.scheduledDate,
        scheduledTime: t.scheduledTime,
        status: t.status ?? (completedAt ? TaskStatus.COMPLETED : TaskStatus.PENDING),
        completedAt,
        authorId: t.authorId,
        createdById: t.createdById ?? admin.id,
        createdAt: completedAt ? at(-t.completedDaysAgo!, '09:00') : now,
      },
    });
    for (const l of t.lawyers) {
      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          lawyerId: l.id,
          completedAt,
          completedById: completedAt ? l.id : undefined,
        },
      });
    }
    return task;
  }

  // today
  await mkTask({
    location: southCourt,
    caseId: c1.id,
    description: 'حضور جلسة استئناف — الطعن رقم 4521 لسنة 96 ق',
    notes: 'إحضار المستندات المكملة وتقارير الخبير.',
    scheduledDate: dayOffset(0),
    scheduledTime: '09:30',
    lawyers: [ahmed],
  });

  // tomorrow
  await mkTask({
    location: cassation,
    caseId: c1.id,
    description: 'حضور جلسة الطعن بالنقض رقم 4521 لسنة 96 ق',
    notes: 'مراجعة مذكرة الدفاع قبل الجلسة بساعة.',
    scheduledDate: dayOffset(1),
    scheduledTime: '10:00',
    lawyers: [hsl],
  });
  await mkTask({
    location: northCourt,
    description: 'جلسة مدنية — نزاع عقد مقاولة',
    scheduledDate: dayOffset(1),
    scheduledTime: '11:30',
    lawyers: [mohamed],
  });
  await mkTask({
    location: investment,
    caseId: c4.id,
    description: 'متابعة ملف تأسيس شركة Nile Logistics بهيئة الاستثمار',
    notes: 'تسليم المستندات النهائية واستلام محضر اللجنة.',
    scheduledDate: dayOffset(1),
    scheduledTime: '14:00',
    lawyers: [sara],
  });

  // +2 days
  await mkTask({
    location: gizaCourt,
    caseId: c2.id,
    description: 'جلسة حكم — منازعة إدارية رقم 2210 لسنة 92 ق',
    scheduledDate: dayOffset(2),
    scheduledTime: '10:00',
    lawyers: [omar],
  });
  await mkTask({
    location: realEstate,
    description: 'نقل ملكية وحدة سكنية — تقديم عقد البيع للمراجعة والتسجيل',
    scheduledDate: dayOffset(2),
    scheduledTime: '12:30',
    lawyers: [mona],
  });

  // +5 days
  await mkTask({
    location: adminCourt,
    caseId: c2.id,
    description: 'جلسة استئناف إداري — منازعة منع أعمال',
    notes: 'تقديم مذكرة جديدة بالمرافعة الشفوية.',
    scheduledDate: dayOffset(5),
    scheduledTime: '09:00',
    lawyers: [hsl, omar],
  });
  await mkTask({
    location: appealCourt,
    description: 'جلسة مدنية — مطالبة مالية بقيمة 4.5 مليون جنيه',
    scheduledDate: dayOffset(5),
    scheduledTime: '13:00',
    lawyers: [karim],
  });

  // +10 days
  await mkTask({
    location: southCourt,
    caseId: c3.id,
    description: 'جلسة تجديد حبس احتياطي — شركة النيل للتجارة',
    notes: 'تقديم طلب إخلاء سبيل.',
    scheduledDate: dayOffset(10),
    scheduledTime: '10:00',
    lawyers: [youssef],
  });
  await mkTask({
    location: gizaCourt,
    description: 'جلسة تحكيم — مراجعة محضر الجلسة وتقرير الخبير',
    scheduledDate: dayOffset(10),
    scheduledTime: '11:00',
    lawyers: [ahmed, youssef],
  });

  // +20 days
  await mkTask({
    location: constitutionCourt,
    description: 'جلسة دستورية — استطلاع رأي المستشارين',
    scheduledDate: dayOffset(20),
    scheduledTime: '10:30',
    lawyers: [hsl],
  });
  await mkTask({
    location: prosecution,
    description: 'مراجعة أوراق جنحة إيصبات والتواصل مع النيابة',
    scheduledDate: dayOffset(20),
    scheduledTime: '15:00',
    lawyers: [youssef],
  });

  // +35 days
  await mkTask({
    location: cassation,
    caseId: c1.id,
    description: 'جلسة نظر الطعن — المرحلة الثانية',
    scheduledDate: dayOffset(35),
    scheduledTime: '09:30',
    lawyers: [hsl],
  });
  await mkTask({
    location: investment,
    description: 'اجتماع مع مستشار الهيئة — ملف التوسع',
    scheduledDate: dayOffset(35),
    scheduledTime: '11:00',
    lawyers: [sara],
  });

  // +45 days
  await mkTask({
    location: expertsOffice,
    description: 'حضور اجتماع تعيين خبير في نزاع هندسي',
    scheduledDate: dayOffset(45),
    scheduledTime: '12:00',
    lawyers: [mohamed, mona],
  });

  // completed (past)
  const done1 = await mkTask({
    location: southCourt,
    caseId: c3.id,
    description: 'جلسة أولي — جنح رقم 884 لسنة 2026',
    notes: 'تم حضور الجلسة وتقديم مذكرة الدفاع.',
    scheduledDate: dayOffset(-3),
    scheduledTime: '10:00',
    lawyers: [youssef],
    completedDaysAgo: 3,
  });
  await mkTask({
    location: realEstate,
    description: 'تسجيل رهن بنك مصري — تقديم ملف الرهن',
    scheduledDate: dayOffset(-5),
    scheduledTime: '11:00',
    lawyers: [mona],
    completedDaysAgo: 5,
  });
  const done3 = await mkTask({
    location: adminCourt,
    caseId: c2.id,
    description: 'جلسة مرافعة إدارية — منازعة 2210 لسنة 92 ق',
    notes: 'انتهت الجلسة بمرافعة شفهية وتم تقديم المستندات.',
    scheduledDate: dayOffset(-8),
    scheduledTime: '09:00',
    lawyers: [omar],
    completedDaysAgo: 8,
  });

  // in progress
  await mkTask({
    location: expertsOffice,
    description: 'متابعة تقرير الخبير في نزاع هندسي',
    notes: 'بانتظار اعتماد التقرير من المحكمة.',
    scheduledDate: dayOffset(7),
    scheduledTime: '14:00',
    status: TaskStatus.IN_PROGRESS,
    lawyers: [mohamed],
  });

  // a lawyer-authored post (social feed)
  await prisma.task.create({
    data: {
      locationId: cassation.id,
      caseId: c1.id,
      description: 'حضور جلسة الطعن رقم 4521 لسنة 96 ق بمحكمة النقض.',
      notes: 'مراجعة المستندات قبل الجلسة.',
      authorId: hsl.id,
      createdAt: at(0, '08:15'),
    },
  });
  await prisma.task.create({
    data: {
      locationId: investment.id,
      description: 'تقديم المستندات النهائية لملف تأسيس الشركة بهيئة الاستثمار.',
      authorId: sara.id,
      createdAt: at(-1, '16:40'),
    },
  });

  // ── comments ─
  const c1task = await prisma.task.findFirst({ where: { scheduledDate: dayOffset(1), scheduledTime: '10:00' } });
  if (c1task) {
    await prisma.comment.createMany({
      data: [
        { taskId: c1task.id, text: 'تم تجهيز مذكرة الدفاع، بانتظار توقيع السيد المحامي.', authorLawyerId: ahmed.id, createdAt: at(0, '09:10') },
        { taskId: c1task.id, text: 'شكراً أ. أحمد — سأراجعها قبل الغروب.', authorUserId: admin.id, createdAt: at(0, '09:45') },
        { taskId: c1task.id, text: 'تنبيه: قاعة الجلسات تغيرت إلى القاعة رقم 4.', authorName: 'سكرتارية المكتب', createdAt: at(0, '10:05') },
      ],
    });
  }
  if (done1) {
    await prisma.comment.createMany({
      data: [
        { taskId: done1.id, text: 'تم حضور الجلسة وتقديم مذكرة الدفاع بنجاح.', authorLawyerId: youssef.id, createdAt: at(-3, '12:30') },
        { taskId: done1.id, text: 'ممتاز، شكراً. سنوافي العميل بالتقرير.', authorUserId: admin.id, createdAt: at(-3, '13:00') },
      ],
    });
  }
  if (done3) {
    await prisma.comment.create({
      data: { taskId: done3.id, text: 'المحكمة أرجأت النطق للحكم لجلسة القادمة.', authorLawyerId: omar.id, createdAt: at(-8, '11:15') },
    });
  }

  // ── activity log ──
  await prisma.activityLog.createMany({
    data: [
      { action: 'CREATED', summary: 'أضاف مهمة جديدة: حضور جلسة الطعن رقم 4521 لسنة 96 ق', lawyerId: hsl.id, locationId: cassation.id, byUserId: admin.id, createdAt: at(-2, '10:00') },
      { action: 'CREATED', summary: 'أضاف مهمة جديدة: متابعة ملف تأسيس شركة Nile Logistics', lawyerId: sara.id, locationId: investment.id, byUserId: admin.id, createdAt: at(-2, '10:05') },
      { action: 'COMPLETED', summary: 'أنجز مهمة: جلسة أولي — جنح رقم 884 لسنة 2026', taskId: done1.id, lawyerId: youssef.id, locationId: southCourt.id, byLawyerId: youssef.id, createdAt: at(-3, '15:00') },
      { action: 'COMPLETED', summary: 'أنجز مهمة: تسجيل رهن بنك مصري', lawyerId: mona.id, locationId: realEstate.id, byLawyerId: mona.id, createdAt: at(-5, '13:30') },
      { action: 'COMPLETED', summary: 'أنجز مهمة: جلسة مرافعة إدارية — منازعة 2210', taskId: done3.id, lawyerId: omar.id, locationId: adminCourt.id, byLawyerId: omar.id, createdAt: at(-8, '12:00') },
      { action: 'COMMENTED', summary: 'علّق على مهمة: حضور جلسة الطعن بالنقض', taskId: c1task?.id, lawyerId: hsl.id, locationId: cassation.id, byLawyerId: ahmed.id, createdAt: at(0, '09:10') },
      { action: 'EDITED', summary: 'عدّل ملاحظات مهمة: جلسة حكم — منازعة إدارية', lawyerId: omar.id, locationId: gizaCourt.id, byUserId: admin.id, createdAt: at(-1, '11:00') },
    ],
  });

  // ── notifications ──
  await prisma.notification.createMany({
    data: [
      { lawyerId: hsl.id, type: 'TASK_ASSIGNED', title: 'مهمة جديدة', body: 'جلسة الطعن بالنقض رقم 4521 — غداً 10:00 صباحاً', link: '/sessions', createdAt: at(-2, '10:00') },
      { lawyerId: sara.id, type: 'TASK_ASSIGNED', title: 'مهمة جديدة', body: 'متابعة ملف تأسيس الشركة بهيئة الاستثمار — غداً 14:00', createdAt: at(-2, '10:05') },
      { lawyerId: youssef.id, type: 'SESSION_CRITICAL', title: 'جلسة قريبة', body: 'جلسة تجديد الحبس خلال 10 أيام — جهز طلب الإخلاء', createdAt: at(-1, '08:00') },
      { userId: admin.id, type: 'TASK_COMPLETED', title: 'تم تنفيذ مهمة', body: 'Youssef Mostafa أنجز: جلسة أولي — جنح 884', createdAt: at(-3, '15:00') },
      { userId: admin.id, type: 'COMMENT', title: 'تعليق جديد', body: 'Ahmed El-Seidi علّق على جلسة الطعن بالنقض', createdAt: at(0, '09:10') },
    ],
  });

  console.log('✅ Seed complete.');
  console.log(`   lawyers: 8, locations: 12, cases: 4, tasks: ~20`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
