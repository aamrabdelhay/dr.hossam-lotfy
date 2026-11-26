'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { shouldShowPwaActions } from '@/lib/pwa-display-core';
import { BellRing, Download, Loader2, RefreshCw, Smartphone } from 'lucide-react';

type SubscribeResponse = { key?: string; enabled?: boolean; error?: string };

function base64UrlToBytes(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function PwaPushManager() {
  const pathname = usePathname();
  const [installPrompt, setInstallPrompt] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);
  const [pushEnabled, setPushEnabled] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [updateReady, setUpdateReady] = React.useState(false);

  React.useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    let active = true;
    let notificationPollId: ReturnType<typeof setInterval> | undefined;
    let updateCheckId: ReturnType<typeof setInterval> | undefined;
    let currentRegistration: ServiceWorkerRegistration | null = null;
    let hadController = 'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller);

    const onControllerChange = () => {
      if (!active) return;
      if (hadController) setUpdateReady(true);
      hadController = Boolean(navigator.serviceWorker.controller) || hadController;
    };
    const checkForUpdates = () => {
      if (!active || !currentRegistration || document.visibilityState !== 'visible') return;
      void currentRegistration.update().catch(() => undefined);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(async (registration) => {
        if (!active) return;
        currentRegistration = registration;
        const subscription = 'PushManager' in window
          ? await registration.pushManager.getSubscription().catch(() => null)
          : null;
        if (!active) return;
        setPushEnabled(Boolean(subscription));

        const seen = new Set<string>();
        let initialLoad = true;
        const poll = async () => {
          try {
            const response = await fetch('/api/notifications', { cache: 'no-store' });
            if (!response.ok) return;
            const data = await response.json() as { notifications?: Array<{id:string;title:string;body?:string|null;link?:string|null;createdAt:string}> };
            const rows = data.notifications ?? [];
            if (initialLoad) {
              rows.forEach((item) => seen.add(item.id));
              initialLoad = false;
              return;
            }
            for (const item of rows) {
              if (seen.has(item.id)) continue;
              seen.add(item.id);
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                await registration.showNotification(item.title, {
                  body: item.body || 'لديك تذكير جديد من مكتب لوتفي.',
                  icon: '/logo.png',
                  badge: '/logo.png',
                  tag: item.id,
                  dir: 'rtl',
                  lang: 'ar',
                  data: { url: item.link || '/notifications' }
                });
              }
            }
          } catch { /* temporary offline state; retry on next poll */ }
        };

        notificationPollId = setInterval(() => { void poll(); }, 60_000);
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('focus', checkForUpdates);
        window.addEventListener('online', checkForUpdates);
        checkForUpdates();
        updateCheckId = setInterval(checkForUpdates, 5 * 60_000);
        void poll();
      }).catch(() => {
        if (active) setMessage('تعذر تهيئة خدمة الإشعارات على هذا الجهاز.');
      });
    }
    return () => {
      active = false;
      if (notificationPollId) clearInterval(notificationPollId);
      if (updateCheckId) clearInterval(updateCheckId);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', checkForUpdates);
      window.removeEventListener('online', checkForUpdates);
      if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const enablePush = async () => {
    if (!supported) { setMessage('الإشعارات غير مدعومة في هذا المتصفح. على iPhone ثبّت الموقع على الشاشة الرئيسية أولاً.'); return; }
    setBusy(true); setMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setMessage('لم يتم السماح بالإشعارات. يمكنك تفعيلها من إعدادات المتصفح.'); return; }
      const registration = await navigator.serviceWorker.ready;
      const response = await fetch('/api/push/public-key', { cache: 'no-store' });
      const config = await response.json() as SubscribeResponse;
      if (!response.ok || !config.key) throw new Error(config.error || 'مفتاح الإشعارات غير مضبوط على الخادم.');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(config.key) as unknown as BufferSource
      });
      const saved = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON())
      });
      const result = await saved.json().catch(() => ({}));
      if (!saved.ok) throw new Error(result.error || 'تعذر حفظ هذا الجهاز.');
      setPushEnabled(true);
      setMessage('تم تفعيل إشعارات هذا الجهاز بنجاح.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تفعيل الإشعارات.');
    } finally { setBusy(false); }
  };

  const install = async () => {
    if (!installPrompt) {
      setMessage('من قائمة المتصفح اختر «إضافة إلى الشاشة الرئيسية» لتثبيت الموقع.');
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const showPwaActions = shouldShowPwaActions(pathname ?? '');

  return <>
    {updateReady && <div role="status" aria-live="polite" className="fixed inset-x-3 bottom-4 z-[10000] mx-auto flex w-[calc(100%-1.5rem)] max-w-lg items-center justify-between gap-3 rounded-2xl border border-gold-300 bg-white p-3 shadow-2xl" dir="rtl">
      <div className="flex min-w-0 items-center gap-2">
        <RefreshCw size={18} className="shrink-0 text-gold-700"/>
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-navy-950">تحديث جديد جاهز</p>
          <p className="text-[11px] leading-5 text-navy-600">تم تنزيل نسخة أحدث من التطبيق. حدّث الآن لتشغيلها.</p>
        </div>
      </div>
      <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-xl bg-navy-950 px-3 py-2 text-[11px] font-bold text-white">تحديث الآن</button>
    </div>}
    {showPwaActions && <div className="fixed bottom-4 start-4 z-[80] flex max-w-[min(92vw,360px)] flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {!installed && <button onClick={() => void install()} className="inline-flex items-center gap-2 rounded-full border border-[#D8D0C1] bg-[#101C2C] px-3 py-2 text-[11px] font-bold text-white shadow-lg"><Download size={14}/> تثبيت التطبيق</button>}
        {supported && !pushEnabled && <button onClick={() => void enablePush()} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-[#8A6A3A] bg-[#8A6A3A] px-3 py-2 text-[11px] font-bold text-white shadow-lg disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin"/> : <BellRing size={14}/>} تفعيل التذكيرات</button>}
        {pushEnabled && <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-800 shadow"><Smartphone size={14}/> إشعارات هذا الجهاز مفعّلة</span>}
      </div>
      {message && <p role="status" className="rounded-xl border border-[#E7E0D4] bg-white px-3 py-2 text-[11px] leading-5 text-[#243247] shadow-lg">{message}</p>}
    </div>}
  </>;
}
