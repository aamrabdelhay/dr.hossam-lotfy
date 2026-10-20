import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import { ApiError } from './api';
import { lawyerPhotoReference } from './lawyer-photo';

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

  // Lawyer profile images belong in the private store. The application serves
  // them through a guarded route only after a lawyer profile references them.
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    try {
      const blob = await put(`lawyer-photos/${file}`, buffer, {
        access: 'private',
        contentType,
        addRandomSuffix: false,
      });
      return lawyerPhotoReference(blob.url);
    } catch (error) {
      console.error('[lawyer-photo-upload] Blob upload failed:', error);
      throw new ApiError(
        502,
        'تعذر رفع الصورة إلى التخزين الخاص. تحقق من اتصال Vercel Blob ثم حاول مرة أخرى.',
      );
    }
  }

  // Local development only; never claim persistence on Vercel's ephemeral filesystem.
  if (process.env.NODE_ENV === 'production') {
    throw new ApiError(503, 'تخزين الصور غير متصل. اربط مخزن Vercel Blob الخاص بالمشروع ثم أعد المحاولة.');
  }

  await fs.mkdir(dir(), { recursive: true });
  await fs.writeFile(path.join(dir(), file), buffer, { flag: 'wx' });
  return `/uploads/${file}`;
}
