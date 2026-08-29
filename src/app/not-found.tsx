import Link from 'next/link';
import { Gavel } from 'lucide-react';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <span className="masthead flex h-16 w-16 items-center justify-center rounded-2xl text-[var(--masthead-accent)] shadow-card">
        <Gavel size={28} />
      </span>
      <h1 className="text-lg font-extrabold text-navy-950">الصفحة غير موجودة</h1>
      <p className="text-[13px] leading-7 text-navy-400">
        ربما تم نقل الصفحة أو حذفها. يمكنك العودة للرئيسية أو استخدام البحث.
      </p>
      <div className="flex gap-2">
        <Link href="/"><Button variant="gold">الرئيسية</Button></Link>
        <Link href="/search"><Button variant="outline">البحث</Button></Link>
      </div>
    </div>
  );
}
