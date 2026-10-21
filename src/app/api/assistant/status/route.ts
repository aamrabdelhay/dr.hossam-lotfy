import { NextResponse } from 'next/server';
import { user } from '@/lib/api';
import { assistantChatUrl, getAssistantSettings } from '@/lib/assistant-settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const session = await user();
  if (!session) return NextResponse.json({ ok: false, error: 'يجب تسجيل الدخول' }, { status: 401 });

  try {
    const settings = await getAssistantSettings();
    if (!settings.apiKey) {
      return NextResponse.json({ ok: false, error: 'مفتاح API غير مضبوط أو تعذر فك تشفيره. راجع إعدادات النظام.' }, { status: 503 });
    }

    const response = await fetch(assistantChatUrl(settings.baseUrl), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + settings.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.model,
        messages: [{ role: 'user', content: 'Reply with exactly: AI_OK' }],
        temperature: 0,
        max_tokens: 16,
        stream: false,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const details = typeof data?.error?.message === 'string' ? data.error.message.slice(0, 240) : undefined;
      return NextResponse.json({
        ok: false,
        error: 'فشل اتصال API (HTTP ' + response.status + ').',
        details,
      }, { status: 502 });
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
      return NextResponse.json({ ok: false, error: 'وصل رد من API لكن محتواه غير متوقع.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, model: settings.model });
  } catch (error) {
    console.error('[assistant-status]', error);
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return NextResponse.json({
      ok: false,
      error: timedOut ? 'انتهت مهلة اختبار اتصال API بعد 15 ثانية.' : 'تعذر الوصول إلى API. راجع عنوان الخدمة وإعداداتها.',
    }, { status: 502 });
  }
}
