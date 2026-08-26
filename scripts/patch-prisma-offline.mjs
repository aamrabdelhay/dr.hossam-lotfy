/**
 * Offline build patch for Prisma 7.
 *
 * This environment cannot reach binaries.prisma.sh, so the Prisma CLI would
 * fail while trying to download the native schema-engine binary. Prisma 7
 * ships the schema engine as WASM inside the `prisma` package, therefore the
 * native download is safely skipped.
 *
 * The patch is idempotent and runs automatically on `npm install` (postinstall).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'node_modules/@prisma/engines/dist/index.js');

if (!existsSync(target)) {
  console.log('[patch-prisma] @prisma/engines not installed yet — nothing to do');
  process.exit(0);
}

const src = readFileSync(target, 'utf8');

const marker = 'OFFLINE PATCH: binaries.prisma.sh is unreachable';
if (src.includes(marker)) {
  console.log('[patch-prisma] already patched');
  process.exit(0);
}

const orig = `async function ensureNeededBinariesExist({ download }) {
  const binaryDir = import_path.default.join(__dirname, "../");
  const binaries = {
    [import_fetch_engine.BinaryType.SchemaEngineBinary]: binaryDir
  };
  debug(\`binaries to download \${Object.keys(binaries).join(", ")}\`);
  const binaryTargets = process.env.PRISMA_CLI_BINARY_TARGETS ? process.env.PRISMA_CLI_BINARY_TARGETS.split(",") : void 0;
  await download({
    binaries,
    showProgress: true,
    version: import_engines_version.enginesVersion,
    failSilent: false,
    binaryTargets
  });
}`;

const patched = `async function ensureNeededBinariesExist({ download }) {
  // OFFLINE PATCH: binaries.prisma.sh is unreachable in this environment.
  // Prisma 7 ships the schema engine as WASM inside the \`prisma\` package,
  // so the native binary download is skipped.
  debug('skipping engine download (offline patch)');
  return;
}`;

if (!src.includes(orig)) {
  console.warn('[patch-prisma] expected source not found (Prisma version may have changed). Skipping patch.');
  process.exit(0);
}

writeFileSync(target, src.replace(orig, patched), 'utf8');
console.log('[patch-prisma] applied offline patch to @prisma/engines');
