export async function sendTelegramGroupNotification(message: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID?.trim();
  if (!BOT_TOKEN || !CHAT_ID) throw new Error("Telegram configuration is missing");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "HTML", disable_web_page_preview: true }),
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      console.error("Telegram send failed:", { status: response.status, data });
      throw new Error(data.description || `Telegram send failed (${response.status})`);
    }
    return data;
  } finally { clearTimeout(timeout); }
}