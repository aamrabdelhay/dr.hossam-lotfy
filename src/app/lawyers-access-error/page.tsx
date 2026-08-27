import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui';

export const metadata: Metadata = { title: 'تعذر الوصول' };

export default async function AccessErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600/10 text-red-600">
        <ShieldX size={30} />
      </span>
      <h1 className="text-lg font-extrabold text-navy-950">تعذر تسجيل الدخول</h1>
      <p className="text-[13px] leading-7 text-navy-500">
        {reason ?? 'الرابط غير صالح'}. اطلب رابط دخول جديد من إدارة المكتب.
      </p>
      <Link href="/"><Button variant="outline">العودة للرئيسية</Button></Link>
    </div>
  );
}
