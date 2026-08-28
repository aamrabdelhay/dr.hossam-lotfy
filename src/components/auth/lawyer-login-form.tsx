'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Scale } from 'lucide-react';
import { Button, Field, Input } from '../ui';

const REMEMBER_KEY = 'hl-lawyer-login';

type RememberedLogin = { name?: string; email?: string };

/**
 * Lawyer sign-in WITHOUT Google OAuth. The lawyer enters their first two names
 * and their Gmail address; the backend matches the approved lawyer and opens a
 * session, then the client redirects to that lawyer's profile.
 */
export function LawyerLoginForm() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) ?? 'null') as RememberedLogin | null;
      if (saved?.name) setName(saved.name);
      if (saved?.email) setEmail(saved.email);
    } catch {
      // Ignore malformed or blocked local storage.
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || busy) return;
    setBusy(true);
    setError(null);
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const res = await fetch('/api/auth/lawyer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: normalizedName, email: normalizedEmail }),
    });
    setBusy(false);
    if (res.ok) {
      try {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ name: normalizedName, email: normalizedEmail }));
      } catch {
        // Remembering the fields is an enhancement, not a login dependency.
      }
      const d = await res.json().catch(() => ({}));
      router.replace(d.slug ? `/lawyers/${d.slug}` : '/');
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'تعذر تسجيل الدخول. تحقق من الاسم والبريد.');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="الاسم" required hint="الاسمين الأولين فقط (مثال: أحمد محمد)">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="أحمد محمد"
          autoComplete="name"
        />
      </Field>
      <Field label="البريد الإلكتروني" required hint="Gmail">
        <Input
          type="email"
          dir="ltr"
          className="ltr text-start"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@gmail.com"
          autoComplete="email"
        />
      </Field>
      {error && (
        <p className="rounded-lg border border-red-600/20 bg-red-600/[0.06] px-3 py-2 text-[11.5px] font-semibold text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Scale size={14} />}
        دخول
      </Button>
    </form>
  );
}
