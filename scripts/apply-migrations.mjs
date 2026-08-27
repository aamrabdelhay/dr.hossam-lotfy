/**
 * Applies SQL migrations from prisma/migrations/* in order, tracking them in
 * the "_prisma_migrations" journal so production builds can safely converge
 * an existing database and then continue with pending migrations.
 *
 * Idempotent: already-applied migrations are skipped. If the database predates
 * this journal but already contains the complete initial schema, the initial
 * migration is safely baselined instead of being executed a second time.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'prisma', 'migrations');

const rawUrl = process.env.DATABASE_URL || 'postgresql://lhl:lhl@127.0.0.1:5432/lhlawfirm?schema=public';
// pg currently aliases `require`/`prefer` to verify-full, but that behavior is
// changing. Make the intended TLS verification explicit for hosted databases.
const url = rawUrl.includes('sslmode=')
  ? rawUrl.replace(/([?&]sslmode=)(?:prefer|require|verify-ca)(?=&|$)/, '$1verify-full')
  : rawUrl.includes('?')
    ? `${rawUrl}&sslmode=verify-full`
    : `${rawUrl}?sslmode=verify-full`;
const client = new pg.Client({ connectionString: url });

async function recordMigration(name, checksum) {
  await client.query(
    `INSERT INTO "_prisma_migrations"
       ("id", "checksum", "finished_at", "migration_name", "applied_steps_count", "applied_steps")
     VALUES ($1, $2, now(), $3, 1, $4)`,
    [randomUUID(), checksum, name, JSON.stringify([name])],
  );
}

async function initialSchemaAlreadyExists() {
  const result = await client.query(`
    SELECT
      to_regclass('public.users') IS NOT NULL AS users,
      to_regclass('public.lawyers') IS NOT NULL AS lawyers,
      to_regclass('public.access_tokens') IS NOT NULL AS access_tokens,
      to_regclass('public.locations') IS NOT NULL AS locations,
      to_regclass('public.case_records') IS NOT NULL AS case_records,
      to_regclass('public.tasks') IS NOT NULL AS tasks,
      to_regclass('public.task_assignments') IS NOT NULL AS task_assignments,
      to_regclass('public.comments') IS NOT NULL AS comments,
      to_regclass('public.notifications') IS NOT NULL AS notifications,
      to_regclass('public.activity_logs') IS NOT NULL AS activity_logs,
      EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LawyerTitle' AND typtype = 'e') AS lawyer_title,
      EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LocationType' AND typtype = 'e') AS location_type,
      EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskStatus' AND typtype = 'e') AS task_status,
      EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole' AND typtype = 'e') AS user_role
  `);
  return Object.values(result.rows[0]).every(Boolean);
}

async function main() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_time" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "logs" TEXT,
      "migration_name" VARCHAR(255) NOT NULL,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
      "applied_steps" JSON NOT NULL,
      CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
    )
  `);

  if (!readdirSync(migrationsDir, { withFileTypes: true }).some((e) => e.isDirectory())) {
    console.log('[migrate] no migrations found');
    return;
  }

  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const applied = new Set(
    (await client.query('SELECT "migration_name" FROM "_prisma_migrations"')).rows.map((r) => r.migration_name),
  );

  for (const dir of dirs) {
    const name = dir.split('_').slice(1).join('_');
    const sql = readFileSync(path.join(migrationsDir, dir, 'migration.sql'), 'utf8');
    const checksum = createHash('sha1').update(sql).digest('hex');

    if (applied.has(name)) {
      console.log(`[migrate] skip ${name} (already applied)`);
      continue;
    }

    // The production database may have been created by an earlier deployment
    // before this custom migration journal existed. Only baseline "init" when
    // every object created by that migration is already present; otherwise fail
    // normally rather than masking a partially initialized database.
    if (name === 'init' && (await initialSchemaAlreadyExists())) {
      await recordMigration(name, checksum);
      applied.add(name);
      console.log('[migrate] baseline init (initial schema already exists)');
      continue;
    }

    console.log(`[migrate] applying ${name} …`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await recordMigration(name, checksum);
      await client.query('COMMIT');
      applied.add(name);
      console.log(`[migrate] applied ${name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${name} failed: ${err.message}`);
    }
  }
  console.log('[migrate] done');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
