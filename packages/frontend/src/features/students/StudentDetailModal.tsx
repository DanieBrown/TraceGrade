import { useCallback, useRef, useState } from 'react'
import { updateStudent, type UpdateStudentPayload } from './studentsApi'
import type { StudentListItem } from './studentsTypes'

interface StudentDetailModalProps {
  student: StudentListItem
  onClose: () => void
  onStudentUpdated: () => void
}

type FormState = 'idle' | 'submitting' | 'error' | 'success'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(data: UpdateStudentPayload): string | null {
  if (data.firstName !== undefined && !data.firstName.trim()) return 'First name cannot be empty.'
  if (data.lastName !== undefined && !data.lastName.trim()) return 'Last name cannot be empty.'
  if (data.email !== undefined && !data.email.trim()) return 'Email cannot be empty.'
  if (data.email && !EMAIL_REGEX.test(data.email.trim())) return 'Please enter a valid email address.'
  return null
}

export default function StudentDetailModal({ student, onClose, onStudentUpdated }: StudentDetailModalProps) {
  const [firstName, setFirstName] = useState(student.firstName ?? '')
  const [lastName, setLastName] = useState(student.lastName ?? '')
  const [email, setEmail] = useState(student.email ?? '')
  const [studentNumber, setStudentNumber] = useState(student.studentNumber ?? '')
  const [isActive, setIsActive] = useState(student.isActive)
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

      const payload: UpdateStudentPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        studentNumber: studentNumber.trim() || undefined,
        isActive,
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
        await updateStudent(student.id, payload)
        setFormState('success')
        onStudentUpdated()
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update student. Please try again.'
        setErrorMessage(message)
        setFormState('error')
      }
    },
    [firstName, lastName, email, studentNumber, isActive, student.id, onStudentUpdated],
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
        aria-label="Student details"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Student Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Summary info */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-bold"
              style={{
                background: 'rgba(232, 164, 40, 0.12)',
                color: 'var(--accent-gold)',
                border: '1px solid rgba(232, 164, 40, 0.25)',
              }}
            >
              {(student.firstName?.[0] ?? '').toUpperCase()}
              {(student.lastName?.[0] ?? '').toUpperCase()}
            </div>
            <div>
              <p className="font-display text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {student.fullName}
              </p>
              <div className="flex flex-wrap gap-2 mt-0.5">
                {student.classLabel && (
                  <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    Class: {student.classLabel}
                  </span>
                )}
                {student.gradeLabel && (
                  <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    Grade: {student.gradeLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 py-4">
          {/* First name */}
          <div>
            <label
              htmlFor="sd-firstname"
              className="mb-1 block font-body text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              First Name
            </label>
            <input
              id="sd-firstname"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--accent-gold)]"
              style={{
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Last name */}
          <div>
            <label
              htmlFor="sd-lastname"
              className="mb-1 block font-body text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Last Name
            </label>
            <input
              id="sd-lastname"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--accent-gold)]"
              style={{
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="sd-email"
              className="mb-1 block font-body text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Email
            </label>
            <input
              id="sd-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--accent-gold)]"
              style={{
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Student Number */}
          <div>
            <label
              htmlFor="sd-studentnumber"
              className="mb-1 block font-body text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Student Number
            </label>
            <input
              id="sd-studentnumber"
              type="text"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              disabled={isSubmitting}
              placeholder="Optional"
              className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--accent-gold)]"
              style={{
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)' }}>
            <span className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>Active</span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              disabled={isSubmitting}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--accent-gold)' : 'var(--border)',
              }}
            >
              <span
                className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                style={{ transform: isActive ? 'translateX(22px)' : 'translateX(4px)' }}
              />
            </button>
          </div>

          {/* Error message */}
          {formState === 'error' && errorMessage && (
            <p className="rounded-lg px-3 py-2 font-body text-xs" style={{ color: 'var(--accent-crimson)', background: 'rgba(232, 69, 90, 0.08)' }}>
              {errorMessage}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 pb-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 font-display text-sm font-semibold transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg px-5 py-2 font-display text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent-gold)', color: 'var(--bg-base)' }}
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
