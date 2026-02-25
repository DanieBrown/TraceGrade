import { useCallback, useRef, useState } from 'react'
import { createStudent, type CreateStudentPayload } from './studentsApi'

interface AddStudentModalProps {
  onClose: () => void
  onStudentAdded: () => void
}

type FormState = 'idle' | 'submitting' | 'error'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(data: CreateStudentPayload): string | null {
  if (!data.firstName.trim()) return 'First name is required.'
  if (!data.lastName.trim()) return 'Last name is required.'
  if (!data.email.trim()) return 'Email is required.'
  if (!EMAIL_REGEX.test(data.email.trim())) return 'Please enter a valid email address.'
  return null
}

export default function AddStudentModal({ onClose, onStudentAdded }: AddStudentModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
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

      const payload: CreateStudentPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        studentNumber: studentNumber.trim() || undefined,
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
        await createStudent(payload)
        onStudentAdded()
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to add student. Please try again.'
        setErrorMessage(message)
        setFormState('error')
      }
    },
    [firstName, lastName, email, studentNumber, onStudentAdded],
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
        aria-label="Add student"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Add Student
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                First Name *
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isSubmitting}
                placeholder="Jane"
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
              <label htmlFor="lastName" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Last Name *
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isSubmitting}
                placeholder="Doe"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              placeholder="jane.doe@school.edu"
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
            <label htmlFor="studentNumber" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Student Number
              <span className="ml-1 font-body" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <input
              id="studentNumber"
              type="text"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              disabled={isSubmitting}
              placeholder="STU-2026-001"
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
          <div
            className="flex items-center justify-end gap-3 pt-2"
          >
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
              {isSubmitting ? 'Adding…' : '+ Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
