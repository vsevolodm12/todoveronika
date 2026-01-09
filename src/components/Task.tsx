import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import type { Task as TaskType } from '../types'

interface TaskProps {
  task: TaskType
  blockId: string
  readonly?: boolean
}

export function Task({ task, blockId, readonly = false }: TaskProps) {
  const { updateTask, deleteTask, toggleTask } = useStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(task.text)

  const handleSave = () => {
    if (editText.trim()) {
      updateTask(blockId, task.id, editText.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditText(task.text)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className={`task ${task.completed ? 'completed' : ''}`}>
      <button
        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
        onClick={() => !readonly && toggleTask(blockId, task.id)}
        disabled={readonly}
      >
        {task.completed && <Check size={14} />}
      </button>

      {isEditing && !readonly ? (
        <>
          <input
            type="text"
            className="task-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button className="icon-button" onClick={handleSave}>
            <Check size={14} />
          </button>
          <button className="icon-button" onClick={handleCancel}>
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <span className="task-text">{task.text}</span>
          {!readonly && (
            <>
              <button
                className="icon-button"
                onClick={() => setIsEditing(true)}
                title="Редактировать"
              >
                <Pencil size={14} />
              </button>
              <button
                className="icon-button danger"
                onClick={() => deleteTask(blockId, task.id)}
                title="Удалить"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}

