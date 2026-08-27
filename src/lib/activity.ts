import 'server-only';
import { prisma } from './prisma';

export type ActivityAction =
  | 'CREATED'
  | 'EDITED'
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'COMPLETED'
  | 'COMMENTED'
  | 'DELETED'
  | 'PHOTO_UPDATED'
  | 'PROFILE_UPDATED'
  | 'LOCATION_ADDED'
  | 'LAWYER_ADDED'
  | 'LAWYER_REGISTERED'
  | 'LAWYER_APPROVED'
  | 'LAWYER_REJECTED'
  | 'USER_ADDED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'CASE_EVENT';

export async function logActivity(input: {
  action: ActivityAction;
  summary: string;
  taskId?: string | null;
  lawyerId?: string | null;
  locationId?: string | null;
  byUserId?: string | null;
  byLawyerId?: string | null;
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        action: input.action,
        summary: input.summary,
        taskId: input.taskId ?? undefined,
        lawyerId: input.lawyerId ?? undefined,
        locationId: input.locationId ?? undefined,
        byUserId: input.byUserId ?? undefined,
        byLawyerId: input.byLawyerId ?? undefined,
      },
    });
  } catch {
    // activity logging must never break the main flow
  }
}

export const ACTIVITY_LABEL: Record<string, string> = {
  CREATED: 'أُنشئت',
  EDITED: 'تم التعديل',
  ASSIGNED: 'تم الإسناد',
  REASSIGNED: 'إعادة إسناد',
  COMPLETED: 'تم التنفيذ',
  COMMENTED: 'تعليق',
  DELETED: 'حذف',
  PHOTO_UPDATED: 'تحديث صورة',
  PROFILE_UPDATED: 'تحديث الملف',
  LOCATION_ADDED: 'إضافة مكان',
  LAWYER_ADDED: 'إضافة محامي',
  LAWYER_REGISTERED: 'تسجيل محامٍ جديد',
  LAWYER_APPROVED: 'اعتماد محامٍ',
  LAWYER_REJECTED: 'رفض محامٍ',
  USER_ADDED: 'إضافة حساب',
  USER_UPDATED: 'تعديل حساب',
  USER_DELETED: 'حذف حساب',
  CASE_EVENT: 'حدث قضية',
};
