import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') })
import express from 'express'
import cors from 'cors'
import { openDb } from './db.js'
import { startReminderScheduler } from './scheduler.js'

const PORT = process.env.PORT || 3001
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID
const ALLOWED_USERS = (process.env.ALLOWED_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)

const app = express()
app.use(cors())
app.use(express.json())

const db = openDb()

// Simple auth middleware - check user_id header
function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id']
  if (!userId) {
    return res.status(401).json({ error: 'Missing x-user-id header' })
  }
  if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(userId)) {
    return res.status(403).json({ error: 'User not allowed' })
  }
  req.userId = userId
  next()
}

app.use('/api', authMiddleware)

// ─────────────────────────────────────────────────────────────────────────────
// DAYS / BLOCKS / TASKS API
// ─────────────────────────────────────────────────────────────────────────────

// Get day data (blocks + tasks)
app.get('/api/days/:date', (req, res) => {
  const { date } = req.params
  const { userId } = req

  const blocks = db.prepare(
    `SELECT block_id, name, position FROM day_blocks WHERE user_id = ? AND date = ? ORDER BY position`
  ).all(userId, date)

  const tasks = db.prepare(
    `SELECT task_id, block_id, text, completed, created_at, position FROM day_tasks WHERE user_id = ? AND date = ? ORDER BY position`
  ).all(userId, date)

  // Group tasks by block
  const tasksByBlock = {}
  for (const t of tasks) {
    if (!tasksByBlock[t.block_id]) tasksByBlock[t.block_id] = []
    tasksByBlock[t.block_id].push({
      id: t.task_id,
      text: t.text,
      completed: Boolean(t.completed),
      createdAt: t.created_at,
    })
  }

  const result = {
    date,
    blocks: blocks.map(b => ({
      id: b.block_id,
      name: b.name,
      tasks: tasksByBlock[b.block_id] || [],
    })),
  }

  res.json(result)
})

// Get multiple days (for stats/history)
app.get('/api/days', (req, res) => {
  const { userId } = req
  const { from, to } = req.query // YYYY-MM-DD

  let sql = `SELECT DISTINCT date FROM day_blocks WHERE user_id = ?`
  const params = [userId]
  if (from) { sql += ` AND date >= ?`; params.push(from) }
  if (to) { sql += ` AND date <= ?`; params.push(to) }
  sql += ` ORDER BY date DESC`

  const dates = db.prepare(sql).all(...params).map(r => r.date)

  // For each date, get full data
  const days = {}
  for (const date of dates) {
    const blocks = db.prepare(
      `SELECT block_id, name, position FROM day_blocks WHERE user_id = ? AND date = ? ORDER BY position`
    ).all(userId, date)

    const tasks = db.prepare(
      `SELECT task_id, block_id, text, completed, created_at, position FROM day_tasks WHERE user_id = ? AND date = ? ORDER BY position`
    ).all(userId, date)

    const tasksByBlock = {}
    for (const t of tasks) {
      if (!tasksByBlock[t.block_id]) tasksByBlock[t.block_id] = []
      tasksByBlock[t.block_id].push({
        id: t.task_id,
        text: t.text,
        completed: Boolean(t.completed),
        createdAt: t.created_at,
      })
    }

    days[date] = {
      date,
      blocks: blocks.map(b => ({
        id: b.block_id,
        name: b.name,
        tasks: tasksByBlock[b.block_id] || [],
      })),
    }
  }

  res.json({ days })
})

// Add block
app.post('/api/days/:date/blocks', (req, res) => {
  const { date } = req.params
  const { userId } = req
  const { id, name } = req.body

  const maxPos = db.prepare(
    `SELECT COALESCE(MAX(position), -1) as m FROM day_blocks WHERE user_id = ? AND date = ?`
  ).get(userId, date)

  db.prepare(
    `INSERT INTO day_blocks (user_id, date, block_id, name, position) VALUES (?, ?, ?, ?, ?)`
  ).run(userId, date, id, name, (maxPos?.m ?? -1) + 1)

  res.json({ ok: true })
})

