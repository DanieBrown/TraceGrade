import { useState } from 'react'
import type { GradingResultResponse, QuestionScore } from '../grading/gradingApi'
import { submitReview } from './reviewApi'

// ── Confidence helpers (mirrored from GradingResultCard) ──────────────────────

function confidenceClasses(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'text-green-700', bg: 'bg-green-50 border-green-200' }
  if (score >= 60) return { text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' }
  return { text: 'text-red-700', bg: 'bg-red-50 border-red-200' }
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function QuestionRow({
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
  const headingId = `rq-heading-${q.questionNumber}`
  const panelId = `rq-panel-${q.questionNumber}`

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

        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls.bg} ${cls.text}`}>
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
              htmlFor={`rq-adj-${q.questionNumber}`}
              className="text-xs font-semibold text-gray-600 flex-shrink-0"
            >
              Manual Adjustment
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id={`rq-adj-${q.questionNumber}`}
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

// ── Submission image panel ─────────────────────────────────────────────────────

function SubmissionImage({ url }: { url?: string | null }) {
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-48 bg-gray-100 rounded-lg border border-gray-200 text-gray-400 gap-2 p-6">
        <span className="text-3xl" aria-hidden="true">🖼</span>
        <p className="text-xs text-center">Submission image unavailable</p>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt="Student submission"
      className="w-full rounded-lg border border-gray-200 object-contain max-h-[600px]"
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ReviewQueueItem({
  result,
  onReviewed,
}: {
  result: GradingResultResponse
  onReviewed: (updated: GradingResultResponse) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedQuestions: QuestionScore[] = (() => {
    try {
      return JSON.parse(result.questionScores) as QuestionScore[]
    } catch {
      return []
    }
  })()

  const [adjustments, setAdjustments] = useState<Record<number, number>>(
    () => Object.fromEntries(parsedQuestions.map((q) => [q.questionNumber, q.pointsAwarded])),
  )

  function handleAdjust(questionNumber: number, points: number) {
    setAdjustments((prev) => ({ ...prev, [questionNumber]: points }))
  }

  async function handleApprove() {
    setSaving(true)
    setError(null)
    try {
      const updated = await submitReview(String(result.gradeId), {
        finalScore: result.aiScore,
        teacherOverride: false,
      })
      setReviewed(true)
      setExpanded(false)
      onReviewed(updated)
    } catch {
      setError('Failed to save approval. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAdjustments() {
    setSaving(true)
    setError(null)

    const totalAdjusted = parsedQuestions.reduce(
      (sum, q) => sum + (adjustments[q.questionNumber] ?? q.pointsAwarded),
      0,
    )
    const totalAvailable = parsedQuestions.reduce((sum, q) => sum + q.pointsAvailable, 0)
    const finalScore = totalAvailable > 0 ? (totalAdjusted / totalAvailable) * 100 : 0

    const updatedQuestions = parsedQuestions.map((q) => ({
      ...q,
      pointsAwarded: adjustments[q.questionNumber] ?? q.pointsAwarded,
    }))

    try {
      const updated = await submitReview(String(result.gradeId), {
        finalScore,
        teacherOverride: true,
        questionScores: JSON.stringify(updatedQuestions),
      })
      setReviewed(true)
      setExpanded(false)
      onReviewed(updated)
    } catch {
      setError('Failed to save adjustments. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const confidenceScore = Number(result.confidenceScore)
  const cls = confidenceClasses(confidenceScore)
  const totalAiPoints = parsedQuestions.reduce((s, q) => s + q.pointsAwarded, 0)
  const totalAvailable = parsedQuestions.reduce((s, q) => s + q.pointsAvailable, 0)

  return (
    <li className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* ── Collapsed row ── */}
      <button
        onClick={() => !reviewed && setExpanded((v) => !v)}
        disabled={reviewed}
        className={[
          'w-full flex items-center gap-4 px-5 py-4 text-left transition-colors',
          reviewed ? 'cursor-default' : 'hover:bg-gray-50',
        ].join(' ')}
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            Submission {String(result.submissionId).slice(0, 8)}…
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            AI score: {formatScore(totalAiPoints)} / {totalAvailable} pts
          </p>
        </div>

        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${cls.bg} ${cls.text}`}>
          {formatScore(confidenceScore)}% confidence
        </span>

        {reviewed ? (
          <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full flex-shrink-0">
            Reviewed ✓
          </span>
        ) : (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex-shrink-0">
            Needs Review
          </span>
        )}

        {!reviewed && (
          <span className="text-gray-400 text-xs" aria-hidden="true">
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </button>

      {/* ── Expanded side-by-side panel ── */}
      {expanded && (
        <div className="border-t border-gray-200">
          {error && (
            <div role="alert" className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-5">
            {/* Left: student submission image */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Student Submission
              </p>
              <SubmissionImage url={result.submissionImageUrl} />
            </div>

            {/* Centre: question breakdown with adjustments */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Question Breakdown
              </p>
              {parsedQuestions.length === 0 ? (
                <p className="text-sm text-gray-500">No question data available.</p>
              ) : (
                <div className="space-y-2">
                  {parsedQuestions.map((q) => (
                    <QuestionRow
                      key={q.questionNumber}
                      q={q}
                      adjustedPoints={adjustments[q.questionNumber] ?? q.pointsAwarded}
                      onAdjust={handleAdjust}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right: summary + actions */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  AI Grade Summary
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">AI Score</span>
                    <span className="font-semibold text-gray-900">
                      {formatScore(totalAiPoints)} / {totalAvailable}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Confidence</span>
                    <span className={`font-semibold ${cls.text}`}>
                      {formatScore(confidenceScore)}%
                    </span>
                  </div>
                  {result.aiFeedback && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">AI Feedback</p>
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                        {result.aiFeedback}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Review Actions
                </p>
                <button
                  onClick={handleApprove}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Approve AI Grade'}
                </button>
                <button
                  onClick={handleSaveAdjustments}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Save with Adjustments'}
                </button>
                <button
                  onClick={() => setExpanded(false)}
                  disabled={saving}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}
