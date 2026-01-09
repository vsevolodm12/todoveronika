import { useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useStore } from '../store/useStore'
import { Block } from './Block'
import { ReminderModal } from './ReminderModal'
import { Plus, Bell } from 'lucide-react'

export function TodayTab() {
  const { days, addBlock } = useStore()
  const [newBlockName, setNewBlockName] = useState('')
  const [isAddingBlock, setIsAddingBlock] = useState(false)
  const [isReminderOpen, setIsReminderOpen] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const dayData = days[today]
  const blocks = dayData?.blocks || []

  const todayFormatted = format(new Date(), "d MMMM, EEEE", { locale: ru })

  const handleAddBlock = () => {
    if (newBlockName.trim()) {
      addBlock(newBlockName.trim())
      setNewBlockName('')
      setIsAddingBlock(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddBlock()
    } else if (e.key === 'Escape') {
      setIsAddingBlock(false)
      setNewBlockName('')
    }
  }

  const isEmpty = blocks.length === 0 && !isAddingBlock

  return (
    <div className="today-tab">
      <div className="today-date">{todayFormatted}</div>

      {isEmpty && (
        <div className="empty-state-minimal">
          <div className="empty-state-hint">Создай первый блок, чтобы начать!</div>
        </div>
      )}

      {blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}

      {isAddingBlock ? (
        <div className="block">
          <div className="block-header">
            <input
              type="text"
              className="block-title-input"
              placeholder="Название блока..."
              value={newBlockName}
              onChange={(e) => setNewBlockName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newBlockName.trim()) {
                  setIsAddingBlock(false)
                }
              }}
              autoFocus
            />
          </div>
          <button className="add-button" onClick={handleAddBlock}>
            <Plus size={18} />
            Создать блок
          </button>
        </div>
      ) : (
        <div className="bottom-actions">
          <button
            className="add-button add-block-button"
            onClick={() => setIsAddingBlock(true)}
          >
            <Plus size={18} />
            Добавить блок
          </button>
          
          <button
            className="reminder-button-bottom"
            onClick={() => setIsReminderOpen(true)}
          >
            <Bell size={18} />
            Напоминание
          </button>
        </div>
      )}

      {/* Signature at the very bottom */}
      <div className="footer-signature">
        С любовью, от твоего брата Севы
      </div>

      <ReminderModal 
        isOpen={isReminderOpen} 
        onClose={() => setIsReminderOpen(false)} 
      />
    </div>
  )
}
