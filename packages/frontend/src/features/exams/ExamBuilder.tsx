import { useCallback, useRef } from 'react'
import {
  type BuilderQuestion,
  type BuilderSubQuestion,
  type QuestionType,
  calculateTotalPoints,
  createEmptyQuestion,
  createEmptySubQuestion,
  createEmptyRubric,
} from './examQuestions'
import { uploadAnswerRubricImage } from '../rubrics/rubricsApi'

// ── Props ─────────────────────────────────────────────────────────────────────

interface ExamBuilderProps {
  questions: BuilderQuestion[]
  onChange: (questions: BuilderQuestion[]) => void
  /** When available (during edit), used for rubric image uploads */
  examTemplateId?: string
  allowAnswerImageUpload?: boolean
  disabled?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  'multiple-choice': 'Multiple Choice',
  'multi-part': 'Multi-Part',
  'open-ended': 'Open-Ended',
}

const OPTION_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExamBuilder({
  questions,
  onChange,
  examTemplateId,
  allowAnswerImageUpload = true,
  disabled,
}: ExamBuilderProps) {
  const totalPoints = calculateTotalPoints(questions)

  const updateQuestion = useCallback(
    (index: number, patch: Partial<BuilderQuestion>) => {
      const next = [...questions]
      next[index] = { ...next[index], ...patch }
      onChange(next)
    },
    [questions, onChange],
  )

  const removeQuestion = useCallback(
    (index: number) => {
      const next = questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, questionNumber: i + 1 }))
      onChange(next)
    },
    [questions, onChange],
  )

  const addQuestion = useCallback(() => {
    onChange([...questions, createEmptyQuestion(questions.length + 1)])
  }, [questions, onChange])

  const moveQuestion = useCallback(
    (index: number, direction: -1 | 1) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= questions.length) return
      const next = [...questions]
      const temp = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = temp
      onChange(next.map((q, i) => ({ ...q, questionNumber: i + 1 })))
    },
    [questions, onChange],
  )

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(232, 164, 40, 0.06)', border: '1px solid rgba(232, 164, 40, 0.15)' }}>
        <span className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </span>
        <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>
          {totalPoints} pts
        </span>
      </div>

      {/* Question list */}
      {questions.map((q, index) => (
        <QuestionEditor
          key={q.id}
          question={q}
          index={index}
          total={questions.length}
          onChange={(patch) => updateQuestion(index, patch)}
          onRemove={() => removeQuestion(index)}
          onMove={(dir) => moveQuestion(index, dir)}
          examTemplateId={examTemplateId}
          allowAnswerImageUpload={allowAnswerImageUpload}
          disabled={disabled}
        />
      ))}

      {/* Add question button */}
      <button
        type="button"
        onClick={addQuestion}
        disabled={disabled}
        className="w-full rounded-xl border border-dashed px-4 py-3 font-display text-sm font-medium transition-colors duration-150"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--accent-gold)',
          background: 'transparent',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        + Add Question
      </button>
    </div>
  )
}

// ── Individual question editor ────────────────────────────────────────────────

interface QuestionEditorProps {
  question: BuilderQuestion
  index: number
  total: number
  onChange: (patch: Partial<BuilderQuestion>) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  examTemplateId?: string
  allowAnswerImageUpload: boolean
  disabled?: boolean
}

