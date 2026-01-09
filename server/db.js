import Database from 'better-sqlite3'

const DB_PATH = process.env.SQLITE_PATH || './todo-veronika.db'

export function openDb() {
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS day_blocks (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      block_id TEXT NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (user_id, date, block_id)
    );

    CREATE TABLE IF NOT EXISTS day_tasks (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      block_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (user_id, date, task_id)
    );

    CREATE INDEX IF NOT EXISTS idx_day_tasks_user_date ON day_tasks(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_day_tasks_user_date_block ON day_tasks(user_id, date, block_id);

    CREATE TABLE IF NOT EXISTS reminders (
      user_id TEXT NOT NULL,
      reminder_id TEXT NOT NULL,
      text TEXT NOT NULL,
      scheduled_at_ms INTEGER NOT NULL,
      sent INTEGER NOT NULL DEFAULT 0,
      created_at_ms INTEGER NOT NULL,
      sent_at_ms INTEGER,
      PRIMARY KEY (user_id, reminder_id)
    );

    CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(sent, scheduled_at_ms);
  `)

  return db
}


