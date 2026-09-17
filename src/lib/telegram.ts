export async function sendTelegramGroupNotification(message: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error("Telegram configuration is missing");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    console.error("Telegram send failed:", data);
    throw new Error(data.description || "Telegram send failed");
  }

  return data;
}
