import { useCallback, useEffect, useRef, useState } from 'react'
import { updateExamTemplate, fetchExamTemplateById, type CreateExamTemplatePayload } from './examsApi'
import type { ExamTemplateListItem } from './examsTypes'

interface ExamDetailModalProps {
  exam: ExamTemplateListItem
  onClose: () => void
  onExamUpdated: () => void
  onGradeExam: (examId: string) => void
}

type FormState = 'loading' | 'idle' | 'submitting' | 'error'

export default function ExamDetailModal({ exam, onClose, onExamUpdated, onGradeExam }: ExamDetailModalProps) {
  const [title, setTitle] = useState(exam.title)
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [totalPoints, setTotalPoints] = useState(String(exam.totalPoints))
  const [description, setDescription] = useState('')
  const [formState, setFormState] = useState<FormState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const backdropRef = useRef<HTMLDivElement>(null)
  const secondaryActionButtonClassName = 'rounded-lg border border-gold-500/30 bg-gold-500/10 px-4 py-2 font-display text-sm font-semibold text-gold-300 transition-colors duration-150 hover:bg-gold-500/20 hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 disabled:cursor-not-allowed disabled:opacity-50'
  const secondaryIconButtonClassName = 'flex h-8 w-8 items-center justify-center rounded-lg border border-gold-500/30 bg-gold-500/10 text-gold-300 transition-colors duration-150 hover:bg-gold-500/20 hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 disabled:cursor-not-allowed disabled:opacity-50'

  // Load full exam details
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const full = await fetchExamTemplateById(exam.id)
        if (cancelled) return
        setTitle(full.title)
        setTotalPoints(String(full.totalPoints))
        setFormState('idle')
      } catch {
        if (cancelled) return
        // Use what we already have from the list item
        setFormState('idle')
      }
    }
    void load()
    return () => { cancelled = true }
  }, [exam.id])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === backdropRef.current) onClose()
    },
    [onClose],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!title.trim()) {
        setErrorMessage('Title is required.')
        setFormState('error')
        return
      }

      setFormState('submitting')
      setErrorMessage('')

      const payload: Partial<CreateExamTemplatePayload> = {
        name: title.trim(),
        totalPoints: Number(totalPoints) || exam.totalPoints,
      }
      if (subject.trim()) payload.subject = subject.trim()
      if (topic.trim()) payload.topic = topic.trim()
      if (description.trim()) payload.description = description.trim()

      try {
        await updateExamTemplate(exam.id, payload)
        onExamUpdated()
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update exam. Please try again.'
        setErrorMessage(message)
        setFormState('error')
      }
    },
    [title, subject, topic, totalPoints, description, exam.id, exam.totalPoints, onExamUpdated],
  )

  const isSubmitting = formState === 'submitting'
  const isLoading = formState === 'loading'

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
        aria-label="Exam details"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Exam Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={secondaryIconButtonClassName}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Summary */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg font-display text-base font-bold"
              style={{
                background: 'rgba(91, 197, 245, 0.1)',
                color: '#5bc5f5',
                border: '1px solid rgba(91, 197, 245, 0.22)',
              }}
            >
              📝
            </div>
            <div>
              <p className="font-display text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {exam.title}
              </p>
              <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                {exam.questionCount} questions · {exam.totalPoints} pts · {exam.statusLabel}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center">
            <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>Loading details…</p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 py-4">
            {/* Title */}
            <div>
              <label
                htmlFor="ed-title"
                className="mb-1 block font-body text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Title
              </label>
              <input
                id="ed-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--accent-gold)]"
                style={{
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Subject */}
            <div>
              <label
                htmlFor="ed-subject"
                className="mb-1 block font-body text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Subject
              </label>
              <input
                id="ed-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. Mathematics"
                className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--accent-gold)]"
                style={{
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Topic */}
            <div>
              <label
                htmlFor="ed-topic"
                className="mb-1 block font-body text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Topic
              </label>
              <input
                id="ed-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. Algebra"
                className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--accent-gold)]"
                style={{
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Total Points */}
            <div>
              <label
                htmlFor="ed-points"
                className="mb-1 block font-body text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Total Points
              </label>
              <input
                id="ed-points"
                type="number"
                min="0"
                value={totalPoints}
                onChange={(e) => setTotalPoints(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--accent-gold)]"
                style={{
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="ed-description"
                className="mb-1 block font-body text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Description
              </label>
              <textarea
                id="ed-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={2}
                placeholder="Optional exam description"
                className="w-full rounded-lg px-3 py-2 font-body text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--accent-gold)] resize-none"
                style={{
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Error */}
            {formState === 'error' && errorMessage && (
              <p className="rounded-lg px-3 py-2 font-body text-xs" style={{ color: 'var(--accent-crimson)', background: 'rgba(232, 69, 90, 0.08)' }}>
                {errorMessage}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 pb-2">
              <button
                type="button"
                onClick={() => onGradeExam(exam.id)}
                className="rounded-lg px-4 py-2 font-display text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ color: 'var(--accent-teal)', border: '1px solid rgba(0, 201, 167, 0.3)' }}
              >
                ✏ Grade Exam
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className={secondaryActionButtonClassName}
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
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
