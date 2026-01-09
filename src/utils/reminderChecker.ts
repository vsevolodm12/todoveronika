// Reminder checker utility - checks and sends due reminders

import { format } from 'date-fns'
import { sendTelegramMessage } from './telegram'
import type { Reminder } from '../types'

export function checkAndSendReminders(
  reminders: Reminder[],
  markAsSent: (id: string) => void
): void {
  const now = new Date()
  const currentDate = format(now, 'yyyy-MM-dd')
  const currentTime = format(now, 'HH:mm')

  reminders.forEach(async (reminder) => {
    if (reminder.sent) return

    // Check if reminder is due
    if (reminder.date === currentDate && reminder.time <= currentTime) {
      const success = await sendTelegramMessage(reminder.text)
      
      if (success) {
        markAsSent(reminder.id)
        console.log(`Reminder sent: ${reminder.text}`)
      }
    }
  })
}

// Start periodic check (every minute)
export function startReminderChecker(
  getReminders: () => Reminder[],
  markAsSent: (id: string) => void
): () => void {
  const intervalId = setInterval(() => {
    checkAndSendReminders(getReminders(), markAsSent)
  }, 60000) // Check every minute

  // Also check immediately on start
  checkAndSendReminders(getReminders(), markAsSent)

  // Return cleanup function
  return () => clearInterval(intervalId)
}

