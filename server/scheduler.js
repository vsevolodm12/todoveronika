import { sendTelegramMessage } from './telegram.js'

export function startReminderScheduler({ db, botToken, chatId, allowedUsers }) {
  if (!botToken) {
    console.log('[scheduler] Telegram not configured; reminders will not be sent.')
    return () => {}
  }

  if (!allowedUsers || allowedUsers.length === 0) {
    console.log('[scheduler] No allowed users configured; reminders will not be sent.')
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
      let allSent = true
      
      // Отправляем напоминание ВСЕМ разрешенным пользователям
      for (const userId of allowedUsers) {
        try {
          await sendTelegramMessage({
            botToken,
            chatId: userId,
            text: `🔔 Напоминание\n\n${r.text}`,
          })
          console.log(`[scheduler] sent reminder ${r.reminder_id} to user ${userId}`)
        } catch (e) {
          console.error('[scheduler] failed to send reminder', r.reminder_id, 'to user', userId, e?.message || e)
          allSent = false
        }
      }
      
      // Помечаем как отправленное только если отправлено всем
      if (allSent) {
        markSentStmt.run(Date.now(), r.user_id, r.reminder_id)
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
