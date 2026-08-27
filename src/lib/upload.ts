import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import { ApiError } from './api';

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);
const EXT: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;

let uploadDir: string | null = null;
function dir(): string {
  if (!uploadDir) {
    uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'storage/uploads');
  }
  return uploadDir;
}

function hasValidSignature(buffer: Buffer, contentType: string): boolean {
  if (contentType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (contentType === 'image/jpeg') {
    return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }
  if (contentType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).equals(Buffer.from('RIFF')) &&
      buffer.subarray(8, 12).equals(Buffer.from('WEBP'))
    );
  }
  return false;
}

export async function saveUpload(buffer: Buffer, contentType: string): Promise<string> {
  if (!ALLOWED.has(contentType)) throw new ApiError(400, 'نوع الصورة غير مدعوم. استخدم PNG أو JPG أو WebP.');
  const max = Number(process.env.MAX_UPLOAD_BYTES || DEFAULT_MAX_BYTES);
  if (!Number.isFinite(max) || max <= 0) throw new ApiError(500, 'إعداد حجم الرفع غير صالح.');
  if (buffer.length > max) throw new ApiError(400, 'حجم الصورة كبير جداً (الحد الأقصى 4 ميجابايت).');
  if (!hasValidSignature(buffer, contentType)) throw new ApiError(400, 'محتوى الملف لا يطابق نوع الصورة المعلن.');

  const id = crypto.randomBytes(12).toString('hex');
  const ext = EXT[contentType];
  const file = `${id}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(file, buffer, {
      access: 'public',
      contentType,
    });
    return blob.url;
  }

  // Vercel's filesystem is ephemeral. Never silently claim persistence in a
  // production deployment when Blob storage has not been configured.
  if (process.env.NODE_ENV === 'production') {
    throw new ApiError(503, 'رفع الصور غير مفعّل في الإنتاج: أضف BLOB_READ_WRITE_TOKEN إلى Vercel.');
  }

  await fs.mkdir(dir(), { recursive: true });
  await fs.writeFile(path.join(dir(), file), buffer, { flag: 'wx' });
  return `/uploads/${file}`;
}
