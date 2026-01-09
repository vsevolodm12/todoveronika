import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { Navigation } from './components/Navigation'
import { TodayTab } from './components/TodayTab'
import { HistoryTab } from './components/HistoryTab'
import { StatsTab } from './components/StatsTab'

function App() {
  const { activeTab, init, loadReminders, checkPastDaysMedals, loading, error } = useStore()

  // Initialize - load data from server
  useEffect(() => {
    init().then(() => {
      checkPastDaysMedals()
      loadReminders()
    })
  }, [init, checkPastDaysMedals, loadReminders])

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-screen">
          <p>Ошибка: {error}</p>
          <button onClick={() => window.location.reload()}>Попробовать снова</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      
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
