// API client for backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// User ID - for Telegram Mini App, get from WebApp.initDataUnsafe.user.id
// For now, hardcoded or from localStorage
function getUserId(): string {
  // Try Telegram WebApp first
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    return String((window as any).Telegram.WebApp.initDataUnsafe.user.id)
  }
  // Fallback to localStorage or default
  return localStorage.getItem('userId') || '7836566387'
}

export function setUserId(id: string) {
  localStorage.setItem('userId', id)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getUserId(),
      ...options.headers,
    },
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `HTTP ${resp.status}`)
  }

  return resp.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// Days / Blocks / Tasks
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskData {
  id: string
  text: string
  completed: boolean
  createdAt: string
}

export interface BlockData {
  id: string
  name: string
  tasks: TaskData[]
}

export interface DayData {
  date: string
  blocks: BlockData[]
}

export async function getDayData(date: string): Promise<DayData> {
  return request(`/api/days/${date}`)
}

export async function getAllDays(): Promise<Record<string, DayData>> {
  const resp = await request<{ days: Record<string, DayData> }>(`/api/days`)
  return resp.days
}

export async function addBlock(date: string, id: string, name: string): Promise<void> {
  await request(`/api/days/${date}/blocks`, {
    method: 'POST',
    body: JSON.stringify({ id, name }),
  })
}

export async function updateBlockName(date: string, blockId: string, name: string): Promise<void> {
  await request(`/api/days/${date}/blocks/${blockId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export async function deleteBlock(date: string, blockId: string): Promise<void> {
  await request(`/api/days/${date}/blocks/${blockId}`, {
    method: 'DELETE',
  })
}

export async function addTask(date: string, blockId: string, id: string, text: string, createdAt: string): Promise<void> {
  await request(`/api/days/${date}/blocks/${blockId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({ id, text, createdAt }),
  })
}

export async function updateTask(date: string, taskId: string, updates: { text?: string; completed?: boolean }): Promise<void> {
  await request(`/api/days/${date}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function deleteTask(date: string, taskId: string): Promise<void> {
  await request(`/api/days/${date}/tasks/${taskId}`, {
    method: 'DELETE',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Reminders
// ─────────────────────────────────────────────────────────────────────────────

export interface ReminderData {
  id: string
  text: string
  scheduledAt: number // ms timestamp
  sent: boolean
  createdAt: number
  sentAt?: number
}

export async function getReminders(): Promise<ReminderData[]> {
  const resp = await request<{ reminders: ReminderData[] }>(`/api/reminders`)
  return resp.reminders
}

export async function addReminder(id: string, text: string, scheduledAt: number): Promise<void> {
  await request(`/api/reminders`, {
    method: 'POST',
    body: JSON.stringify({ id, text, scheduledAt }),
  })
}

export async function deleteReminder(id: string): Promise<void> {
  await request(`/api/reminders/${id}`, {
    method: 'DELETE',
  })
}

