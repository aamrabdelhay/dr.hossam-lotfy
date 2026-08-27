'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, Loader2 } from 'lucide-react';
import { Button } from './ui';
import { toastSuccess, toastError } from './toasts';
import { cn } from '@/lib/cn';

/**
 * «إنهاء» / «تم التنفيذ» button shared by every task surface. Works for the
 * assigned lawyer (early completion before the scheduled date included) and
 * for an admin holding writeTasks (closes on behalf of the lawyer).
 */
export function CompleteTaskButton({
  taskId,
  label = 'تم التنفيذ',
  size = 'sm',
  variant = 'gold',
  className,
}: {
  taskId: string;
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'gold' | 'outline' | 'ghost';
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const complete = async () => {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/tasks/${taskId}/complete`, { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      toastSuccess('تم تسجيل تنفيذ المهمة ✓');
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toastError(d.error ?? 'تعذر تسجيل التنفيذ.');
    }
  };

  return (
    <Button size={size} variant={variant} onClick={() => void complete()} disabled={busy} className={cn('ms-auto', className)}>
      {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={14} />}
      {label}
    </Button>
  );
}
