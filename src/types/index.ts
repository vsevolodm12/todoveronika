export interface Task {
  id: string
  text: string
  completed: boolean
  createdAt: string
}

export interface Block {
  id: string
  name: string
  tasks: Task[]
}

export interface DayData {
  date: string // формат YYYY-MM-DD
  blocks: Block[]
  hasMedal: boolean
}

export interface Reminder {
  id: string
  text: string
  date: string // формат YYYY-MM-DD
  time: string // формат HH:mm
  telegramUserId?: string
  sent: boolean
}

export type TabType = 'history' | 'today' | 'stats'

export interface StatsData {
  completedTasks: number
  totalTasks: number
  medals: number
  currentStreak: number
  longestStreak: number
}

