import type { Metadata } from 'next';
import { AdminLoginForm } from '@/components/auth/admin-login-form';

export const metadata: Metadata = { title: 'دخول الإدارة' };

/** Office admin sign-in — access code only (no e-mail/password). */
export default function AdminLoginPage() {
  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col items-center overflow-hidden px-4 py-20">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(560px_280px_at_50%_-60px,rgba(212,169,63,0.14),transparent_70%)]" />
      <span aria-hidden className="pointer-events-none absolute -start-24 top-40 h-64 w-64 rounded-full bg-navy-600/10 blur-3xl" />

      <div className="relative w-full rounded-3xl border border-navy-100/80 bg-white/90 p-8 shadow-lift backdrop-blur-sm sm:p-10">
        <div className="w-full text-center">
          <div className="mx-auto mb-6 h-20 w-20 overflow-hidden rounded-2xl shadow-glow-gold ring-2 ring-gold-500/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-xl font-extrabold text-navy-950">إدارة المكتب</h1>
          <p className="mb-5 mt-1.5 text-[12.5px] font-semibold leading-6 text-navy-400">
            أدخل رمز الدخول للوصول إلى منطقة الإدارة.
          </p>
          <div className="text-start">
            <AdminLoginForm />
          </div>
        </div>
      </div>

      <p
        className="mt-8 text-center text-[10px] tracking-[3px] uppercase text-navy-300"
        style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '3px' }}
      >
        DR. HOSSAM LOTFY LAW FIRM
      </p>
    </div>
  );
}
