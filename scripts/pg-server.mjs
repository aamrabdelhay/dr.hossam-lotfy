/**
 * Long-running embedded PostgreSQL server.
 * Data is persisted in .pgdata (gitignored) and survives restarts.
 */
import EmbeddedPostgres from 'embedded-postgres';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const pg = new EmbeddedPostgres({
  databaseDir: path.join(root, '.pgdata'),
  user: 'lhl',
  password: 'lhl',
  port: 5432,
  persistent: true,
  initdbFlags: ['--locale=C.utf8'],
});

try {
  if (!(await pg.initialised)) {
    console.log('[pg] initialising cluster…');
    await pg.initialise();
  }
  console.log('[pg] starting server on port 5432…');
  await pg.start();
  await pg.createDatabase('lhlawfirm');
  await pg.createDatabase('lhlawfirm_shadow');
  console.log('[pg] ready. databases: lhlawfirm, lhlawfirm_shadow');
} catch (err) {
  console.error('[pg] failed to start:', err.message);
  process.exit(1);
}

const stop = async () => {
  console.log('[pg] stopping…');
  try {
    await pg.stop('smart');
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', stop);
process.on('SIGINT', stop);
