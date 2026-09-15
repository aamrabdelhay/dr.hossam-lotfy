import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api';

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';

export async function POST() {
  try {
    await requireAdmin();
    const key = process.env.NVIDIA_API_KEY;
    if (!key) {
      return NextResponse.json({ ok: false, error: 'NVIDIA_API_KEY غير مضبوط في Vercel Environment Variables.' }, { status: 503 });
    }

    const response = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [{ role: 'user', content: 'Reply with exactly: NVIDIA connection OK' }],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 64,
        stream: false,
        extra_body: { chat_template_kwargs: { enable_thinking: true } },
      }),
      cache: 'no-store',
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json({ ok: false, error: `NVIDIA API returned HTTP ${response.status}`, details: typeof payload?.error?.message === 'string' ? payload.error.message : undefined }, { status: 502 });
    }

    const content = payload?.choices?.[0]?.message?.content;
    return NextResponse.json({ ok: true, model: NVIDIA_MODEL, response: typeof content === 'string' ? content : 'Connection succeeded.' });
  } catch (error) {
    console.error('[assistant-test]', error);
    return NextResponse.json({ ok: false, error: 'تعذر اختبار اتصال NVIDIA.' }, { status: 500 });
  }
}
