/**
 * Vercel build step:
 *  1. Require DATABASE_URL and apply pending SQL migrations.
 *  2. Generate the Prisma client.
 *  3. Sync the Lawyer Guide directory (149 places) on every deploy.
 *  4. Optionally run the production-safe seed (never demo data).
 *  5. Build Next.js.
 *
 * A deployment with an old database schema is worse than a failed deployment:
 * the migration step is deliberately fatal. Set SKIP_DB_MIGRATE=1 only for an
 * explicit emergency/manual-migration workflow.
 */
import { spawnSync } from 'node:child_process';
import 'dotenv/config';

function run(label, command, args, options = {}) {
  console.log(`[vercel-build] ${label}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    console.error(`[vercel-build] ${label} could not start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[vercel-build] ${label} failed (exit ${result.status ?? 'unknown'}).`);
    process.exit(result.status ?? 1);
  }
}

const skipMigrations = process.env.SKIP_DB_MIGRATE === '1';
const shouldSeed = process.env.SEED_ON_BUILD === '1';

if (skipMigrations) {
  console.warn('[vercel-build] SKIP_DB_MIGRATE=1 — migrations were explicitly skipped.');
} else {
  if (!process.env.DATABASE_URL) {
    console.error(
      '[vercel-build] DATABASE_URL is required. Add the Neon pooled URL in Vercel before deploying, or set SKIP_DB_MIGRATE=1 only for a deliberate manual migration.',
    );
    process.exit(1);
  }
  run('applying database migrations…', 'node', ['scripts/apply-migrations.mjs']);
}

if (shouldSeed && !process.env.DATABASE_URL) {
  console.error('[vercel-build] SEED_ON_BUILD=1 requires DATABASE_URL.');
  process.exit(1);
}

// Generate before seeding because the Prisma client is intentionally gitignored.
run('generating Prisma client…', 'npx', ['prisma', 'generate']);

// Every deploy re-syncs the official directory (119 courts + 15 government
// offices + 15 justice bodies) so /lawyer-guide never ships empty again.
// Idempotent upserts.
const skipGuideSync = process.env.SKIP_LAWYER_GUIDE_SYNC === '1';

if (skipGuideSync) {
  console.warn('[vercel-build] SKIP_LAWYER_GUIDE_SYNC=1 — lawyer guide sync was explicitly skipped.');
} else if (!process.env.DATABASE_URL) {
  console.error(
    '[vercel-build] Lawyer guide sync requires DATABASE_URL (set SKIP_LAWYER_GUIDE_SYNC=1 only for a deliberate skip).',
  );
  process.exit(1);
} else {
  run('syncing lawyer guide locations (149 places)…', 'npx', ['tsx', 'scripts/seed-lawyer-guide.mjs']);
}

if (shouldSeed) {
  // An inherited DEMO=1 must never create demo lawyers/tasks in production.
  run('SEED_ON_BUILD=1 — running production-safe seed…', 'npx', ['tsx', 'prisma/seed.ts'], {
    env: { ...process.env, DEMO: '' },
  });
}

run('building Next.js…', 'npx', ['next', 'build']);
