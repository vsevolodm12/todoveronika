import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { format, subDays } from 'date-fns'
import type { DayData, Reminder, TabType } from '../types'

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function getTodayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

interface AppState {
  // Navigation
  activeTab: TabType
  setActiveTab: (tab: TabType) => void

  // Days data
  days: Record<string, DayData>
  
  // Today's operations
  addBlock: (name: string) => void
  updateBlockName: (blockId: string, name: string) => void
  deleteBlock: (blockId: string) => void
  addTask: (blockId: string, text: string) => void
  updateTask: (blockId: string, taskId: string, text: string) => void
  deleteTask: (blockId: string, taskId: string) => void
  toggleTask: (blockId: string, taskId: string) => void
  
  // History
  selectedDate: string
  setSelectedDate: (date: string) => void
  getDayData: (date: string) => DayData | null
  
  // Reminders
  reminders: Reminder[]
  addReminder: (text: string, date: string, time: string) => void
  deleteReminder: (id: string) => void
  markReminderSent: (id: string) => void
  
  // Stats
  getStats: (period: 'day' | 'week' | 'month') => {
    completed: number
    total: number
    medals: string[]
    streak: number
  }
  
  // Check and award medal for past days
  checkPastDaysMedals: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'today',
      setActiveTab: (tab) => set({ activeTab: tab }),

      days: {},
      selectedDate: getTodayKey(),
      setSelectedDate: (date) => set({ selectedDate: date }),

      getDayData: (date) => {
        const { days } = get()
        return days[date] || null
      },

      addBlock: (name) => {
        const today = getTodayKey()
        set((state) => {
          const dayData = state.days[today] || { date: today, blocks: [], hasMedal: false }
          return {
            days: {
              ...state.days,
              [today]: {
                ...dayData,
                blocks: [...dayData.blocks, { id: generateId(), name, tasks: [] }]
              }
            }
          }
        })
      },

      updateBlockName: (blockId, name) => {
        const today = getTodayKey()
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
                )
              }
            }
          }
        })
      },

      deleteBlock: (blockId) => {
        const today = getTodayKey()
        set((state) => {
          const dayData = state.days[today]
          if (!dayData) return state
          return {
            days: {
              ...state.days,
              [today]: {
                ...dayData,
                blocks: dayData.blocks.filter((b) => b.id !== blockId)
              }
            }
          }
        })
      },

      addTask: (blockId, text) => {
        const today = getTodayKey()
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
                        tasks: [
                          ...b.tasks,
                          {
                            id: generateId(),
                            text,
                            completed: false,
                            createdAt: new Date().toISOString()
                          }
                        ]
                      }
                    : b
                )
              }
            }
          }
        })
      },

      updateTask: (blockId, taskId, text) => {
        const today = getTodayKey()
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
                        )
                      }
                    : b
                )
              }
            }
          }
        })
      },

      deleteTask: (blockId, taskId) => {
        const today = getTodayKey()
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
                )
              }
            }
          }
        })
      },

      toggleTask: (blockId, taskId) => {
        const today = getTodayKey()
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
                      t.id === taskId ? { ...t, completed: !t.completed } : t
                    )
                  }
                : b
            ),
            // Medal is NOT awarded for today - only for past days
            hasMedal: false
          }
          
          return {
            days: {
              ...state.days,
              [today]: newDayData
            }
          }
        })
      },

      reminders: [],

      addReminder: (text, date, time) => {
        set((state) => ({
          reminders: [
            ...state.reminders,
            { id: generateId(), text, date, time, sent: false }
          ]
        }))
      },

      deleteReminder: (id) => {
        set((state) => ({
          reminders: state.reminders.filter((r) => r.id !== id)
        }))
      },

      markReminderSent: (id) => {
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, sent: true } : r
          )
        }))
      },

      // Check past days and award medals if all tasks completed
      checkPastDaysMedals: () => {
        const today = getTodayKey()
        set((state) => {
          const updatedDays = { ...state.days }
          
          Object.keys(updatedDays).forEach((dateKey) => {
            // Only check past days, not today
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
            // Only count medals for past days
            if (dayData.hasMedal && dateKey < today) {
              medals.push(dateKey)
            }
          }
        })
        
        // Calculate streak - only past days with medals
        let streak = 0
        let checkDate = subDays(new Date(), 1) // Start from yesterday
        
        while (true) {
          const dateKey = format(checkDate, 'yyyy-MM-dd')
          const dayData = days[dateKey]
          
          if (dayData?.hasMedal) {
            streak++
            checkDate = subDays(checkDate, 1)
          } else if (dayData && dayData.blocks.flatMap((b) => b.tasks).length > 0) {
            // Has tasks but not all completed - break streak
            break
          } else {
            // No data for this day - break streak
            break
          }
        }
        
        return { completed, total, medals, streak }
      }
    }),
    {
      name: 'todo-veronika-storage'
    }
  )
)
