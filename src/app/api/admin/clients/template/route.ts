import { NextResponse } from 'next/server';
import { handle, json } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { createXlsx } from '@/lib/xlsx';

export const GET = handle(async () => {
  const session = await getCurrentUser();
  if (!session) return json({ error: 'يجب تسجيل الدخول أولاً.' }, { status: 401 });
  if (!(session.role === 'admin' || (session.role === 'lawyer' && session.isAdmin))) {
    return json({ error: 'تنزيل نموذج الاستيراد يتطلب صلاحية الإدارة.' }, { status: 403 });
  }

  const headers = [
    'اسم العميل', 'رقم الهاتف', 'البريد الإلكتروني', 'الرقم القومي', 'العنوان', 'ملاحظات',
    'اسم القضية', 'رقم القضية', 'وصف القضية', 'المستجدات', 'تاريخ المستجد', 'نوع المستجد',
  ];
  const workbook = createXlsx(headers, [], 'نموذج استيراد العملاء');
  return new NextResponse(workbook, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="loutfi-client-import-template.xlsx"',
      'Cache-Control': 'private, no-store',
    },
  });
});
