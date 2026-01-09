import { useStore } from '../store/useStore'
import { Calendar, CheckSquare, BarChart3 } from 'lucide-react'
import type { TabType } from '../types'

export function Navigation() {
  const { activeTab, setActiveTab } = useStore()

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'history', label: 'История', icon: <Calendar /> },
    { id: 'today', label: 'Сегодня', icon: <CheckSquare /> },
    { id: 'stats', label: 'Статистика', icon: <BarChart3 /> },
  ]

  return (
    <nav className="navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

