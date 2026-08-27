/**
 * Vercel build step:
 *  1. Apply pending SQL migrations with scripts/apply-migrations.mjs
 *     (pure pg client — no native Prisma engine needed; writes the same
 *     `_prisma_migrations` journal, so a later `prisma migrate deploy`
 *     stays consistent).
 *  2. prisma generate
 *  3. next build
 *
 * Migration failure does NOT fail the deploy (logged loudly instead) so a
 * transient DB hiccup at build time can never take the site down.
 */
import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  console.warn('[vercel-build] DATABASE_URL is not set — SKIPPING migrations. Set it in Vercel → Settings → Environment Variables.');
} else {
  const r = spawnSync('node', ['scripts/apply-migrations.mjs'], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.warn('[vercel-build] ⚠️  migration step failed — continuing build. Apply migrations manually: npx prisma migrate deploy');
  }
}

const gen = spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit' });
if (gen.status !== 0) process.exit(gen.status ?? 1);

const build = spawnSync('npx', ['next', 'build'], { stdio: 'inherit' });
process.exit(build.status ?? 1);
