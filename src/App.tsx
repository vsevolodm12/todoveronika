import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { Navigation } from './components/Navigation'
import { TodayTab } from './components/TodayTab'
import { HistoryTab } from './components/HistoryTab'
import { StatsTab } from './components/StatsTab'
import { startReminderChecker } from './utils/reminderChecker'

function App() {
  const { activeTab, checkPastDaysMedals, reminders, markReminderSent } = useStore()

  // Check and award medals for past days on app load
  useEffect(() => {
    checkPastDaysMedals()
  }, [checkPastDaysMedals])

  // Start reminder checker
  useEffect(() => {
    const cleanup = startReminderChecker(
      () => reminders,
      markReminderSent
    )
    return cleanup
  }, [reminders, markReminderSent])

  return (
    <div className="app">
      <div className="app-background">
        <div className="bg-shape bg-shape-1" />
        <div className="bg-shape bg-shape-2" />
        <div className="bg-shape bg-shape-3" />
      </div>
      
      <header className="header">
        <h1 className="header-title">Дела Вероники</h1>
        <p className="header-subtitle">✨ Каждое дело — маленькая победа</p>
      </header>

      <Navigation />

      <main className="main-content">
        {activeTab === 'today' && <TodayTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'stats' && <StatsTab />}
      </main>
    </div>
  )
}

export default App
