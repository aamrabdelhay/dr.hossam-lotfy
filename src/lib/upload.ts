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

function hasValidSignature(buf: Buffer, mime: string): boolean {
  if (buf.length < 8) return false;
  if (mime === 'image/png') {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mime === 'image/jpeg') {
    // JPEG: FF D8 FF
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mime === 'image/webp') {
    // WebP: RIFF....WEBP
    return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

export async function saveUpload(buffer: Buffer, contentType: string): Promise<string> {
  if (!ALLOWED.has(contentType)) throw new ApiError(400, 'نوع الصورة غير مدعوم. استخدم PNG أو JPG أو WebP.');
  const max = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024);
  if (buffer.length > max) throw new ApiError(400, 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت).');
  if (!hasValidSignature(buffer, contentType)) {
    throw new ApiError(400, 'ملف الصورة غير صالح أو تالف.');
  }

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
