import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Task } from './Task'
import { Plus, Pencil, Trash2, Check, X, ArrowRight } from 'lucide-react'
import type { Block as BlockType } from '../types'

interface BlockProps {
  block: BlockType
  readonly?: boolean
}

export function Block({ block, readonly = false }: BlockProps) {
  const { updateBlockName, deleteBlock, addTask } = useStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(block.name)
  const [newTaskText, setNewTaskText] = useState('')
  const [isAddingTask, setIsAddingTask] = useState(false)

  const handleSaveName = () => {
    if (editName.trim()) {
      updateBlockName(block.id, editName.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditName(block.name)
    setIsEditing(false)
  }

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      addTask(block.id, newTaskText.trim())
      setNewTaskText('')
      setIsAddingTask(false)
    }
  }

  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask()
    } else if (e.key === 'Escape') {
      setIsAddingTask(false)
      setNewTaskText('')
    }
  }

  const completedCount = block.tasks.filter((t) => t.completed).length
  const totalCount = block.tasks.length

  return (
    <div className="block">
      <div className="block-header">
        {isEditing && !readonly ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              className="block-title-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName()
                if (e.key === 'Escape') handleCancelEdit()
              }}
              autoFocus
            />
            <button className="icon-button" onClick={handleSaveName}>
              <Check size={16} />
            </button>
            <button className="icon-button" onClick={handleCancelEdit}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="block-title">
              {block.name}
              {totalCount > 0 && (
                <span style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-body)'
                }}>
                  {completedCount}/{totalCount}
                </span>
              )}
            </div>
            {!readonly && (
              <div className="block-actions">
                <button
                  className="icon-button"
                  onClick={() => setIsEditing(true)}
                  title="Редактировать"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-button danger"
                  onClick={() => deleteBlock(block.id)}
                  title="Удалить"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="tasks">
        {block.tasks.map((task) => (
          <Task key={task.id} task={task} blockId={block.id} readonly={readonly} />
        ))}
      </div>

      {!readonly && (
        isAddingTask ? (
          <div className="task new-task-input">
            <div className="task-checkbox" />
            <input
              type="text"
              className="task-input"
              placeholder="Новое дело..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={handleTaskKeyDown}
              autoFocus
            />
            <button 
              className="add-task-submit"
              onClick={handleAddTask}
              disabled={!newTaskText.trim()}
              title="Добавить"
            >
              <ArrowRight size={18} />
            </button>
            <button 
              className="icon-button"
              onClick={() => {
                setIsAddingTask(false)
                setNewTaskText('')
              }}
              title="Отмена"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            className="add-button"
            onClick={() => setIsAddingTask(true)}
            style={{ marginTop: block.tasks.length > 0 ? '8px' : 0 }}
          >
            <Plus size={16} />
            Добавить дело
          </button>
        )
      )}
    </div>
  )
}

