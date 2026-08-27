import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';

export const metadata: Metadata = { title: 'الدخول' };

const ERROR_MESSAGES: Record<string, string> = {
  not_approved: 'حسابك بانتظار اعتماد الإدارة — ستتمكن من الدخول فور اعتماده.',
  not_registered: 'لا يوجد حساب محامٍ مرتبط بهذا البريد — سجّل لأول مرة أولاً.',
  oauth: 'تعذر تسجيل الدخول عبر Gmail. حاول مرة أخرى.',
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>;
}) {
  const { error, registered } = await searchParams;

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-md">
        {error && (
          <p className="relative mb-5 rounded-xl border border-red-600/20 bg-red-600/[0.06] px-4 py-3 text-center text-[12.5px] font-semibold text-red-700">
            {ERROR_MESSAGES[error] ?? 'حدث خطأ أثناء الدخول. حاول مرة أخرى.'}
          </p>
        )}
        {registered && (
          <p className="relative mb-5 rounded-xl border border-emerald-600/20 bg-emerald-600/[0.06] px-4 py-3 text-center text-[12.5px] font-semibold text-emerald-700">
            تم استلام طلب التسجيل ✓ — سيظهر حسابك في «المحامون» عند الإدارة بحالة بانتظار الاعتماد، وستتمكن من الدخول فور اعتماده.
          </p>
        )}
        <AuthCard />
      </div>
    </div>
  );
}
