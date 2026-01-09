export async function sendTelegramMessage({ botToken, chatId, text }) {
  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  })

  const data = await resp.json()
  if (!data?.ok) {
    const err = new Error(data?.description || 'Telegram API error')
    err.telegram = data
    throw err
  }
}


