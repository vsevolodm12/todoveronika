import { useState } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday as isDateToday
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { useStore } from '../store/useStore'
import { Block } from './Block'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Medal icon - simple circle with check, same style as streak
function MedalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill="#FFD700"/>
      <path d="M4.5 7L6.5 9L10 5" stroke="#996600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// Streak fire icon  
function StreakIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1C7 1 4 4 4 7C4 9 5.2 10.5 7 11.5C8.8 10.5 10 9 10 7C10 4 7 1 7 1Z" fill="#FF6B35"/>
      <path d="M7 5C7 5 5.5 6.5 5.5 8C5.5 9 6.2 9.8 7 10.2C7.8 9.8 8.5 9 8.5 8C8.5 6.5 7 5 7 5Z" fill="#FFAA00"/>
    </svg>
  )
}

export function HistoryTab() {
  const { days, selectedDate, setSelectedDate } = useStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const today = format(new Date(), 'yyyy-MM-dd')
  const selectedDayData = days[selectedDate]
  const isToday = selectedDate === today

  // Calendar logic
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const handleDayClick = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd')
    if (dateKey <= today) {
      setSelectedDate(dateKey)
    }
  }

  // Calculate streak - consecutive days with medals ending at given date
  const getStreakAtDate = (dateKey: string): number => {
    // No streak for today since we can't have medal yet
    if (dateKey === today) return 0
    
    let streak = 0
    const checkDate = new Date(dateKey)
    
    while (true) {
      const checkKey = format(checkDate, 'yyyy-MM-dd')
      // Don't count today
      if (checkKey === today) break
      
      const dayData = days[checkKey]
      
      if (dayData?.hasMedal) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
    
    return streak
  }

  const selectedDateFormatted = format(
    new Date(selectedDate), 
    "d MMMM yyyy, EEEE", 
    { locale: ru }
  )

  return (
    <div className="history-tab">
      {/* Calendar */}
      <div className="calendar">
        <div className="calendar-header">
          <button 
            className="icon-button" 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="calendar-title">
            {format(currentMonth, 'LLLL yyyy', { locale: ru })}
          </div>
          <button 
            className="icon-button" 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="calendar-grid">
          {weekdays.map((day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
          
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayData = days[dateKey]
            const isSelected = dateKey === selectedDate
            const isTodayDate = isDateToday(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            // No medal for today
            const hasMedal = dayData?.hasMedal && dateKey !== today
            const streakCount = getStreakAtDate(dateKey)
            const hasStreak = streakCount >= 2 && hasMedal
            const isFuture = dateKey > today

            return (
              <button
                key={dateKey}
                className={`calendar-day ${isSelected ? 'selected' : ''} ${isTodayDate ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                onClick={() => handleDayClick(day)}
                disabled={isFuture}
                style={{ opacity: isFuture ? 0.3 : 1, cursor: isFuture ? 'not-allowed' : 'pointer' }}
              >
                <span className="calendar-day-number">{format(day, 'd')}</span>
                {(hasMedal || hasStreak) && (
                  <div className="calendar-day-badges">
                    {hasMedal && <MedalIcon />}
                    {hasStreak && <StreakIcon />}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Day View */}
      <div className="history-day">
        <div className="history-day-header">
          <span className="history-date">{selectedDateFormatted}</span>
          {selectedDayData?.hasMedal && selectedDate !== today && (
            <div className="history-medal-badge">
              <MedalIcon /> Все выполнено!
            </div>
          )}
        </div>

        {isToday ? (
          <div className="empty-state-simple">
            <span className="empty-state-date-text">Это сегодняшний день</span>
            <span className="empty-state-date-hint">Перейди во вкладку «Сегодня»</span>
          </div>
        ) : selectedDayData && selectedDayData.blocks.length > 0 ? (
          selectedDayData.blocks.map((block) => (
            <Block key={block.id} block={block} readonly />
          ))
        ) : (
          <div className="empty-state-simple">
            <span className="empty-state-date-text">Нет данных за этот день</span>
          </div>
        )}
      </div>
    </div>
  )
}
