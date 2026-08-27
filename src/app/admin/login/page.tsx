import type { Metadata } from 'next';

import { AdminLoginForm } from './login-client';

export const metadata: Metadata = { title: 'دخول المسؤول' };

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16">
      <div className="w-full">
        <div className="mx-auto mb-6 h-20 w-20 overflow-hidden rounded-xl ring-1 ring-gold-500/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="logo" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-center text-lg font-extrabold text-navy-950">بوابة المسؤول</h1>
        <p className="mb-6 mt-1 text-center text-[12.5px] font-semibold text-navy-400">
          هذه المنطقة مخصصة لفريق المكتب فقط. أدخل بريدك وكلمة المرور للمتابعة.
        </p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
