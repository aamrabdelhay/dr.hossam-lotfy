export const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const TASK_STATUS_LABEL: Record<string, string> = {
  PENDING: 'قيد الجدولة',
  IN_PROGRESS: 'جاري التنفيذ',
  COMPLETED: 'تم التنفيذ',
  CANCELLED: 'ملغي',
};
