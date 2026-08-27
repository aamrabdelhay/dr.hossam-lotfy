'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button, Card, Field, Input } from '@/components/ui';
import { toastError } from '@/components/toasts';

/** Demo-office gate: the public site has no account login. */
export function AdminLoginForm() {
  const router = useRouter();
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toastError(d.error ?? 'كود الدخول غير صحيح.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4">
        <Field label="كود دخول الإدارة" required hint="أدخل كود المكتب للانتقال إلى صفحة الإدارة">
          <Input
            type="password"
            name="code"
            required
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="••••"
            autoFocus
            dir="ltr"
            className="text-center tracking-[0.35em]"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={busy || !code.trim()}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
          دخول الإدارة
        </Button>
        <p className="text-center text-[11px] font-semibold leading-5 text-navy-300">
          وضع تجريبي — لا يحتاج الموقع العام إلى بريد إلكتروني أو كلمة مرور.
        </p>
      </form>
    </Card>
  );
}
