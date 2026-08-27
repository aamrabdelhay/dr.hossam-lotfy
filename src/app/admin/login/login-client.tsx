'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { Button, Card, Field, Input } from '@/components/ui';
import { toastError } from '@/components/toasts';

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    const trimmed = email.trim();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // email is optional — when omitted the API falls back to the first staff account
      body: JSON.stringify(trimmed ? { email: trimmed, password } : { password }),
    });
    setBusy(false);
    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toastError(d.error ?? 'فشل تسجيل الدخول.');
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4">
        <Field label="البريد الإلكتروني" hint="اختياري — اتركه فارغاً لدخول الحساب الرئيسي">
          <div className="relative">
            <Mail size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <Input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@loutfilawfirm.net"
              className="ps-9 ltr text-start"
              dir="ltr"
            />
          </div>
        </Field>
        <Field label="كلمة المرور" required>
          <div className="relative">
            <Lock size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="ps-9"
              autoFocus
            />
          </div>
        </Field>
        <Button type="submit" className="w-full" disabled={busy || !password}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
          دخول
        </Button>
        <p className="text-center text-[11px] font-semibold leading-5 text-navy-300">
          محاولات الدخول محدودة (5 محاولات كل 15 دقيقة) لحماية الحساب.
        </p>
      </form>
    </Card>
  );
}
