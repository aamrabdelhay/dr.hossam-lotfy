'use client';

import * as React from "react";
import { Laptop, LogOut, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";

type DeviceSession = { id: string; ip: string | null; userAgent: string | null; createdAt: string; expiresAt: string; current: boolean };

function deviceLabel(agent: string | null) {
  if (!agent) return "جهاز غير محدد";
  if (/iphone|ipad|ipod/i.test(agent)) return "جهاز Apple";
  if (/android/i.test(agent)) return "جهاز Android";
  if (/windows/i.test(agent)) return "كمبيوتر Windows";
  if (/macintosh|mac os/i.test(agent)) return "كمبيوتر Mac";
  if (/linux/i.test(agent)) return "كمبيوتر Linux";
  return "جهاز / متصفح آخر";
}

export function SessionManager({ initial }: { initial: DeviceSession[] }) {
  const [sessions, setSessions] = React.useState(initial);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const refresh = async () => {
    setBusy("refresh"); setError("");
    try {
      const response = await fetch("/api/auth/sessions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحميل الجلسات.");
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الجلسات.");
    } finally { setBusy(null); }
  };

  const revoke = async (sessionId: string) => {
    setBusy(sessionId); setError(""); setNotice("");
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر إنهاء الجلسة.");
      setSessions((items) => items.filter((item) => item.id !== sessionId));
      setNotice("تم إنهاء جلسة الدخول المختارة.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنهاء الجلسة.");
    } finally { setBusy(null); }
  };

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-base font-extrabold text-navy-950">الأجهزة وجلسات الدخول</h2><p className="mt-1 text-xs text-navy-500">راجع جلسات حسابك وأنهِ أي جلسة لا تعرفها. لا تظهر هنا جلسات مستخدمين آخرين.</p></div>
      <button type="button" onClick={() => void refresh()} disabled={busy !== null} className="inline-flex items-center gap-2 rounded-xl border border-navy-200 px-3 py-2 text-xs font-bold text-navy-700 disabled:opacity-50"><RefreshCw size={14}/>تحديث</button>
    </div>
    {sessions.length === 0 ? <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-6 text-center text-sm text-navy-500">لا توجد جلسات نشطة.</div> :
      <div className="space-y-2">{sessions.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-navy-100 bg-white p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ivory-100 text-navy-700">{/iphone|ipad|android/i.test(item.userAgent || "") ? <Smartphone size={18}/> : <Laptop size={18}/>}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold text-navy-950">{deviceLabel(item.userAgent)}</p>{item.current && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"><ShieldCheck size={12}/>الجهاز الحالي</span>}</div>
          <p className="mt-1 break-all text-[11px] text-navy-500">{item.userAgent || "متصفح غير معروف"}</p>
          <p className="mt-1 text-[10px] font-semibold text-navy-400">IP: {item.ip || "غير متاح"} · بدأ: {new Date(item.createdAt).toLocaleString("ar-EG")} · ينتهي: {new Date(item.expiresAt).toLocaleDateString("ar-EG")}</p>
        </div>
        {!item.current && <button type="button" onClick={() => void revoke(item.id)} disabled={busy !== null} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"><LogOut size={14}/>{busy === item.id ? "جارٍ الإنهاء…" : "إنهاء الجلسة"}</button>}
      </div>)}</div>}
    {error && <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
    {notice && <p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{notice}</p>}
  </section>;
}
