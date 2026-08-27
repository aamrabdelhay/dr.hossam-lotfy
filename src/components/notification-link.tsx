'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';

/**
 * عنصر إشعار في صفحة الإشعارات: عند الضغط يُعلَّم الإشعار كمقروء
 * (PATCH /api/notifications/[id]) ثم يُفتح رابطه العميق.
 */
export function NotificationLink({
  id,
  href,
  read,
  className,
  children,
}: {
  id: string;
  href: string;
  read: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const onClick = async (e: React.MouseEvent) => {
    if (!read) {
      e.preventDefault();
      try {
        await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      } catch {
        /* ignore */
      }
      router.push(href);
      router.refresh();
    }
  };

  return (
    <Link href={href} onClick={onClick} className={cn(className)}>
      {children}
    </Link>
  );
}
