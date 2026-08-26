'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, Lock } from 'lucide-react';
import { Button, Card, Field, Input } from '@/components/ui';
import { toastError } from '@/components/toasts';

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
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
        <Field label="كلمة مرور المسؤول" required>
          <div className="relative">
            <Lock size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <Input
              type="password"
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
      </form>
    </Card>
  );
}
