/**
 * Pure, client-safe helpers around task completion.
 *
 * «إنهاء» قبل المعاد مسموح به عمداً: يمكن للمحامي المكلّف تسجيل تنفيذ
 * المهمة حتى لو كان موعدها لم يحن بعد (تنفيذ مبكر)، ويمكن للأدمن الذي
 * يملك صلاحية writeTasks إغلاق المهمة نيابةً عن المحامي.
 */

export type TaskCompletionViewer = {
  role: 'admin' | 'lawyer';
  /** Lawyer id when role === 'lawyer'. */
  lawyerId?: string;
  /** Admin writeTasks permission when role === 'admin'. */
  canWriteTasks?: boolean;
} | null;

type CompletableTask = {
  status: string;
  lawyerIds: string[];
};

export function canCompleteTask(viewer: TaskCompletionViewer, task: CompletableTask): boolean {
  if (!viewer) return false;
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
  if (viewer.role === 'lawyer') {
    return !!viewer.lawyerId && task.lawyerIds.includes(viewer.lawyerId);
  }
  return viewer.canWriteTasks === true;
}
