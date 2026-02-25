import { useCallback, useRef, useState } from 'react'
import { createHomework, type CreateHomeworkPayload } from './homeworkApi'

interface CreateHomeworkModalProps {
  onClose: () => void
  onHomeworkCreated: () => void
}

type FormState = 'idle' | 'submitting' | 'error'

function validateForm(data: CreateHomeworkPayload): string | null {
  if (!data.title.trim()) return 'Title is required.'
  if (data.title.trim().length > 200) return 'Title must be 200 characters or fewer.'
  return null
}

export default function CreateHomeworkModal({ onClose, onHomeworkCreated }: CreateHomeworkModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [className, setClassName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [maxPoints, setMaxPoints] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const backdropRef = useRef<HTMLDivElement>(null)

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === backdropRef.current) onClose()
    },
    [onClose],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const payload: CreateHomeworkPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        className: className.trim() || undefined,
        dueDate: dueDate || undefined,
        maxPoints: maxPoints ? Number(maxPoints) : undefined,
      }

      const validationError = validateForm(payload)
      if (validationError) {
        setErrorMessage(validationError)
        setFormState('error')
        return
      }

      setFormState('submitting')
      setErrorMessage('')

      try {
        await createHomework(payload)
        onHomeworkCreated()
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create homework. Please try again.'
        setErrorMessage(message)
        setFormState('error')
      }
    },
    [title, description, className, dueDate, maxPoints, onHomeworkCreated],
  )

  const isSubmitting = formState === 'submitting'

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(6, 16, 30, 0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-md mx-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Create homework"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Create Homework
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="hw-title" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Title *
            </label>
            <input
              id="hw-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              placeholder="Chapter 5 Review"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="hw-description" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Description
              <span className="ml-1 font-body" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <textarea
              id="hw-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder="Complete exercises 1-20 from Chapter 5"
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body resize-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="hw-class" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Class
                <span className="ml-1 font-body" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <input
                id="hw-class"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                disabled={isSubmitting}
                placeholder="Algebra II — Period 3"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="hw-points" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Max Points
                <span className="ml-1 font-body" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <input
                id="hw-points"
                type="number"
                min="0"
                step="1"
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value)}
                disabled={isSubmitting}
                placeholder="100"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="hw-due" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Due Date
              <span className="ml-1 font-body" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <input
              id="hw-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {formState === 'error' && errorMessage && (
            <div
              className="rounded-lg p-3"
              role="alert"
              style={{
                background: 'rgba(232, 69, 90, 0.08)',
                border: '1px solid rgba(232, 69, 90, 0.22)',
              }}
            >
              <p className="font-body text-xs" style={{ color: 'var(--accent-crimson)' }}>
                {errorMessage}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg font-display text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-display text-sm font-semibold transition-opacity hover:opacity-90 active:scale-95"
              style={{
                background: 'var(--accent-gold)',
                color: 'var(--bg-base)',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Creating…' : '+ Create Homework'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
