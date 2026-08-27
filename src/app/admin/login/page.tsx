import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';

export const metadata: Metadata = { title: 'دخول الإدارة' };

/** Demo office: one key — no e-mail, no password, no code. */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16">
      <div className="w-full text-center">
        <div className="mx-auto mb-6 h-20 w-20 overflow-hidden rounded-xl ring-1 ring-gold-500/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="logo" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-lg font-extrabold text-navy-950">إدارة المكتب</h1>
        <p className="mb-6 mt-1 text-[12.5px] font-semibold text-navy-400">
          اضغط المفتاح للدخول إلى صفحة إدارة المكتب.
        </p>

        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-[12.5px] font-semibold text-red-700">
            لا يوجد مستخدم إدارة مهيأ في قاعدة البيانات.
          </p>
        ) : null}

        <Link
          href="/api/auth/login"
          prefetch={false}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-950 px-5 py-3 text-[13px] font-extrabold text-white transition-colors hover:bg-navy-900"
        >
          <KeyRound size={16} />
          دخول الإدارة
        </Link>

        <p className="mt-4 text-[11px] font-semibold leading-5 text-navy-300">
          وضع تجريبي — لا يحتاج الدخول إلى بريد إلكتروني أو كلمة مرور.
        </p>
      </div>
    </div>
  );
}
