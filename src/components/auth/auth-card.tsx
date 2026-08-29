'use client';

import * as React from 'react';
import { Scale, UserRoundPlus, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LawyerLoginForm } from './lawyer-login-form';
import { LawyerRegisterForm } from './lawyer-register-form';
import { AdminLoginForm } from './admin-login-form';

type Mode = 'login' | 'register' | 'admin';

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
];

/**
 * One premium, centered card with three selectable modes (login / register /
 * admin) — a single card, not three separate pages.
 */
export function AuthCard() {
  const [mode, setMode] = React.useState<Mode>('login');
  const active = MODES.find((m) => m.id === mode)!;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(720px_280px_at_50%_-60px,var(--accent-soft),transparent_70%)]"
      />

      <div className="overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-lift ring-1 ring-line backdrop-blur-sm">
        {/* Header */}
        <div className="masthead relative px-6 py-7 text-center">
          <div className="relative">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-[var(--masthead-accent)] ring-2 ring-white/15">
              <Scale size={26} />
            </span>
            <h1 className="text-xl font-extrabold text-[var(--masthead-fg)]">بوابة الدخول</h1>
            <p className="mx-auto mt-1.5 max-w-xs text-[12px] font-medium leading-6 text-[var(--masthead-muted)]">
              DR. HOSSAM LOTFY LAW FIRM — اختر الطريقة المناسبة للمتابعة.
            </p>
          </div>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-[var(--masthead-seal)]/60 to-transparent" />
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 border-b border-line bg-inset px-2 pt-2" role="tablist" aria-label="طرق الدخول">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-t-xl px-2 py-2.5 text-[11.5px] font-bold transition-colors duration-200 sm:flex-row sm:justify-center sm:gap-1.5',
                mode === m.id ? 'bg-surface text-accent' : 'text-muted hover:text-ink-2',
              )}
            >
              <span className={cn('transition-colors', mode === m.id ? 'text-accent' : 'text-faint')}>{m.icon}</span>
              <span>{m.label}</span>
              {mode === m.id && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden />}
            </button>
          ))}
        </div>

        {/* Active panel */}
        <div className="px-6 py-6">
          <div className="mb-4 text-center">
            <h2 className="text-[15px] font-extrabold text-ink-strong">{active.heading}</h2>
            <p className="mt-1 text-[12px] font-medium leading-6 text-muted">{active.sub}</p>
          </div>
          {mode === 'login' && <LawyerLoginForm />}
          {mode === 'register' && <LawyerRegisterForm />}
          {mode === 'admin' && <AdminLoginForm />}
        </div>
      </div>

      <p
        className="mt-6 text-center font-latin text-[10px] uppercase tracking-[3px] text-faint"
      >
        DR. HOSSAM LOTFY LAW FIRM
      </p>
    </div>
  );
}
