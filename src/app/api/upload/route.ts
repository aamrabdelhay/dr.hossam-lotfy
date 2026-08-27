import { NextResponse } from 'next/server';
import { saveUpload } from '@/lib/upload';
import { user } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const DEFAULT_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Secure image upload (PNG/JPG/WebP, ≤4MB).
 * - Lawyer: may update own profile/cover photo (URL returned; client persists it via lawyer update).
 * - Admin: may upload any image.
 * Files are stored on persistent Vercel Blob in production, or local storage in development.
 */
export async function POST(req: Request) {
  const session = await user();
  if (!session) {
    return NextResponse.json({ error: 'سجّل الدخول أولاً لرفع صورة' }, { status: 401 });
  }

  const max = Number(process.env.MAX_UPLOAD_BYTES || DEFAULT_MAX_UPLOAD_BYTES);
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 0 && Number.isFinite(max) && contentLength > max + 64 * 1024) {
    return NextResponse.json({ error: 'حجم الصورة كبير جداً (الحد الأقصى 4 ميجابايت).' }, { status: 413 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'لم يتم إرسال ملف الصورة' }, { status: 400 });
  }
  const image = file as File;
  if (image.size > max) {
    return NextResponse.json({ error: 'حجم الصورة كبير جداً (الحد الأقصى 4 ميجابايت).' }, { status: 413 });
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  try {
    const url = await saveUpload(buffer, image.type);
    await logActivity({
      action: 'PHOTO_UPDATED',
      summary: `رفع صورة جديدة: ${session.name}`,
      byLawyerId: session.role === 'lawyer' ? session.lawyerId : null,
      byUserId: session.role === 'admin' ? session.userId : null,
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'تعذر رفع الصورة';
    const status = e instanceof Error && 'status' in e && typeof (e as { status?: unknown }).status === 'number'
      ? (e as { status: number }).status
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
