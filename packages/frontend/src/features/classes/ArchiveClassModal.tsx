import { useCallback, useRef, useState } from 'react'
import type { ClassListItem } from './classesTypes'

interface ArchiveClassModalProps {
  item: ClassListItem
  onClose: () => void
  onConfirm: () => Promise<void>
}

export default function ArchiveClassModal({ item, onClose, onConfirm }: ArchiveClassModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const backdropRef = useRef<HTMLDivElement>(null)
  const confirmInFlightRef = useRef(false)

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === backdropRef.current && !isSubmitting) {
        onClose()
      }
    },
    [onClose, isSubmitting],
  )

  const handleConfirm = useCallback(async () => {
    if (confirmInFlightRef.current) {
      return
    }

    confirmInFlightRef.current = true
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await onConfirm()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to archive class. Please try again.'
      setErrorMessage(message)
    } finally {
      confirmInFlightRef.current = false
      setIsSubmitting(false)
    }
  }, [onConfirm])

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(6, 16, 30, 0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="mx-4 w-full max-w-md rounded-xl shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Archive class"
      >
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Archive Class
          </h2>
          <p className="mt-2 font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
            Are you sure you want to archive {item.name}? It will be removed from your active classes list.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          {errorMessage && (
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

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 font-display text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2 font-display text-sm font-semibold transition-opacity hover:opacity-90 active:scale-95"
              style={{
                background: 'var(--accent-crimson)',
                color: 'var(--bg-base)',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Archiving…' : 'Archive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}