function QuestionEditor({
  question,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  examTemplateId,
  allowAnswerImageUpload,
  disabled,
}: QuestionEditorProps) {
  const handleTypeChange = useCallback(
    (type: QuestionType) => {
      const patch: Partial<BuilderQuestion> = { type }
      if (type === 'multiple-choice') {
        patch.options = [
          { label: 'A', text: '' },
          { label: 'B', text: '' },
          { label: 'C', text: '' },
          { label: 'D', text: '' },
        ]
        patch.correctOptionIndex = null
        patch.subQuestions = []
      } else if (type === 'multi-part') {
        patch.options = []
        patch.correctOptionIndex = null
        patch.subQuestions = [createEmptySubQuestion()]
      } else {
        patch.options = []
        patch.correctOptionIndex = null
        patch.subQuestions = []
        patch.rubric = createEmptyRubric()
      }
      onChange(patch)
    },
    [onChange],
  )

  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
    >
      {/* Question header */}
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--accent-gold)' }}>
            Q{question.questionNumber}
          </span>
          <select
            value={question.type}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            disabled={disabled}
            className="rounded-md px-2 py-1 font-body text-xs transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          {index > 0 && (
            <button type="button" onClick={() => onMove(-1)} disabled={disabled} className="rounded p-1 text-xs transition-colors" style={{ color: 'var(--text-muted)' }} aria-label="Move up" title="Move up">↑</button>
          )}
          {index < total - 1 && (
            <button type="button" onClick={() => onMove(1)} disabled={disabled} className="rounded p-1 text-xs transition-colors" style={{ color: 'var(--text-muted)' }} aria-label="Move down" title="Move down">↓</button>
          )}
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="ml-1 rounded p-1 text-xs transition-colors"
            style={{ color: 'var(--accent-crimson)' }}
            aria-label={`Remove question ${question.questionNumber}`}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Question body */}
      <div className="space-y-3 px-4 py-4">
        {/* Prompt */}
        <div className="space-y-1">
          <label className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Question Prompt
          </label>
          <textarea
            value={question.prompt}
            onChange={(e) => onChange({ prompt: e.target.value })}
            disabled={disabled}
            placeholder="Enter the question text..."
            rows={2}
            className="w-full rounded-lg px-3 py-2 text-sm font-body resize-none transition-colors focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Points (for non-multi-part) */}
        {question.type !== 'multi-part' && (
          <div className="space-y-1">
            <label className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Points
            </label>
            <input
              type="number"
              min="1"
              value={question.pointsAvailable}
              onChange={(e) => onChange({ pointsAvailable: Math.max(1, Number(e.target.value) || 1) })}
              disabled={disabled}
              className="w-24 rounded-lg px-3 py-2 text-sm font-mono transition-colors focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        )}

        {/* Type-specific content */}
        {question.type === 'multiple-choice' && (
          <MultipleChoiceEditor
            options={question.options}
            correctOptionIndex={question.correctOptionIndex}
            onChange={onChange}
            disabled={disabled}
          />
        )}

        {question.type === 'multi-part' && (
          <MultiPartEditor
            question={question}
            onChange={onChange}
            examTemplateId={examTemplateId}
            allowAnswerImageUpload={allowAnswerImageUpload}
            disabled={disabled}
          />
        )}

        {question.type === 'open-ended' && (
          <OpenEndedRubricEditor
            rubric={question.rubric}
            onChange={(rubric) => onChange({ rubric })}
            examTemplateId={examTemplateId}
            allowAnswerImageUpload={allowAnswerImageUpload}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  )
}

// ── Multiple Choice Editor ────────────────────────────────────────────────────

interface MultipleChoiceEditorProps {
  options: BuilderQuestion['options']
  correctOptionIndex: number | null
  onChange: (patch: Partial<BuilderQuestion>) => void
  disabled?: boolean
}

function MultipleChoiceEditor({ options, correctOptionIndex, onChange, disabled }: MultipleChoiceEditorProps) {
  const addOption = () => {
    const label = OPTION_LABELS[options.length] ?? `${options.length + 1}`
    onChange({ options: [...options, { label, text: '' }] })
  }

  const removeOption = (i: number) => {
    const next = options.filter((_, idx) => idx !== i).map((opt, idx) => ({ ...opt, label: OPTION_LABELS[idx] ?? `${idx + 1}` }))
    const newCorrect = correctOptionIndex === i ? null : correctOptionIndex !== null && correctOptionIndex > i ? correctOptionIndex - 1 : correctOptionIndex
    onChange({ options: next, correctOptionIndex: newCorrect })
  }

  const updateOptionText = (i: number, text: string) => {
    const next = [...options]
    next[i] = { ...next[i], text }
    onChange({ options: next })
  }

  return (
    <div className="space-y-2">
      <label className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        Answer Options
      </label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ correctOptionIndex: i })}
            disabled={disabled}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold transition-colors"
            style={{
              borderColor: correctOptionIndex === i ? 'var(--accent-teal)' : 'var(--border)',
              background: correctOptionIndex === i ? 'rgba(0, 201, 167, 0.15)' : 'transparent',
              color: correctOptionIndex === i ? 'var(--accent-teal)' : 'var(--text-muted)',
            }}
            title={correctOptionIndex === i ? 'Correct answer' : 'Mark as correct'}
            aria-label={`Mark option ${opt.label} as correct`}
          >
            {opt.label}
          </button>
          <input
            type="text"
            value={opt.text}
            onChange={(e) => updateOptionText(i, e.target.value)}
            disabled={disabled}
            placeholder={`Option ${opt.label} text...`}
            className="flex-1 rounded-lg px-3 py-1.5 text-sm font-body transition-colors focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          {options.length > 2 && (
            <button type="button" onClick={() => removeOption(i)} disabled={disabled} className="text-xs" style={{ color: 'var(--accent-crimson)' }} aria-label={`Remove option ${opt.label}`}>✕</button>
          )}
        </div>
      ))}
      {options.length < 8 && (
        <button
          type="button"
          onClick={addOption}
          disabled={disabled}
          className="font-body text-xs transition-colors"
          style={{ color: 'var(--accent-gold)' }}
        >
          + Add option
        </button>
      )}
      {correctOptionIndex === null && options.length > 0 && (
        <p className="font-body text-xs" style={{ color: 'var(--accent-crimson)' }}>
          Click a letter to mark the correct answer
        </p>
      )}
    </div>
  )
}

