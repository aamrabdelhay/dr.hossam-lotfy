'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound } from 'lucide-react';
import { Button, Field, Input } from '../ui';

const REMEMBER_KEY = 'hl-admin-login';

export function AdminLoginForm() {
  const router = useRouter();
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(REMEMBER_KEY);
      if (saved) setCode(saved);
    } catch {
      // Browser storage may be unavailable; login still works normally.
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    const normalizedCode = code.trim();
    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizedCode }),
        cache: 'no-store',
      });
      if (res.ok) {
        try { sessionStorage.setItem(REMEMBER_KEY, normalizedCode); } catch { /* ignore */ }
        // replace alone is enough; avoid the extra refresh request that made admin entry feel slow.
        window.location.replace('/admin');
        return;
      }
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'رمز الدخول غير صحيح');
    } catch {
      setError('تعذر الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-3" autoComplete="on">
      <Field label="رمز الدخول" required>
        <Input
          type="password"
          autoComplete="current-password"
          name="password"
          dir="ltr"
          className="ltr text-start tracking-[0.3em]"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="••"
        />
      </Field>
      {error && (
        <p className="rounded-lg border border-red-600/20 bg-red-600/[0.06] px-3 py-2 text-[11.5px] font-semibold text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
        دخول الإدارة
      </Button>
    </form>
  );
}
