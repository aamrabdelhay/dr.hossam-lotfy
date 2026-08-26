/**
 * One-shot: ensures the embedded PostgreSQL server is running
 * (databases lhlawfirm + lhlawfirm_shadow are created by pg-server.mjs on boot).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'ensure-db.mjs')], {
  stdio: 'inherit',
  cwd: root,
});
process.exit(r.status ?? 0);
