/* eslint-disable no-console */
/**
 * Production-safe seed. Creates:
 *  1. The admin/staff account (from ADMIN_* env, default role SUPER_ADMIN).
 *  2. The legal-locations directory (119 courts + other destinations) —
 *     see ./seed-locations.ts.
 *
 * NO demo lawyers/tasks/comments are created unless DEMO=1 is exported
 * (useful for local development only).
 *
 * Run: npm run db:seed
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, LocationType, LawyerTitle, TaskStatus } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';
import { seedLocations } from './seed-locations';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding DR. HOSSAM LOTFY LAW FIRM…');

  // ── admin / staff account ──
  const email = (process.env.ADMIN_EMAIL || 'admin@loutfilawfirm.net').toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: process.env.ADMIN_NAME || 'DR. Hossam Lotfy',
        email,
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Loutfy@Admin2026', 10),
        role: 'SUPER_ADMIN',
      },
    });
    console.log(`👤 staff account created: ${email} (SUPER_ADMIN)`);
  } else {
    console.log(`👤 staff account exists: ${email}`);
  }

  // ── locations directory (119 courts + others) ──
  await seedLocations();

  // ── optional demo data (local development only) ──
  if (process.env.DEMO === '1') {
    await seedDemo();
  } else {
    console.log('ℹ️  DEMO=1 not set — skipping demo lawyers/tasks (production-safe).');
  }

  console.log('✅ Seed complete.');
}

/** Demo lawyers + tasks for local development. Never run in production. */
async function seedDemo() {
  console.log('🧪 DEMO=1 — creating demo lawyers/tasks…');

  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.caseRecord.deleteMany();
  await prisma.lawyer.deleteMany();

  const dayOffset = (days: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d;
  };

  const mk = (i: number, data: { slug: string; fullName: string; title: LawyerTitle; specialization: string; bio: string; position: string; isPrincipal?: boolean }) =>
    prisma.lawyer.create({ data: { sortOrder: i, ...data } });

  const hsl = await mk(0, {
    slug: 'dr-hossam-lotfy',
    fullName: 'DR. Hossam Lotfy',
    title: LawyerTitle.DOCTOR,
    specialization: 'محامٍ أمام محكمة النقض والمحاكم الدستورية والإدارية العليا',
    bio: 'مؤسس ورئيس المكتب.',
    position: 'Founder & Senior Partner',
    isPrincipal: true,
  });
  const ahmed = await mk(1, { slug: 'ahmed-el-seidi', fullName: 'Ahmed El-Seidi', title: LawyerTitle.ADVOCATE, specialization: 'القضايا التجارية والبنكية', bio: 'محامي بالاستئناف العالي.', position: 'Senior Advocate' });
  const mohamed = await mk(2, { slug: 'mohamed-ahmed', fullName: 'Mohamed Ahmed', title: LawyerTitle.ADVOCATE, specialization: 'القضايا المدنية والعقارية', bio: 'متخصص في منازعات الملكية.', position: 'Advocate' });

  const court = await prisma.location.findFirst({ where: { name: { contains: 'شمال الجيزة الابتدائية' } } })
    ?? (await prisma.location.findFirst({ where: { type: LocationType.COURT } }));
  const tax = await prisma.location.findFirst({ where: { type: LocationType.TAX_OFFICE } }) ?? court;

  if (!court || !tax) throw new Error('seed demo: no locations found — seed locations first');

  const t1 = await prisma.task.create({
    data: {
      locationId: court.id,
      description: 'حضور جلسة واحدة (ديمو)',
      scheduledDate: dayOffset(1),
      scheduledTime: '09:30',
      status: TaskStatus.PENDING,
      createdById: null,
      assignees: { create: [{ lawyerId: ahmed.id }, { lawyerId: mohamed.id }] },
    },
  });
  await prisma.task.create({
    data: {
      locationId: tax.id,
      description: 'فصل ضريبي (ديمو)',
      scheduledDate: dayOffset(3),
      status: TaskStatus.PENDING,
      assignees: { create: [{ lawyerId: hsl.id }] },
    },
  });
  console.log(`🧪 demo tasks created: #${t1.id} +1`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
