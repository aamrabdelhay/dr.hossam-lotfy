/**
 * Combined postinstall patches:
 * 1. Prisma offline patch (skip binary download, use WASM)
 * 2. PostCSS fix for Next.js 15.x — ensures next/node_modules/postcss exists with fixed version
 *    (overrides in package.json dedupe postcss to top-level, but Next's loader expects it inside next/node_modules)
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function patchPrisma() {
  const target = path.join(root, 'node_modules/@prisma/engines/dist/index.js');
  if (!existsSync(target)) {
    console.log('[postinstall] @prisma/engines not installed yet — skipping prisma patch');
    return;
  }
  const src = readFileSync(target, 'utf8');
  const marker = 'OFFLINE PATCH: binaries.prisma.sh is unreachable';
  if (src.includes(marker)) {
    console.log('[postinstall] prisma already patched');
    return;
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
    console.warn('[postinstall] prisma expected source not found — skipping');
    return;
  }
  writeFileSync(target, src.replace(orig, patched), 'utf8');
  console.log('[postinstall] applied offline patch to @prisma/engines');
}

function patchPostCSS() {
  const topPostCSS = path.join(root, 'node_modules/postcss');
  const nextPostCSS = path.join(root, 'node_modules/next/node_modules/postcss');
  if (!existsSync(topPostCSS)) {
    console.log('[postinstall] top-level postcss not found — skipping postcss patch');
    return;
  }
  // If next's own postcss is missing or vulnerable, copy fixed version
  const needsPatch = !existsSync(nextPostCSS) || (() => {
    try {
      const pkg = JSON.parse(readFileSync(path.join(nextPostCSS, 'package.json'), 'utf8'));
      // vulnerable versions are <=8.5.22 or <=8.4.31
      const v = pkg.version;
      const [major, minor, patch] = v.split('.').map(Number);
      if (major === 8 && minor === 5 && patch <= 22) return true;
      if (major === 8 && minor === 4 && patch <= 31) return true;
      return false;
    } catch {
      return true;
    }
  })();

  if (!needsPatch) {
    console.log('[postinstall] next postcss already fixed');
    return;
  }

  try {
    mkdirSync(path.dirname(nextPostCSS), { recursive: true });
    if (existsSync(nextPostCSS)) rmSync(nextPostCSS, { recursive: true, force: true });
    cpSync(topPostCSS, nextPostCSS, { recursive: true });
    console.log(`[postinstall] patched next/node_modules/postcss to ${JSON.parse(readFileSync(path.join(topPostCSS, 'package.json'), 'utf8')).version}`);
  } catch (e) {
    console.warn('[postinstall] failed to patch next postcss:', e.message);
  }
}

patchPrisma();
patchPostCSS();