// Update block name
app.patch('/api/days/:date/blocks/:blockId', (req, res) => {
  const { date, blockId } = req.params
  const { userId } = req
  const { name } = req.body

  db.prepare(
    `UPDATE day_blocks SET name = ? WHERE user_id = ? AND date = ? AND block_id = ?`
  ).run(name, userId, date, blockId)

  res.json({ ok: true })
})

// Delete block (and its tasks)
app.delete('/api/days/:date/blocks/:blockId', (req, res) => {
  const { date, blockId } = req.params
  const { userId } = req

  db.prepare(`DELETE FROM day_tasks WHERE user_id = ? AND date = ? AND block_id = ?`).run(userId, date, blockId)
  db.prepare(`DELETE FROM day_blocks WHERE user_id = ? AND date = ? AND block_id = ?`).run(userId, date, blockId)

  res.json({ ok: true })
})

// Add task
app.post('/api/days/:date/blocks/:blockId/tasks', (req, res) => {
  const { date, blockId } = req.params
  const { userId } = req
  const { id, text, createdAt } = req.body

  const maxPos = db.prepare(
    `SELECT COALESCE(MAX(position), -1) as m FROM day_tasks WHERE user_id = ? AND date = ? AND block_id = ?`
  ).get(userId, date, blockId)

  db.prepare(
    `INSERT INTO day_tasks (user_id, date, block_id, task_id, text, completed, created_at, position) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
  ).run(userId, date, blockId, id, text, createdAt, (maxPos?.m ?? -1) + 1)

  res.json({ ok: true })
})

// Update task
app.patch('/api/days/:date/tasks/:taskId', (req, res) => {
  const { date, taskId } = req.params
  const { userId } = req
  const { text, completed } = req.body

  if (text !== undefined) {
    db.prepare(`UPDATE day_tasks SET text = ? WHERE user_id = ? AND date = ? AND task_id = ?`).run(text, userId, date, taskId)
  }
  if (completed !== undefined) {
    db.prepare(`UPDATE day_tasks SET completed = ? WHERE user_id = ? AND date = ? AND task_id = ?`).run(completed ? 1 : 0, userId, date, taskId)
  }

  res.json({ ok: true })
})

// Delete task
app.delete('/api/days/:date/tasks/:taskId', (req, res) => {
  const { date, taskId } = req.params
  const { userId } = req

  db.prepare(`DELETE FROM day_tasks WHERE user_id = ? AND date = ? AND task_id = ?`).run(userId, date, taskId)

  res.json({ ok: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// REMINDERS API
// ─────────────────────────────────────────────────────────────────────────────

// Get reminders
app.get('/api/reminders', (req, res) => {
  const { userId } = req

  const rows = db.prepare(
    `SELECT reminder_id, text, scheduled_at_ms, sent, created_at_ms, sent_at_ms FROM reminders WHERE user_id = ? ORDER BY scheduled_at_ms ASC`
  ).all(userId)

  res.json({
    reminders: rows.map(r => ({
      id: r.reminder_id,
      text: r.text,
      scheduledAt: r.scheduled_at_ms,
      sent: Boolean(r.sent),
      createdAt: r.created_at_ms,
      sentAt: r.sent_at_ms,
    })),
  })
})

// Add reminder
app.post('/api/reminders', (req, res) => {
  const { userId } = req
  const { id, text, scheduledAt } = req.body // scheduledAt is ms timestamp

  db.prepare(
    `INSERT INTO reminders (user_id, reminder_id, text, scheduled_at_ms, sent, created_at_ms) VALUES (?, ?, ?, ?, 0, ?)`
  ).run(userId, id, text, scheduledAt, Date.now())

  res.json({ ok: true })
})

// Delete reminder
app.delete('/api/reminders/:id', (req, res) => {
  const { id } = req.params
  const { userId } = req

  db.prepare(`DELETE FROM reminders WHERE user_id = ? AND reminder_id = ?`).run(userId, id)

  res.json({ ok: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────

startReminderScheduler({ db, botToken: BOT_TOKEN, chatId: CHAT_ID })

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
  console.log(`[server] allowed users: ${ALLOWED_USERS.length ? ALLOWED_USERS.join(', ') : '(any)'}`)
})

