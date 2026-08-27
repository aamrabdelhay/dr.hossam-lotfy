import type { Metadata } from 'next';
import Link from 'next/link';
import { Scale, UserRoundPlus, ShieldCheck } from 'lucide-react';
import { LawyerRegisterForm } from '@/components/auth/lawyer-register-form';
import { AdminLoginForm } from '@/components/auth/admin-login-form';

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
    <div className="relative mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(720px_280px_at_50%_-60px,rgba(212,169,63,0.12),transparent_70%)]" />

      <div className="relative mb-10 text-center">
        <h1 className="text-2xl font-extrabold text-navy-950">بوابة الدخول</h1>
        <p className="mx-auto mt-2 max-w-xl text-[13px] font-medium leading-6 text-navy-400">
          ثلاث طرق للوصول إلى منصة المكتب — اختر ما يناسبك.
        </p>
      </div>

      {error && (
        <p className="relative mb-6 rounded-xl border border-red-600/20 bg-red-600/[0.06] px-4 py-3 text-center text-[12.5px] font-semibold text-red-700">
          {ERROR_MESSAGES[error] ?? 'حدث خطأ أثناء الدخول. حاول مرة أخرى.'}
        </p>
      )}
      {registered && (
        <p className="relative mb-6 rounded-xl border border-emerald-600/20 bg-emerald-600/[0.06] px-4 py-3 text-center text-[12.5px] font-semibold text-emerald-700">
          تم استلام طلب التسجيل ✓ — سيظهر حسابك في «المحامون» عند الإدارة بحالة بانتظار الاعتماد، وستتمكن من الدخول فور اعتماده.
        </p>
      )}

      <div className="relative grid gap-5 md:grid-cols-3">
        {/* 1 — دخول محامي */}
        <section className="flex flex-col rounded-3xl border border-navy-100/80 bg-white/90 p-6 shadow-lift backdrop-blur-sm">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-950 text-gold-400 ring-2 ring-gold-500/40">
            <Scale size={22} />
          </span>
          <h2 className="text-[15px] font-extrabold text-navy-950">دخول محامي</h2>
          <p className="mt-1.5 flex-1 text-[12px] font-medium leading-6 text-navy-400">
            للمحامين المعتمدين في المكتب — ادخل بحساب Gmail الخاص بك.
          </p>
          <Link
            href="/api/auth/google"
            prefetch={false}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-400 to-gold-500 px-5 py-3 text-[13px] font-extrabold text-navy-950 shadow-[0_2px_8px_-2px_rgba(212,169,63,0.5)] transition-all duration-200 hover:from-gold-300 hover:to-gold-400 active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            المتابعة بحساب Gmail
          </Link>
        </section>

        {/* 2 — تسجيل أول مرة */}
        <section className="rounded-3xl border border-navy-100/80 bg-white/90 p-6 shadow-lift backdrop-blur-sm">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/15 text-gold-700 ring-2 ring-gold-500/30">
            <UserRoundPlus size={22} />
          </span>
          <h2 className="text-[15px] font-extrabold text-navy-950">تسجيل أول مرة</h2>
          <p className="mt-1.5 text-[12px] font-medium leading-6 text-navy-400">
            محامٍ جديد؟ سجّل بياناتك وسيراجعها المكتب قبل الاعتماد.
          </p>
          <LawyerRegisterForm />
        </section>

        {/* 3 — تسجيل دخول إدارة */}
        <section className="rounded-3xl border border-navy-100/80 bg-white/90 p-6 shadow-lift backdrop-blur-sm">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-950 text-gold-400 ring-2 ring-gold-500/40">
            <ShieldCheck size={22} />
          </span>
          <h2 className="text-[15px] font-extrabold text-navy-950">تسجيل دخول إدارة</h2>
          <p className="mt-1.5 text-[12px] font-medium leading-6 text-navy-400">
            لفريق إدارة المكتب فقط — أدخل رمز الدخول.
          </p>
          <AdminLoginForm />
        </section>
      </div>

      <p className="relative mt-8 text-center text-[10px] tracking-[3px] uppercase text-navy-300" style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '3px' }}>
        DR. HOSSAM LOTFY LAW FIRM
      </p>
    </div>
  );
}
