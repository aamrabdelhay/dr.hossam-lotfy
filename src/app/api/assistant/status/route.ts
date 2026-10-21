import { NextResponse } from 'next/server';
import { user } from '@/lib/api';
import { assistantChatUrl, fetchAssistantChat, getAssistantSettings } from '@/lib/assistant-settings';

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

    const { response, model, usedFallbackModel } = await fetchAssistantChat(settings, {
      messages: [{ role: 'user', content: 'Reply with exactly: AI_OK' }],
      temperature: 0,
      max_tokens: 16,
      stream: false,
    }, AbortSignal.timeout(15000));

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const details = typeof data?.error?.message === 'string'
        ? data.error.message.slice(0, 240)
        : typeof data?.message === 'string'
          ? data.message.slice(0, 240)
          : undefined;
      const endpoint = new URL(assistantChatUrl(settings.baseUrl));
      return NextResponse.json({
        ok: false,
        error: 'فشل اتصال API (HTTP ' + response.status + ').',
        details: details || 'الخدمة لم تُرجع تفاصيل قابلة للقراءة. راجع عنوان API والموديل في إعدادات النظام.',
        endpoint: endpoint.origin + endpoint.pathname,
        model,
      }, { status: 502 });
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
      return NextResponse.json({ ok: false, error: 'وصل رد من API لكن محتواه غير متوقع.' }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      model,
      usedFallbackModel,
      note: usedFallbackModel ? 'تم الاتصال باستخدام الموديل البديل gemini-3.8-flash بعد فشل الموديل المحفوظ.' : undefined,
    });
  } catch (error) {
    console.error('[assistant-status]', error);
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return NextResponse.json({
      ok: false,
      error: timedOut ? 'انتهت مهلة اختبار اتصال API بعد 15 ثانية.' : 'تعذر الوصول إلى API. راجع عنوان الخدمة وإعداداتها.',
      details: error instanceof Error ? error.message.slice(0, 240) : undefined,
    }, { status: 502 });
  }
}
