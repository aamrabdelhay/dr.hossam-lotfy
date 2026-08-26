/**
 * Ensures the embedded PostgreSQL server is reachable on 127.0.0.1:5432.
 * If not, starts it (detached) and waits until it accepts connections.
 * Safe to run repeatedly (idempotent). Used by `npm run db:init` and `prestart`.
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5432;

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(900);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(PORT, '127.0.0.1');
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitReady(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen()) return true;
    await sleep(400);
  }
  return false;
}

async function main() {
  if (await isPortOpen()) {
    console.log('[db] PostgreSQL already running on port 5432');
    return;
  }
  console.log('[db] starting embedded PostgreSQL (detached)…');
  const child = spawn(process.execPath, [path.join(root, 'scripts', 'pg-server.mjs')], {
    cwd: root,
    detached: true,
    stdio: ['ignore', process.stderr, process.stderr],
    env: process.env,
  });
  child.unref();
  const ok = await waitReady(45000);
  if (!ok) {
    console.error('[db] PostgreSQL did not become ready in time');
    process.exit(1);
  }
  console.log('[db] PostgreSQL is ready');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
