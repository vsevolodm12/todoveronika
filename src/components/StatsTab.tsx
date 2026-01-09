import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useStore } from '../store/useStore'
import { Trophy, CheckCircle, Circle } from 'lucide-react'

type Period = 'day' | 'week' | 'month'

// Medal icon - simple circle with check
function MedalIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" fill="#FFD700"/>
      <path d="M10 16L14 20L22 12" stroke="#996600" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// Streak fire icon
function StreakIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 2C10 2 6 6 6 10.5C6 13 7.5 15 10 16C12.5 15 14 13 14 10.5C14 6 10 2 10 2Z" fill="#FF6B35"/>
      <path d="M10 7C10 7 8 9 8 11C8 12.5 9 13.5 10 14C11 13.5 12 12.5 12 11C12 9 10 7 10 7Z" fill="#FFAA00"/>
    </svg>
  )
}

// Short day names
const shortDayNames: Record<string, string> = {
  'пн': 'Пн', 'вт': 'Вт', 'ср': 'Ср', 'чт': 'Чт', 'пт': 'Пт', 'сб': 'Сб', 'вс': 'Вс',
}

function getShortDayName(date: Date): string {
  const dayName = format(date, 'EEEEEE', { locale: ru }).toLowerCase()
  return shortDayNames[dayName] || dayName
}

export function StatsTab() {
  const { getStats, days } = useStore()
  const [period, setPeriod] = useState<Period>('week')
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const stats = getStats(period)

  const periodLabels: Record<Period, string> = {
    day: 'Сегодня',
    week: 'Неделя',
    month: 'Месяц'
  }

  // Собираем все медали за всё время
  const allMedals = Object.entries(days)
    .filter(([_, data]) => data.hasMedal)
    .map(([date]) => date)
    .sort()
    .reverse()
    .slice(0, 12)

  const percentage = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0

  // Данные для графика
  const chartDays = period === 'day' ? 1 : period === 'week' ? 7 : 30
  const chartData = Array.from({ length: chartDays }, (_, i) => {
    const date = subDays(new Date(), chartDays - 1 - i)
    const dateKey = format(date, 'yyyy-MM-dd')
    const dayData = days[dateKey]
    const tasks = dayData?.blocks.flatMap(b => b.tasks) || []
    const completed = tasks.filter(t => t.completed).length
    const total = tasks.length
    return {
      date: dateKey,
      label: format(date, 'd MMM', { locale: ru }),
      dayName: getShortDayName(date),
      completed,
      total,
      hasMedal: dayData?.hasMedal || false
    }
  })

  const maxTasks = Math.max(...chartData.map(d => d.total), 1)
  
  // Count medals in current period for month view
  const medalsInPeriod = chartData.filter(d => d.hasMedal).length

  return (
    <div className="stats-tab">
      {/* Period Tabs */}
      <div className="period-tabs">
        {(['day', 'week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            className={`period-tab ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">
            <CheckCircle size={14} />
            <span>Выполнено</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>
            {stats.total - stats.completed}
          </div>
          <div className="stat-label">
            <Circle size={14} />
            <span>Не выполнено</span>
          </div>
        </div>
        
        <div className="stat-card streak">
          <div className="stat-value">
            {stats.streak}
            {stats.streak > 0 && <StreakIcon size={28} />}
          </div>
          <div className="stat-label">
            Streak
          </div>
        </div>
        
        <div className="stat-card medals">
          <div className="stat-value">{stats.medals.length}</div>
          <div className="stat-label">
            <Trophy size={14} />
            Medals
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      {period !== 'day' && (
        <div className="chart-section">
          <div className="chart-header">
            <span className="chart-title">Прогресс по дням</span>
            <span className="chart-subtitle">
              {percentage}% за период
              {period === 'month' && medalsInPeriod > 0 && (
                <span className="chart-medals-count"> · {medalsInPeriod} медалей</span>
              )}
            </span>
          </div>
          <div className="chart-container">
            {chartData.map((day, index) => {
              const height = day.total > 0 ? (day.completed / maxTasks) * 100 : 0
              const bgHeight = day.total > 0 ? (day.total / maxTasks) * 100 : 5
              const isHovered = hoveredDay === day.date
              
              return (
                <div 
                  key={day.date} 
                  className={`chart-bar-wrapper ${isHovered ? 'hovered' : ''}`}
                  onMouseEnter={() => setHoveredDay(day.date)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {isHovered && (
                    <div className="chart-tooltip">
                      <div className="chart-tooltip-date">{day.label}</div>
                      <div className="chart-tooltip-stats">
                        {day.completed}/{day.total} дел
                      </div>
                      {day.hasMedal && (
                        <div className="chart-tooltip-medal">Медаль!</div>
                      )}
                    </div>
                  )}
                  <div className="chart-bar-container">
                    <div 
                      className="chart-bar-bg" 
                      style={{ height: `${bgHeight}%` }}
                    />
                    <div 
                      className="chart-bar"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="chart-label">
                    {period === 'week' ? day.dayName : (index % 5 === 0 || index === chartData.length - 1 ? day.label : '')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Medals Section */}
      <div className="medals-section">
        <div className="medals-title">
          <Trophy size={20} />
          Коллекция медалей
        </div>
        
        {allMedals.length > 0 ? (
          <div className="medals-grid">
            {allMedals.map((dateKey) => (
              <div 
                key={dateKey} 
                className="medal-item"
                title={format(new Date(dateKey), 'd MMMM yyyy', { locale: ru })}
              >
                <MedalIcon size={40} />
                <span className="medal-date">
                  {format(new Date(dateKey), 'd MMM', { locale: ru })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-medals">
            Пока нет медалей. Выполни все дела за день, чтобы получить медаль!
          </div>
        )}
      </div>

      {/* Streak explanation */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="streak-explanation-title">
          <StreakIcon size={20} />
          Как работает Streak?
        </div>
        <p className="streak-explanation-text">
          Streak — это количество дней подряд, когда ты выполнила все дела за день.
          Если хотя бы одно дело останется невыполненным, streak сбросится.
          Поддерживай streak, чтобы получать больше медалей!
        </p>
      </div>
    </div>
  )
}
