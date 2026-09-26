export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_GROUP_CHAT_ID?.trim());
}

export function escapeTelegramHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export async function sendTelegramGroupNotification(message: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID?.trim();
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("Telegram send failed: configuration missing", {
      hasBotToken: Boolean(BOT_TOKEN),
      hasChatId: Boolean(CHAT_ID),
    });
    throw new Error("Telegram configuration is missing");
  }
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
      console.error("Telegram send failed:", {
        status: response.status,
        statusText: response.statusText,
        data,
      });
      throw new Error(data.description || `Telegram send failed (${response.status})`);
    }
    return data;
  } catch (error) {
    console.error("Telegram send failed: request error", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally { clearTimeout(timeout); }
}