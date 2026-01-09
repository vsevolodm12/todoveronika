import { create } from 'zustand'
import { format, subDays } from 'date-fns'
import * as api from '../utils/api'
import type { TabType } from '../types'

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function getTodayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

interface DayData {
  date: string
  blocks: {
    id: string
    name: string
    tasks: {
      id: string
      text: string
      completed: boolean
      createdAt: string
    }[]
  }[]
  hasMedal: boolean
}

interface Reminder {
  id: string
  text: string
  scheduledAt: number
  sent: boolean
}

interface AppState {
  // Loading state
  loading: boolean
  error: string | null

  // Navigation
  activeTab: TabType
  setActiveTab: (tab: TabType) => void

  // Days data
  days: Record<string, DayData>

  // Init - load from server
  init: () => Promise<void>
  
  // Today's operations
  addBlock: (name: string) => Promise<void>
  updateBlockName: (blockId: string, name: string) => Promise<void>
  deleteBlock: (blockId: string) => Promise<void>
  addTask: (blockId: string, text: string) => Promise<void>
  updateTask: (blockId: string, taskId: string, text: string) => Promise<void>
  deleteTask: (blockId: string, taskId: string) => Promise<void>
  toggleTask: (blockId: string, taskId: string) => Promise<void>
  
  // History
  selectedDate: string
  setSelectedDate: (date: string) => void
  getDayData: (date: string) => DayData | null
  
  // Reminders
  reminders: Reminder[]
  loadReminders: () => Promise<void>
  addReminder: (text: string, date: string, time: string) => Promise<void>
  deleteReminder: (id: string) => Promise<void>
  
  // Stats
  getStats: (period: 'day' | 'week' | 'month') => {
    completed: number
    total: number
    medals: string[]
    streak: number
  }
  
  // Check medals
  checkPastDaysMedals: () => void
}

// Helper to compute hasMedal for a day
function computeHasMedal(dayData: DayData, today: string): boolean {
  if (dayData.date >= today) return false // No medal for today or future
  const allTasks = dayData.blocks.flatMap(b => b.tasks)
  return allTasks.length > 0 && allTasks.every(t => t.completed)
}

