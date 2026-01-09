import { sendTelegramMessage } from './telegram.js'

export function startReminderScheduler({ db, botToken, chatId }) {
  if (!botToken || !chatId) {
    console.log('[scheduler] Telegram not configured; reminders will not be sent.')
    return () => {}
  }

  const dueStmt = db.prepare(
    `SELECT user_id, reminder_id, text, scheduled_at_ms
     FROM reminders
     WHERE sent = 0 AND scheduled_at_ms <= ?
     ORDER BY scheduled_at_ms ASC
     LIMIT 50`
  )

  const markSentStmt = db.prepare(
    `UPDATE reminders SET sent = 1, sent_at_ms = ? WHERE user_id = ? AND reminder_id = ?`
  )

  const tick = async () => {
    const now = Date.now()
    const due = dueStmt.all(now)
    if (!due.length) return

    for (const r of due) {
      try {
        // NOTE: we keep it simple: all reminders go to one chat id (your case).
        await sendTelegramMessage({
          botToken,
          chatId,
          text: `🔔 Напоминание\n\n${r.text}`,
        })
        markSentStmt.run(Date.now(), r.user_id, r.reminder_id)
      } catch (e) {
        console.error('[scheduler] failed to send reminder', r.reminder_id, e?.message || e)
      }
    }
  }

  // fast enough for demo; can be 10s
  const intervalId = setInterval(() => {
    tick().catch((e) => console.error('[scheduler] tick error', e))
  }, 10000)

  // immediate tick on start
  tick().catch((e) => console.error('[scheduler] tick error', e))

  return () => clearInterval(intervalId)
}


