import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClassListItem, CreateClassPayload } from './classesTypes'

type FormState = 'idle' | 'submitting' | 'error'

interface ClassFormModalProps {
  mode: 'create' | 'edit'
  initialValues?: ClassListItem
  onClose: () => void
  onSubmit: (payload: CreateClassPayload) => Promise<void>
}

function validateForm(data: CreateClassPayload): string | null {
  if (!data.name.trim()) return 'Class name is required.'
  if (!data.subject.trim()) return 'Subject is required.'
  if (!data.period.trim()) return 'Period is required.'
  if (!data.schoolYear.trim()) return 'School year is required.'
  return null
}

export default function ClassFormModal({ mode, initialValues, onClose, onSubmit }: ClassFormModalProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [subject, setSubject] = useState(initialValues?.subject ?? '')
  const [period, setPeriod] = useState(initialValues?.period ?? '')
  const [schoolYear, setSchoolYear] = useState(initialValues?.schoolYear ?? '')
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const backdropRef = useRef<HTMLDivElement>(null)
  const submitInFlightRef = useRef(false)

  useEffect(() => {
    setName(initialValues?.name ?? '')
    setSubject(initialValues?.subject ?? '')
    setPeriod(initialValues?.period ?? '')
    setSchoolYear(initialValues?.schoolYear ?? '')
  }, [initialValues])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === backdropRef.current && formState !== 'submitting') {
        onClose()
      }
    },
    [onClose, formState],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (submitInFlightRef.current) {
        return
      }

      const payload: CreateClassPayload = {
        name: name.trim(),
        subject: subject.trim(),
        period: period.trim(),
        schoolYear: schoolYear.trim(),
      }

      const validationError = validateForm(payload)
      if (validationError) {
        setErrorMessage(validationError)
        setFormState('error')
        return
      }

      submitInFlightRef.current = true
      setFormState('submitting')
      setErrorMessage('')

      try {
        await onSubmit(payload)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to save class changes. Please try again.'
        setErrorMessage(message)
        setFormState('error')
      } finally {
        submitInFlightRef.current = false
      }
    },
    [name, subject, period, schoolYear, onSubmit],
  )

  const isSubmitting = formState === 'submitting'
  const isCreateMode = mode === 'create'

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
        aria-label={isCreateMode ? 'Create class' : 'Edit class'}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {isCreateMode ? 'Create Class' : 'Edit Class'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <label htmlFor="class-name" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Class Name *
            </label>
            <input
              id="class-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder="Biology 101"
              className="w-full rounded-lg px-3 py-2 text-sm font-body transition-colors focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="class-subject" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Subject *
            </label>
            <input
              id="class-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSubmitting}
              placeholder="Science"
              className="w-full rounded-lg px-3 py-2 text-sm font-body transition-colors focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="class-period" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Period *
              </label>
              <input
                id="class-period"
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                disabled={isSubmitting}
                placeholder="2"
                className="w-full rounded-lg px-3 py-2 text-sm font-body transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="class-school-year" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                School Year *
              </label>
              <input
                id="class-school-year"
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                disabled={isSubmitting}
                placeholder="2026-2027"
                className="w-full rounded-lg px-3 py-2 text-sm font-body transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                required
              />
            </div>
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

          <div className="flex items-center justify-end gap-3 pt-2">
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
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2 font-display text-sm font-semibold transition-opacity hover:opacity-90 active:scale-95"
              style={{
                background: 'var(--accent-gold)',
                color: 'var(--bg-base)',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Saving…' : isCreateMode ? '+ Create Class' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}