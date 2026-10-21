import { ApiError, handle, json, readJson, user } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const MAX_LOGO_BYTES = 500 * 1024;
const schema = z.object({ logoDataUrl: z.string().max(700000).nullable() });

async function authorize() {
  const session = await user();
  if (!session) throw new ApiError(401, 'يجب تسجيل الدخول');
  if (session.role !== 'admin' && !(await isSeniorManagement(session))) {
    throw new ApiError(403, 'صلاحية الإدارة العليا مطلوبة لتغيير شعار الموقع');
  }
  return session;
}

function validateLogo(value: string | null) {
  if (value === null) return null;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new ApiError(400, 'الشعار غير صالح. استخدم PNG أو JPG أو WebP.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length <= 0 || bytes.length > MAX_LOGO_BYTES) {
    throw new ApiError(413, 'يجب ألا يتجاوز حجم الشعار 500 كيلوبايت.');
  }
  const type = match[1];
  const isPng = type === 'png' && bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = type === 'jpeg' && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = type === 'webp' && bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!isPng && !isJpeg && !isWebp) throw new ApiError(400, 'محتوى الصورة لا يتوافق مع نوع الشعار المعلن.');
  return 'data:image/' + type + ';base64,' + bytes.toString('base64');
}

export const GET = handle(async () => {
  await authorize();
  const rows = await prisma.$queryRawUnsafe<Array<{ logo_data_url: string | null }>>(
    `SELECT "logo_data_url" FROM "office_site_settings" WHERE "id" = 'default' LIMIT 1`,
  );
  return json({ logoDataUrl: rows[0]?.logo_data_url ?? null }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
});

export const POST = handle(async (request: Request) => {
  await authorize();
  const body = await readJson(request, schema);
  const logoDataUrl = validateLogo(body.logoDataUrl);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "office_site_settings" ("id", "logo_data_url", "updated_at")
     VALUES ('default', $1, NOW())
     ON CONFLICT ("id") DO UPDATE SET "logo_data_url" = EXCLUDED."logo_data_url", "updated_at" = NOW()`,
    logoDataUrl,
  );
  return json({ ok: true, logoDataUrl }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
});
