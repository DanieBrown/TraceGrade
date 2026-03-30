import { useState } from 'react'
import type { GradingResultResponse, QuestionScore } from './gradingApi'

// ── Confidence helpers ────────────────────────────────────────────────────────

function confidenceClasses(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/25' }
  if (score >= 60) return { text: 'text-gold-300', bg: 'bg-gold-500/10 border-gold-500/25' }
  return { text: 'text-crimson-400', bg: 'bg-crimson-500/10 border-crimson-500/25' }
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NeedsReviewBanner() {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-gold-500/25 bg-gold-500/10 p-4">
      <span className="text-gold-300 text-lg flex-shrink-0" aria-hidden="true">⚠</span>
      <div>
        <p className="text-sm font-semibold text-gold-300">Manual Review Required</p>
        <p className="mt-0.5 text-xs text-sec">
          One or more questions had a confidence score below threshold or contained illegible
          handwriting. Please review the results below before finalising the grade.
        </p>
      </div>
    </div>
  )
}

function GradingCompleteHeader({
  result,
  parsedQuestions,
}: {
  result: Pick<GradingResultResponse, 'status' | 'processingTimeMs'>
  parsedQuestions: QuestionScore[]
}) {
  const failed = result.status === 'FAILED'
  const totalAwarded = parsedQuestions.reduce((s, q) => s + q.pointsAwarded, 0)
  const totalAvailable = parsedQuestions.reduce((s, q) => s + q.pointsAvailable, 0)
  const percentage =
    !failed && totalAvailable > 0
      ? ((totalAwarded / totalAvailable) * 100).toFixed(1)
      : null

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-subtle bg-white/[0.03] p-4">
      <div className="space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-mut">
          AI Grading Complete
        </p>
        <p className="text-3xl font-bold text-white" aria-label={`Score: ${failed ? 'failed' : `${formatScore(totalAwarded)} out of ${totalAvailable}`}`}>
          {failed ? '—' : formatScore(totalAwarded)}
          <span className="text-lg font-normal text-mut"> / {totalAvailable}</span>
        </p>
        {percentage !== null && (
          <p className="text-sm text-sec">{percentage}%</p>
        )}
      </div>
      {!failed && (
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-500/12"
          aria-label="Grading successful"
        >
          <span className="text-teal-400 text-xl font-bold" aria-hidden="true">✓</span>
        </div>
      )}
    </div>
  )
}

function AccordionQuestionRow({
  q,
  adjustedPoints,
  onAdjust,
}: {
  q: QuestionScore
  adjustedPoints: number
  onAdjust: (questionNumber: number, points: number) => void
}) {
  const [open, setOpen] = useState(false)
  const cls = confidenceClasses(q.confidenceScore)
  const headingId = `q-heading-${q.questionNumber}`
  const panelId = `q-panel-${q.questionNumber}`

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        id={headingId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-700 w-7 flex-shrink-0">
          Q{q.questionNumber}
        </span>

        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls.bg} ${cls.text}`}
        >
          {formatScore(q.confidenceScore)}% confident
        </span>

        {q.illegible && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
            Illegible
          </span>
        )}

        <span className="ml-auto text-sm font-semibold text-gray-900">
          {formatScore(adjustedPoints)} / {formatScore(q.pointsAvailable)}
        </span>

        <span className="text-gray-400 text-xs ml-1" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headingId}
          className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-3"
        >
          {q.feedback && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">AI Feedback</p>
              <p className="text-xs text-gray-700 leading-relaxed">{q.feedback}</p>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <label
              htmlFor={`adj-${q.questionNumber}`}
              className="text-xs font-semibold text-gray-600 flex-shrink-0"
            >
              Manual Adjustment
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id={`adj-${q.questionNumber}`}
                type="number"
                min={0}
                max={q.pointsAvailable}
                step={0.5}
                value={adjustedPoints}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val)) {
                    onAdjust(q.questionNumber, Math.min(Math.max(val, 0), q.pointsAvailable))
                  }
                }}
                className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label={`Adjusted points for question ${q.questionNumber}`}
              />
              <span className="text-xs text-gray-500">/ {formatScore(q.pointsAvailable)} pts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface SavedScore {
  questionNumber: number
  adjustedPoints: number
}

export default function GradingResultCard({
  result,
  parsedQuestions,
  studentName,
  onSave,
  onCancel,
}: {
  result: GradingResultResponse
  parsedQuestions: QuestionScore[]
  studentName: string
  onSave: (scores: SavedScore[]) => void
  onCancel: () => void
}) {
  // Initialise adjustments from AI-graded scores
  const [adjustments, setAdjustments] = useState<Record<number, number>>(
    () => Object.fromEntries(parsedQuestions.map((q) => [q.questionNumber, q.pointsAwarded])),
  )

  function handleAdjust(questionNumber: number, points: number) {
    setAdjustments((prev) => ({ ...prev, [questionNumber]: points }))
  }

  function handleSave() {
    onSave(
      parsedQuestions.map((q) => ({
        questionNumber: q.questionNumber,
        adjustedPoints: adjustments[q.questionNumber] ?? q.pointsAwarded,
      })),
    )
  }

  return (
    <section aria-label={`Grading results for ${studentName}`} className="space-y-4">
      {result.needsReview && <NeedsReviewBanner />}

      <GradingCompleteHeader result={result} parsedQuestions={parsedQuestions} />

      {parsedQuestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-sec" id="question-breakdown-label">
            Question Breakdown
          </p>
          <div
            className="space-y-2"
            role="list"
            aria-labelledby="question-breakdown-label"
          >
            {parsedQuestions.map((q) => (
              <div key={q.questionNumber} role="listitem">
                <AccordionQuestionRow
                  q={q}
                  adjustedPoints={adjustments[q.questionNumber] ?? q.pointsAwarded}
                  onAdjust={handleAdjust}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-medium text-navy-950 transition-colors hover:bg-gold-600"
        >
          Save Grades for {studentName}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-subtle bg-white/[0.05] px-4 py-2.5 text-sm text-sec transition-colors hover:bg-white/[0.08]"
        >
          Cancel
        </button>
      </div>
    </section>
  )
}
