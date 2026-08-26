import { NextResponse } from 'next/server';
import { saveUpload } from '@/lib/upload';
import { user } from '@/lib/api';
import { logActivity } from '@/lib/activity';

/**
 * Secure image upload (PNG/JPG/WebP, ≤5MB).
 * - Lawyer: may update own profile/cover photo (URL returned; client persists it via lawyer update).
 * - Admin: may upload any image.
 * Files are stored on secure local storage (gitignored), never in the frontend repo.
 */
export async function POST(req: Request) {
  const session = await user();
  if (!session) {
    return NextResponse.json({ error: 'سجّل الدخول أولاً لرفع صورة' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'لم يتم إرسال ملف الصورة' }, { status: 400 });
  }
  const buffer = Buffer.from(await (file as File).arrayBuffer());
  try {
    const url = await saveUpload(buffer, (file as File).type);
    await logActivity({
      action: 'PHOTO_UPDATED',
      summary: `رفع صورة جديدة: ${session.name}`,
      byLawyerId: session.role === 'lawyer' ? session.lawyerId : null,
      byUserId: session.role === 'admin' ? session.userId : null,
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'تعذر رفع الصورة';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
