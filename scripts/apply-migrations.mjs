/**
 * Applies SQL migrations from prisma/migrations/* in order, tracking them in
 * the "_prisma_migrations" journal (same format Prisma uses), so a production
 * `prisma migrate deploy` stays consistent.
 *
 * Idempotent: already-applied migrations are skipped.
 */
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'prisma', 'migrations');

const url = process.env.DATABASE_URL || 'postgresql://lhl:lhl@127.0.0.1:5432/lhlawfirm?schema=public';
const client = new pg.Client({ connectionString: url });

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
    if (applied.has(name)) {
      console.log(`[migrate] skip ${name} (already applied)`);
      continue;
    }
    const sql = readFileSync(path.join(migrationsDir, dir, 'migration.sql'), 'utf8');
    const checksum = createHash('sha1').update(sql).digest('hex');
    console.log(`[migrate] applying ${name} …`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO "_prisma_migrations"
           ("id", "checksum", "finished_at", "migration_name", "applied_steps_count", "applied_steps")
         VALUES ($1, $2, now(), $3, 1, $4)`,
        [randomUUID(), checksum, name, JSON.stringify([name])],
      );
      await client.query('COMMIT');
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
