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
    <div className="relative mx-auto flex w-full max-w-md flex-col items-center overflow-hidden px-4 py-20">
      {/* Ambient background accents */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(560px_280px_at_50%_-60px,rgba(212,169,63,0.14),transparent_70%)]" />
      <span aria-hidden className="pointer-events-none absolute -start-24 top-40 h-64 w-64 rounded-full bg-navy-600/10 blur-3xl" />

      <div className="relative w-full rounded-3xl border border-navy-100/80 bg-white/90 p-8 shadow-lift backdrop-blur-sm sm:p-10">
        <div className="w-full text-center">
          <div className="mx-auto mb-6 h-20 w-20 overflow-hidden rounded-2xl shadow-glow-gold ring-2 ring-gold-500/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-xl font-extrabold text-navy-950">إدارة المكتب</h1>
          <p className="mb-7 mt-1.5 text-[12.5px] font-semibold leading-6 text-navy-400">
            اضغط المفتاح للدخول إلى صفحة إدارة المكتب.
          </p>

          {error ? (
            <p className="mb-5 rounded-xl border border-red-600/20 bg-red-600/[0.06] px-4 py-3 text-[12.5px] font-semibold text-red-700">
              لا يوجد مستخدم إدارة مهيأ في قاعدة البيانات.
            </p>
          ) : null}

          <Link
            href="/api/auth/login"
            prefetch={false}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-400 to-gold-500 px-5 py-3.5 text-[13px] font-extrabold text-navy-950 shadow-[0_2px_8px_-2px_rgba(212,169,63,0.5)] transition-all duration-200 hover:from-gold-300 hover:to-gold-400 hover:shadow-glow-gold active:scale-[0.98]"
          >
            <KeyRound size={16} />
            دخول الإدارة
          </Link>

          <p className="mt-5 text-[11px] font-semibold leading-5 text-navy-300">
            وضع تجريبي — لا يحتاج الدخول إلى بريد إلكتروني أو كلمة مرور.
          </p>
        </div>
      </div>

      {/* Wordmark footer */}
      <p
        className="mt-8 text-center text-[10px] tracking-[3px] uppercase text-navy-300"
        style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '3px' }}
      >
        DR. HOSSAM LOTFY LAW FIRM
      </p>
    </div>
  );
}
