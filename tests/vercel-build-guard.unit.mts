import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
// @ts-expect-error plain mjs
import { databaseSteps } from '../scripts/build-guard.mjs';
const none = { production: false, migrate: false, guideSync: false, seed: false };
for (const env of [{}, { VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'development' }, { VERCEL_ENV: 'Production' }, { VERCEL_ENV: 'preview', SEED_ON_BUILD: '1', DATABASE_URL: 'x' }]) assert.deepEqual(databaseSteps(env), none, JSON.stringify(env));
assert.deepEqual(databaseSteps({ VERCEL_ENV: 'production' }), { production: true, migrate: true, guideSync: true, seed: false });
assert.equal(databaseSteps({ VERCEL_ENV: 'production', SKIP_DB_MIGRATE: '1' }).migrate, false);
assert.equal(databaseSteps({ VERCEL_ENV: 'production', SKIP_LAWYER_GUIDE_SYNC: '1' }).guideSync, false);
assert.equal(databaseSteps({ VERCEL_ENV: 'production', SEED_ON_BUILD: '1' }).seed, true);
// Run the REAL scripts/vercel-build.mjs with fake node/npx on PATH that only record what they were asked to run.
import { mkdtempSync, writeFileSync, chmodSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
function runBuild(env: Record<string, string>) {
  const dir = mkdtempSync(path.join(tmpdir(), 'vb-')); const log = path.join(dir, 'calls.log');
  for (const n of ['node', 'npx']) { writeFileSync(path.join(dir, n), `#!/bin/sh\necho "${n} $*" >> "${log}"\nexit 0\n`); chmodSync(path.join(dir, n), 0o755); }
  const r = spawnSync(process.execPath, ['scripts/vercel-build.mjs'], { encoding: 'utf8', env: { PATH: dir, HOME: dir, ...env } });
  let calls = ''; try { calls = readFileSync(log, 'utf8'); } catch {}
  return { status: r.status, calls, out: r.stdout + r.stderr };
}
const prev = runBuild({ VERCEL_ENV: 'preview', DATABASE_URL: 'postgres://real-looking', SEED_ON_BUILD: '1' });
assert.equal(prev.status, 0, prev.out);
assert.ok(!/apply-migrations|seed-lawyer-guide|prisma\/seed/.test(prev.calls), 'preview must not run migrations, directory sync or seed: ' + prev.calls);
assert.ok(/next build/.test(prev.calls) && /prisma generate/.test(prev.calls), 'preview still generates and builds');
assert.ok(prev.out.includes('No database is touched'));
const unset = runBuild({ DATABASE_URL: 'postgres://x' });
assert.ok(!/apply-migrations|seed-lawyer-guide/.test(unset.calls), 'unset VERCEL_ENV touches no database');
const prod = runBuild({ VERCEL_ENV: 'production', DATABASE_URL: 'postgres://x' });
assert.ok(/apply-migrations/.test(prod.calls) && /seed-lawyer-guide/.test(prod.calls), 'production still migrates and syncs: ' + prod.calls);
const prodSkip = runBuild({ VERCEL_ENV: 'production', DATABASE_URL: 'postgres://x', SKIP_DB_MIGRATE: '1', SKIP_LAWYER_GUIDE_SYNC: '1' });
assert.ok(!/apply-migrations|seed-lawyer-guide/.test(prodSkip.calls), 'SKIP switches still work in production');
console.log('vercel-build-guard: ok');