export const useStore = create<AppState>()((set, get) => ({
  loading: true,
  error: null,

  activeTab: 'today',
  setActiveTab: (tab) => set({ activeTab: tab }),

  days: {},
  selectedDate: getTodayKey(),
  setSelectedDate: (date) => set({ selectedDate: date }),

  getDayData: (date) => {
    const { days } = get()
    return days[date] || null
  },

  // Initialize - load all days from server
  init: async () => {
    try {
      set({ loading: true, error: null })
      const serverDays = await api.getAllDays()
      const today = getTodayKey()
      
      // Convert server format to our format with hasMedal
      const days: Record<string, DayData> = {}
      for (const [date, data] of Object.entries(serverDays)) {
        days[date] = {
          ...data,
          hasMedal: computeHasMedal(data as DayData, today),
        }
      }
      
      set({ days, loading: false })
    } catch (e) {
      console.error('Failed to load data:', e)
      set({ error: (e as Error).message, loading: false })
    }
  },

  addBlock: async (name) => {
    const today = getTodayKey()
    const id = generateId()
    
    try {
      await api.addBlock(today, id, name)
      
      set((state) => {
        const dayData = state.days[today] || { date: today, blocks: [], hasMedal: false }
        return {
          days: {
            ...state.days,
            [today]: {
              ...dayData,
              blocks: [...dayData.blocks, { id, name, tasks: [] }],
            },
          },
        }
      })
    } catch (e) {
      console.error('Failed to add block:', e)
    }
  },

  updateBlockName: async (blockId, name) => {
    const today = getTodayKey()
    
    try {
      await api.updateBlockName(today, blockId, name)
      
      set((state) => {
        const dayData = state.days[today]
        if (!dayData) return state
        return {
          days: {
            ...state.days,
            [today]: {
              ...dayData,
              blocks: dayData.blocks.map((b) =>
                b.id === blockId ? { ...b, name } : b
              ),
            },
          },
        }
      })
    } catch (e) {
      console.error('Failed to update block:', e)
    }
  },

  deleteBlock: async (blockId) => {
    const today = getTodayKey()
    
    try {
      await api.deleteBlock(today, blockId)
      
      set((state) => {
        const dayData = state.days[today]
        if (!dayData) return state
        return {
          days: {
            ...state.days,
            [today]: {
              ...dayData,
              blocks: dayData.blocks.filter((b) => b.id !== blockId),
            },
          },
        }
      })
    } catch (e) {
      console.error('Failed to delete block:', e)
    }
  },

  addTask: async (blockId, text) => {
    const today = getTodayKey()
    const id = generateId()
    const createdAt = new Date().toISOString()
    
    try {
      await api.addTask(today, blockId, id, text, createdAt)
      
      set((state) => {
        const dayData = state.days[today]
        if (!dayData) return state
        return {
          days: {
            ...state.days,
            [today]: {
              ...dayData,
              blocks: dayData.blocks.map((b) =>
                b.id === blockId
                  ? {
                      ...b,
                      tasks: [...b.tasks, { id, text, completed: false, createdAt }],
                    }
                  : b
              ),
            },
          },
        }
      })
    } catch (e) {
      console.error('Failed to add task:', e)
    }
  },

  updateTask: async (blockId, taskId, text) => {
    const today = getTodayKey()
    
    try {
      await api.updateTask(today, taskId, { text })
      
      set((state) => {
        const dayData = state.days[today]
        if (!dayData) return state
        return {
          days: {
            ...state.days,
            [today]: {
              ...dayData,
              blocks: dayData.blocks.map((b) =>
                b.id === blockId
                  ? {
                      ...b,
                      tasks: b.tasks.map((t) =>
                        t.id === taskId ? { ...t, text } : t
                      ),
                    }
                  : b
              ),
            },
          },
        }
      })
    } catch (e) {
      console.error('Failed to update task:', e)
    }
  },

  deleteTask: async (blockId, taskId) => {
    const today = getTodayKey()
    
    try {
      await api.deleteTask(today, taskId)
      
      set((state) => {
        const dayData = state.days[today]
        if (!dayData) return state
        return {
          days: {
            ...state.days,
            [today]: {
              ...dayData,
              blocks: dayData.blocks.map((b) =>
                b.id === blockId
                  ? { ...b, tasks: b.tasks.filter((t) => t.id !== taskId) }
                  : b
              ),
            },
          },
        }
      })
    } catch (e) {
      console.error('Failed to delete task:', e)
    }
  },

  toggleTask: async (blockId, taskId) => {
    const today = getTodayKey()
    const state = get()
    const dayData = state.days[today]
    if (!dayData) return
    
    const block = dayData.blocks.find(b => b.id === blockId)
    const task = block?.tasks.find(t => t.id === taskId)
    if (!task) return
    
    const newCompleted = !task.completed
    
    try {
      await api.updateTask(today, taskId, { completed: newCompleted })
      
      set((state) => {
        const dayData = state.days[today]
        if (!dayData) return state
        
        const newDayData = {
          ...dayData,
          blocks: dayData.blocks.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  tasks: b.tasks.map((t) =>
                    t.id === taskId ? { ...t, completed: newCompleted } : t
                  ),
                }
              : b
          ),
          hasMedal: false, // Medal is NOT awarded for today
        }
        
        return {
          days: {
            ...state.days,
            [today]: newDayData,
          },
        }
      })
    } catch (e) {
      console.error('Failed to toggle task:', e)
    }
  },

  reminders: [],

  loadReminders: async () => {
    try {
      const serverReminders = await api.getReminders()
      set({
        reminders: serverReminders.map(r => ({
          id: r.id,
          text: r.text,
          scheduledAt: r.scheduledAt,
          sent: r.sent,
        })),
      })
    } catch (e) {
      console.error('Failed to load reminders:', e)
    }
  },

  addReminder: async (text, date, time) => {
    const id = generateId()
    // Convert date + time to timestamp
    const [hours, minutes] = time.split(':').map(Number)
    const scheduledDate = new Date(date)
    scheduledDate.setHours(hours, minutes, 0, 0)
    const scheduledAt = scheduledDate.getTime()
    
    try {
      await api.addReminder(id, text, scheduledAt)
      
      set((state) => ({
        reminders: [...state.reminders, { id, text, scheduledAt, sent: false }],
      }))
    } catch (e) {
      console.error('Failed to add reminder:', e)
    }
  },

  deleteReminder: async (id) => {
    try {
      await api.deleteReminder(id)
      
      set((state) => ({
        reminders: state.reminders.filter((r) => r.id !== id),
      }))
    } catch (e) {
      console.error('Failed to delete reminder:', e)
    }
  },

  checkPastDaysMedals: () => {
    const today = getTodayKey()
    set((state) => {
      const updatedDays = { ...state.days }
      
      Object.keys(updatedDays).forEach((dateKey) => {
        if (dateKey < today) {
          const dayData = updatedDays[dateKey]
          const allTasks = dayData.blocks.flatMap((b) => b.tasks)
          const allCompleted = allTasks.length > 0 && allTasks.every((t) => t.completed)
          updatedDays[dateKey] = { ...dayData, hasMedal: allCompleted }
        }
      })
      
      return { days: updatedDays }
    })
  },

  getStats: (period) => {
    const { days } = get()
    const today = getTodayKey()
    const now = new Date()
    let daysToCheck: string[] = []
    
    if (period === 'day') {
      daysToCheck = [today]
    } else if (period === 'week') {
      for (let i = 0; i < 7; i++) {
        const date = subDays(now, i)
        daysToCheck.push(format(date, 'yyyy-MM-dd'))
      }
    } else {
      for (let i = 0; i < 30; i++) {
        const date = subDays(now, i)
        daysToCheck.push(format(date, 'yyyy-MM-dd'))
      }
    }
    
    let completed = 0
    let total = 0
    const medals: string[] = []
    
    daysToCheck.forEach((dateKey) => {
      const dayData = days[dateKey]
      if (dayData) {
        const tasks = dayData.blocks.flatMap((b) => b.tasks)
        total += tasks.length
        completed += tasks.filter((t) => t.completed).length
        if (dayData.hasMedal && dateKey < today) {
          medals.push(dateKey)
        }
      }
    })
    
    // Calculate streak
    let streak = 0
    let checkDate = subDays(new Date(), 1)
    
    while (true) {
      const dateKey = format(checkDate, 'yyyy-MM-dd')
      const dayData = days[dateKey]
      
      if (dayData?.hasMedal) {
        streak++
        checkDate = subDays(checkDate, 1)
      } else if (dayData && dayData.blocks.flatMap((b) => b.tasks).length > 0) {
        break
      } else {
        break
      }
    }
    
    return { completed, total, medals, streak }
  },
}))
