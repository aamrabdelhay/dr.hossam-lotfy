import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const cats = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  for (const c of cats) {
    const n = await prisma.location.count({ where: { categoryId: c.id } });
    if (n > 0) console.log(`${c.id}\t${n}\t${c.nameAr}`);
  }
  const total = await prisma.location.count();
  console.log('TOTAL', total);
  const expectMap: Record<string, number> = {
    'cat-courts': 115, 'cat-prosecution': 3, 'cat-admin-prosecution': 2, 'cat-state-lawsuits': 2,
    'cat-state-council': 4, 'cat-supreme-constitutional': 1, 'cat-military-judiciary': 1,
    'cat-experts': 2, 'cat-forensic': 1, 'cat-execution': 2, 'cat-prisons': 1, 'cat-police': 2,
    'cat-tax': 1, 'cat-real-estate-reg': 1, 'cat-commercial-registry': 1, 'cat-bar-association': 1,
    'cat-survey': 1, 'cat-passports': 1, 'cat-traffic': 1, 'cat-social-insurance': 1, 'cat-labour': 1,
    'cat-customs': 1, 'cat-gafi': 1, 'cat-civil-status': 1, 'cat-local-gov': 1,
  };
  let pass = true;
  for (const [id, want] of Object.entries(expectMap)) {
    const got = await prisma.location.count({ where: { categoryId: id } });
    const ok = got === want;
    if (!ok) pass = false;
    console.log(`${ok ? 'OK       ' : 'MISMATCH '}${id} expected ${want} got ${got}`);
  }
  // justice categories (new + courts) must never be zero
  const justiceIds = ['cat-courts','cat-prosecution','cat-admin-prosecution','cat-state-lawsuits','cat-state-council','cat-supreme-constitutional','cat-military-judiciary','cat-experts','cat-forensic','cat-execution','cat-prisons','cat-police'];
  const zero = justiceIds.filter((id) => (expectMap[id] ?? 0) === 0);
  console.log(`justice categories with zero locations: ${zero.join(', ') || '—'}`);
  console.log(pass ? 'ALL CATEGORY COUNTS MATCH' : 'SOME COUNTS MISMATCH');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
