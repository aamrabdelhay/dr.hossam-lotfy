import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import { ApiError } from './api';

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);
const EXT: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

let uploadDir: string | null = null;
function dir(): string {
  if (!uploadDir) {
    uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'storage/uploads');
  }
  return uploadDir;
}

export async function saveUpload(buffer: Buffer, contentType: string): Promise<string> {
  if (!ALLOWED.has(contentType)) throw new ApiError(400, 'نوع الصورة غير مدعوم. استخدم PNG أو JPG أو WebP.');
  const max = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024);
  if (buffer.length > max) throw new ApiError(400, 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت).');

  const id = crypto.randomBytes(12).toString('hex');
  const ext = EXT[contentType] || '.png';
  const file = `${id}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(file, buffer, {
      access: 'public',
      contentType,
    });
    return blob.url;
  }

  await fs.mkdir(dir(), { recursive: true });
  await fs.writeFile(path.join(dir(), file), buffer);
  return `/uploads/${file}`;
}
