#!/usr/bin/env node
/**
 * Lawyer Guide location sync — 149 official places
 * (119 courts across all governorates + 15 government offices: ضرائب، شهر
 * عقاري، سجل تجاري، نقابة، مساحة، جوازات، مرور، تأمينات، عمل، جمارك،
 * استثمار، خبراء، سجل مدني، نيابة، ديوان محافظة + 15 جهة عدلية: النيابة
 * العامة، النيابة الإدارية، هيئة قضايا الدولة، مجلس الدولة، القضاء
 * العسكري، الخبراء، الطب الشرعي، التنفيذ، السجون، الشرطة).
 *
 * Plain JS (.mjs) on purpose: it runs directly under `npx tsx` inside the
 * Vercel build step (scripts/vercel-build.mjs) with no TypeScript tooling of
 * its own. The dataset itself is imported from prisma/seed-locations.ts —
 * the single source of truth shared with `npm run db:seed` — so the classic
 * /locations directory and the /lawyer-guide can never drift apart.
 *
 * What every run does (idempotent upsert on the unique slug — safe to run on
 * every deploy, a hundred times over):
 *   • creates/updates the 149 locations with the full directory data,
 *   • links each location to its Lawyer-Guide category (47 `cat-*` categories
 *     seeded by the lawyer_guide migration) — the 4 supreme courts are
 *     re-mapped through `categoryOverride` without touching their rows,
 *   • writes Arabic normalizedName for the intent-based search,
 *   • stamps verificationStatus = VERIFIED,
 *   • stamps confidenceLevel = HIGH when the place has coordinates
 *     (MEDIUM otherwise).
 *
 * It never deletes rows: unrelated/demo locations keep their ids and any
 * foreign keys pointing at them intact.
 *
 * Run: npx tsx scripts/seed-lawyer-guide.mjs   (requires DATABASE_URL)
 */
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  console.error(
    '[seed-lawyer-guide] DATABASE_URL is required. Set the Neon connection string in the environment and re-run.',
  );
  process.exit(1);
}

const { seedLocations } = await import('../prisma/seed-locations.ts');

console.log('🧭 [seed-lawyer-guide] syncing 149 locations (119 courts + 15 government offices + 15 justice bodies)…');
try {
  await seedLocations();
  console.log('🧭 [seed-lawyer-guide] sync complete.');
  process.exit(0);
} catch (err) {
  console.error('[seed-lawyer-guide] sync failed:', err);
  process.exit(1);
}
