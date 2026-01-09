// Telegram Bot API utility for sending reminders

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID

export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('Telegram credentials not configured. Set VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID in .env')
    return false
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: `🔔 Напоминание:\n\n${text}`,
          parse_mode: 'HTML',
        }),
      }
    )

    const data = await response.json()
    
    if (!data.ok) {
      console.error('Telegram API error:', data.description)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to send Telegram message:', error)
    return false
  }
}

// Check if Telegram is configured
export function isTelegramConfigured(): boolean {
  return Boolean(BOT_TOKEN && CHAT_ID)
}

