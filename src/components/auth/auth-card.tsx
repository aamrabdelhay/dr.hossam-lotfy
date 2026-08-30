'use client';

import * as React from 'react';
import Link from 'next/link';
import { Scale, UserRoundPlus, ShieldCheck, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LawyerLoginForm } from './lawyer-login-form';
import { LawyerRegisterForm } from './lawyer-register-form';
import { AdminLoginForm } from './admin-login-form';

type Mode = 'login' | 'register' | 'admin' | 'trainee';

const MODES: Array<{
  id: Mode;
  label: string;
  icon: React.ReactNode;
  heading: string;
  sub: string;
}> = [
  {
    id: 'login',
    label: 'تسجيل دخول',
    icon: <Scale size={16} />,
    heading: 'دخول محامي',
    sub: 'للمحامين المعتمدين — أدخل اسمك الأولين وبريد Gmail.',
  },
  {
    id: 'register',
    label: 'تسجيل أول مرة',
    icon: <UserRoundPlus size={16} />,
    heading: 'تسجيل محامٍ جديد',
    sub: 'سجّل بياناتك وسيراجعها المكتب قبل الاعتماد.',
  },
  {
    id: 'admin',
    label: 'دخول الإدارة',
    icon: <ShieldCheck size={16} />,
    heading: 'دخول الإدارة',
    sub: 'لفريق إدارة المكتب فقط — أدخل كود الإدارة.',
  },
  {
    id: 'trainee',
    label: 'تقديم كمتدرب',
    icon: <GraduationCap size={16} />,
    heading: 'التقديم كمتدرب',
    sub: 'المتدرب لا يحتاج إلى حساب أو تسجيل دخول. أرسل طلبك فقط، وستراجعه الإدارة.',
  },
];

export function AuthCard() {
  const [mode, setMode] = React.useState<Mode>('login');
  const active = MODES.find((m) => m.id === mode)!;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(720px_280px_at_50%_-60px,rgba(212,169,63,0.14),transparent_70%)]"
      />

      <div className="overflow-hidden rounded-3xl border border-navy-100/80 bg-white/95 shadow-lift ring-1 ring-navy-950/5 backdrop-blur-sm">
        <div className="relative bg-navy-950 px-6 py-7 text-center">
          <div className="mesh-gold absolute inset-0" aria-hidden />
          <div className="relative">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-gold-400 ring-2 ring-gold-500/40">
              <Scale size={26} />
            </span>
            <h1 className="text-xl font-extrabold text-ivory-50">بوابة الدخول</h1>
            <p className="mx-auto mt-1.5 max-w-xs text-[12px] font-medium leading-6 text-ivory-300">
              DR. HOSSAM LOTFY LAW FIRM — اختر الطريقة المناسبة للمتابعة.
            </p>
          </div>
          <span className="gold-hairline absolute inset-x-0 bottom-0" aria-hidden />
        </div>

        <div className="grid grid-cols-2 gap-1 border-b border-navy-100 bg-ivory-50 px-2 pt-2 sm:grid-cols-4" role="tablist" aria-label="طرق الدخول والتقديم">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'relative flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-t-xl px-2 py-2 text-[10.5px] font-bold transition-colors duration-200 sm:flex-row sm:gap-1.5 sm:text-[11px]',
                mode === m.id ? 'bg-white text-navy-950' : 'text-navy-400 hover:text-navy-700',
              )}
            >
              <span className={cn('transition-colors', mode === m.id ? 'text-gold-600' : 'text-navy-300')}>{m.icon}</span>
              <span>{m.label}</span>
              {mode === m.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gradient-to-l from-gold-400 to-gold-600" aria-hidden />}
            </button>
          ))}
        </div>

        <div className="px-6 py-6">
          <div className="mb-4 text-center">
            <h2 className="text-[15px] font-extrabold text-navy-950">{active.heading}</h2>
            <p className="mt-1 text-[12px] font-medium leading-6 text-navy-400">{active.sub}</p>
          </div>
          {mode === 'login' && <LawyerLoginForm />}
          {mode === 'register' && <LawyerRegisterForm />}
          {mode === 'admin' && <AdminLoginForm />}
          {mode === 'trainee' && (
            <div className="rounded-2xl border border-gold-200/70 bg-gold-50/50 p-5 text-center">
              <GraduationCap className="mx-auto mb-3 text-gold-600" size={30} />
              <p className="text-[12px] font-medium leading-6 text-navy-500">
                التقديم متاح بدون إنشاء حساب وبدون تسجيل دخول. املأ نموذج طلب التدريب فقط، وسيظهر الطلب للإدارة لمراجعته.
              </p>
              <Link
                href="/training"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-navy-950 px-5 py-2.5 text-[12px] font-bold text-white shadow-soft transition hover:bg-navy-900"
              >
                فتح نموذج التقديم
              </Link>
            </div>
          )}
        </div>
      </div>

      <p
        className="mt-6 text-center text-[10px] uppercase tracking-[3px] text-navy-300"
        style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '3px' }}
      >
        DR. HOSSAM LOTFY LAW FIRM
      </p>
    </div>
  );
}