// ── Multi-Part Editor ─────────────────────────────────────────────────────────

interface MultiPartEditorProps {
  question: BuilderQuestion
  onChange: (patch: Partial<BuilderQuestion>) => void
  examTemplateId?: string
  allowAnswerImageUpload: boolean
  disabled?: boolean
}

function MultiPartEditor({
  question,
  onChange,
  examTemplateId,
  allowAnswerImageUpload,
  disabled,
}: MultiPartEditorProps) {
  const { subQuestions } = question

  const addSub = () => {
    onChange({ subQuestions: [...subQuestions, createEmptySubQuestion()] })
  }

  const removeSub = (i: number) => {
    onChange({ subQuestions: subQuestions.filter((_, idx) => idx !== i) })
  }

  const updateSub = (i: number, patch: Partial<BuilderSubQuestion>) => {
    const next = [...subQuestions]
    next[i] = { ...next[i], ...patch }
    onChange({ subQuestions: next })
  }

  return (
    <div className="space-y-3">
      <label className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        Sub-Questions
      </label>
      {subQuestions.map((sub, i) => (
        <div key={sub.id} className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs" style={{ color: 'var(--accent-gold)' }}>
              Part {String.fromCharCode(97 + i)}
            </span>
            {subQuestions.length > 1 && (
              <button type="button" onClick={() => removeSub(i)} disabled={disabled} className="text-xs" style={{ color: 'var(--accent-crimson)' }} aria-label={`Remove part ${String.fromCharCode(97 + i)}`}>✕</button>
            )}
          </div>
          <input
            type="text"
            value={sub.prompt}
            onChange={(e) => updateSub(i, { prompt: e.target.value })}
            disabled={disabled}
            placeholder={`Part ${String.fromCharCode(97 + i)} question...`}
            className="w-full rounded-lg px-3 py-1.5 text-sm font-body transition-colors focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-base)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <label className="font-display text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Points</label>
              <input
                type="number"
                min="1"
                value={sub.pointsAvailable}
                onChange={(e) => updateSub(i, { pointsAvailable: Math.max(1, Number(e.target.value) || 1) })}
                disabled={disabled}
                className="w-20 rounded-lg px-2 py-1 text-sm font-mono transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
          <OpenEndedRubricEditor
            rubric={sub.rubric}
            onChange={(rubric) => updateSub(i, { rubric })}
            examTemplateId={examTemplateId}
            allowAnswerImageUpload={allowAnswerImageUpload}
            disabled={disabled}
            compact
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addSub}
        disabled={disabled}
        className="font-body text-xs transition-colors"
        style={{ color: 'var(--accent-gold)' }}
      >
        + Add sub-question
      </button>
    </div>
  )
}

// ── Open-Ended Rubric Editor (also used in multi-part sub-questions) ──────────

interface OpenEndedRubricEditorProps {
  rubric: BuilderQuestion['rubric']
  onChange: (rubric: BuilderQuestion['rubric']) => void
  examTemplateId?: string
  allowAnswerImageUpload: boolean
  disabled?: boolean
  compact?: boolean
}

function OpenEndedRubricEditor({
  rubric,
  onChange,
  examTemplateId,
  allowAnswerImageUpload,
  disabled,
  compact,
}: OpenEndedRubricEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!examTemplateId) {
        // No exam yet — store locally with object URL for preview (will be uploaded on save)
        const objectUrl = URL.createObjectURL(file)
        onChange({ ...rubric, answerImageUrl: objectUrl })
        return
      }

      try {
        const result = await uploadAnswerRubricImage(examTemplateId, file)
        onChange({ ...rubric, answerImageUrl: result.fileUrl })
      } catch {
        // Fallback: use local preview
        const objectUrl = URL.createObjectURL(file)
        onChange({ ...rubric, answerImageUrl: objectUrl })
      }
    },
    [examTemplateId, rubric, onChange],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void handleImageUpload(file)
      e.target.value = ''
    },
    [handleImageUpload],
  )

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="space-y-1">
        <label className="font-display text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Expected Answer
          <span className="ml-1 font-body font-normal" style={{ color: 'var(--text-muted)' }}>
            {allowAnswerImageUpload ? '(text or image)' : '(text)'}
          </span>
        </label>
        <textarea
          value={rubric.answerText}
          onChange={(e) => onChange({ ...rubric, answerText: e.target.value })}
          disabled={disabled}
          placeholder="Type the expected answer..."
          rows={compact ? 1 : 2}
          className="w-full rounded-lg px-3 py-2 text-sm font-body resize-none transition-colors focus:outline-none"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Image upload for handwritten answer key */}
      {allowAnswerImageUpload && (
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,.jpg,.jpeg,.png,.heic"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload answer key image"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="rounded-lg border px-3 py-1.5 font-body text-xs transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            📷 Upload Answer Key Image
          </button>
          {rubric.answerImageUrl && (
            <div className="flex items-center gap-2">
              <img
                src={rubric.answerImageUrl}
                alt="Answer key preview"
                className="h-8 w-8 rounded border object-cover"
                style={{ borderColor: 'var(--border)' }}
              />
              <button
                type="button"
                onClick={() => onChange({ ...rubric, answerImageUrl: '' })}
                disabled={disabled}
                className="text-xs"
                style={{ color: 'var(--accent-crimson)' }}
                aria-label="Remove answer key image"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Acceptable variations + grading notes */}
      {!compact && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-display text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Acceptable Variations
            </label>
            <input
              type="text"
              value={rubric.acceptableVariations}
              onChange={(e) => onChange({ ...rubric, acceptableVariations: e.target.value })}
              disabled={disabled}
              placeholder="e.g., accept ±2%"
              className="w-full rounded-lg px-3 py-1.5 text-sm font-body transition-colors focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="font-display text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Grading Notes
            </label>
            <input
              type="text"
              value={rubric.gradingNotes}
              onChange={(e) => onChange({ ...rubric, gradingNotes: e.target.value })}
              disabled={disabled}
              placeholder="Notes for the AI grader..."
              className="w-full rounded-lg px-3 py-1.5 text-sm font-body transition-colors focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
