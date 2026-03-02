import { useCallback, useRef, useState } from 'react'
import { createExamTemplate, type CreateExamTemplatePayload } from './examsApi'

interface CreateExamModalProps {
  onClose: () => void
  onExamCreated: () => void
}

type FormState = 'idle' | 'submitting' | 'error'

const DIFFICULTY_OPTIONS = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
  { value: 'ADVANCED', label: 'Advanced' },
] as const

export default function CreateExamModal({ onClose, onExamCreated }: CreateExamModalProps) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [description, setDescription] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState<string>('MEDIUM')
  const [totalPoints, setTotalPoints] = useState('100')
  const [questionsJson, setQuestionsJson] = useState('[]')
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

      if (!name.trim()) {
        setErrorMessage('Exam name is required.')
        setFormState('error')
        return
      }

      const points = Number(totalPoints)
      if (!points || points <= 0) {
        setErrorMessage('Total points must be a positive number.')
        setFormState('error')
        return
      }

      // Validate questions JSON
      try {
        JSON.parse(questionsJson)
      } catch {
        setErrorMessage('Questions must be valid JSON.')
        setFormState('error')
        return
      }

      setFormState('submitting')
      setErrorMessage('')

      try {
        const payload: CreateExamTemplatePayload = {
          name: name.trim(),
          subject: subject.trim() || undefined,
          topic: topic.trim() || undefined,
          gradeLevel: gradeLevel.trim() || undefined,
          description: description.trim() || undefined,
          difficultyLevel: difficultyLevel as CreateExamTemplatePayload['difficultyLevel'],
          totalPoints: points,
          questionsJson: questionsJson.trim(),
        }

        await createExamTemplate(payload)
        onExamCreated()
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create exam template. Please try again.'
        setErrorMessage(message)
        setFormState('error')
      }
    },
    [name, subject, topic, gradeLevel, description, difficultyLevel, totalPoints, questionsJson, onExamCreated],
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
        className="rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Create exam template"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Create Exam Template
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
        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="examName" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Exam Name *
            </label>
            <input
              id="examName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder="Algebra Midterm"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              required
            />
          </div>

          {/* Subject + Grade Level */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="examSubject" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Subject
              </label>
              <input
                id="examSubject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isSubmitting}
                placeholder="Mathematics"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="examGradeLevel" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Grade Level
              </label>
              <input
                id="examGradeLevel"
                type="text"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                disabled={isSubmitting}
                placeholder="10th Grade"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Topic */}
          <div className="space-y-1.5">
            <label htmlFor="examTopic" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Topic
            </label>
            <input
              id="examTopic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isSubmitting}
              placeholder="Linear Equations"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Difficulty + Total Points */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="examDifficulty" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Difficulty Level
              </label>
              <select
                id="examDifficulty"
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="examTotalPoints" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Total Points *
              </label>
              <input
                id="examTotalPoints"
                type="number"
                min="1"
                value={totalPoints}
                onChange={(e) => setTotalPoints(e.target.value)}
                disabled={isSubmitting}
                placeholder="100"
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

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="examDescription" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Description
              <span className="ml-1 font-body" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <textarea
              id="examDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder="Brief description of the exam..."
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body resize-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Questions JSON */}
          <div className="space-y-1.5">
            <label htmlFor="examQuestions" className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Questions (JSON) *
            </label>
            <textarea
              id="examQuestions"
              value={questionsJson}
              onChange={(e) => setQuestionsJson(e.target.value)}
              disabled={isSubmitting}
              placeholder='[{"number": 1, "question": "Solve for x: 2x + 3 = 7", "points": 10}]'
              rows={4}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-mono resize-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
              required
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
              {isSubmitting ? 'Creating…' : '+ Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
