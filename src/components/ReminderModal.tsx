import { useState } from 'react'
import { format, addDays, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { X, Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'

interface ReminderModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ReminderModal({ isOpen, onClose }: ReminderModalProps) {
  const { addReminder, reminders, deleteReminder } = useStore()
  const [text, setText] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hours, setHours] = useState(12)
  const [minutes, setMinutes] = useState(0)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showTime, setShowTime] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      addReminder(text.trim(), dateStr, timeStr)
      setText('')
      setSelectedDate(new Date())
      setHours(12)
      setMinutes(0)
    }
  }

  const pendingReminders = reminders.filter(r => !r.sent)

  // Calendar
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const today = new Date()

  // Quick date options
  const quickDates = [
    { label: 'Сегодня', date: today },
    { label: 'Завтра', date: addDays(today, 1) },
    { label: 'Через неделю', date: addDays(today, 7) },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Bell size={20} />
            Напоминание
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form className="reminder-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">О чём напомнить?</label>
            <input
              type="text"
              className="form-input"
              placeholder="Текст напоминания..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>

          {/* Date Picker */}
          <div className="form-group">
            <label className="form-label">Дата</label>
            <button
              type="button"
              className="picker-button"
              onClick={() => { setShowCalendar(!showCalendar); setShowTime(false); }}
            >
              {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
            </button>
            
            {showCalendar && (
              <div className="picker-dropdown">
                <div className="quick-options">
                  {quickDates.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      className={`quick-option ${isSameDay(selectedDate, opt.date) ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDate(opt.date)
                        setCurrentMonth(opt.date)
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                
                <div className="mini-calendar">
                  <div className="mini-calendar-header">
                    <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                      <ChevronLeft size={16} />
                    </button>
                    <span>{format(currentMonth, 'LLLL yyyy', { locale: ru })}</span>
                    <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  
                  <div className="mini-calendar-weekdays">
                    {weekdays.map(d => <span key={d}>{d}</span>)}
                  </div>
                  
                  <div className="mini-calendar-days">
                    {calendarDays.map((day) => {
                      const isSelected = isSameDay(day, selectedDate)
                      const isCurrentMonth = isSameMonth(day, currentMonth)
                      const isPast = day < today && !isSameDay(day, today)
                      
                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          className={`mini-day ${isSelected ? 'selected' : ''} ${!isCurrentMonth ? 'other' : ''} ${isPast ? 'past' : ''}`}
                          onClick={() => !isPast && setSelectedDate(day)}
                          disabled={isPast}
                        >
                          {format(day, 'd')}
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                <button 
                  type="button" 
                  className="picker-done"
                  onClick={() => setShowCalendar(false)}
                >
                  Готово
                </button>
              </div>
            )}
          </div>

          {/* Time Picker */}
          <div className="form-group">
            <label className="form-label">Время</label>
            <button
              type="button"
              className="picker-button"
              onClick={() => { setShowTime(!showTime); setShowCalendar(false); }}
            >
              {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
            </button>
            
            {showTime && (
              <div className="picker-dropdown time-picker">
                <div className="time-columns">
                  <div className="time-column">
                    <span className="time-label">Часы</span>
                    <div className="time-scroll">
                      {Array.from({ length: 24 }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`time-option ${hours === i ? 'active' : ''}`}
                          onClick={() => setHours(i)}
                        >
                          {i.toString().padStart(2, '0')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="time-column">
                    <span className="time-label">Минуты</span>
                    <div className="time-scroll">
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`time-option ${minutes === m ? 'active' : ''}`}
                          onClick={() => setMinutes(m)}
                        >
                          {m.toString().padStart(2, '0')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <button 
                  type="button" 
                  className="picker-done"
                  onClick={() => setShowTime(false)}
                >
                  Готово
                </button>
              </div>
            )}
          </div>

          <button type="submit" className="reminder-submit" disabled={!text.trim()}>
            Создать напоминание
          </button>
        </form>

        {pendingReminders.length > 0 && (
          <div className="reminders-list">
            <div className="reminders-list-title">Ожидающие напоминания</div>
            {pendingReminders.map(reminder => (
              <div key={reminder.id} className="reminder-item">
                <div className="reminder-item-content">
                  <div className="reminder-item-text">{reminder.text}</div>
                  <div className="reminder-item-time">
                    {format(new Date(reminder.date), 'd MMM', { locale: ru })} в {reminder.time}
                  </div>
                </div>
                <button 
                  className="icon-button danger"
                  onClick={() => deleteReminder(reminder.id)}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="reminder-hint">
          <Bell size={14} />
          Напоминания отправляются в Telegram
        </div>
      </div>
    </div>
  )
}
