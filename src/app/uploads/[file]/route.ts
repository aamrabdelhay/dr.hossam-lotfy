import { promises as fs } from 'node:fs';
import path from 'node:path';

const TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/**
 * Serves uploaded images from secure local storage (gitignored, outside the
 * repo). Files are only readable through this route — direct filesystem paths
 * are never exposed.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!file || file.includes('..') || file.includes('/') || !/^[\w][\w.-]*$/.test(file)) {
    return new Response('Not found', { status: 404 });
  }
  const dir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'storage/uploads');
  const full = path.join(dir, file);
  if (full !== path.join(dir, path.basename(full)) || !full.startsWith(dir + path.sep)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const buf = await fs.readFile(full);
    return new Response(buf, {
      headers: {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
