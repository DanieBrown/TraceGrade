import { useState } from 'react'
import { toast } from 'sonner'
import type { GradingResultResponse, QuestionScore } from '../grading/gradingApi'
import { submitReview } from './reviewApi'

// ── Confidence helpers (mirrored from GradingResultCard) ──────────────────────

function confidenceClasses(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/25' }
  if (score >= 60) return { text: 'text-gold-300', bg: 'bg-gold-500/10 border-gold-500/25' }
  return { text: 'text-crimson-400', bg: 'bg-crimson-500/10 border-crimson-500/25' }
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
    <div className="overflow-hidden rounded-2xl border border-subtle bg-white/[0.03]">
      <button
        id={headingId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-sm font-semibold text-gray-700 w-7 flex-shrink-0">
          Q{q.questionNumber}
        </span>

        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cls.bg} ${cls.text}`}>
          {formatScore(q.confidenceScore)}% confident
        </span>

        {q.illegible && (
          <span className="rounded-full border border-crimson-500/25 bg-crimson-500/10 px-2 py-0.5 text-xs font-medium text-crimson-400">
            Illegible
          </span>
        )}

        <span className="ml-auto text-sm font-semibold text-pri">
          {formatScore(adjustedPoints)} / {formatScore(q.pointsAvailable)}
        </span>

        <span className="ml-1 text-xs text-mut" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
        </div>
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headingId}
          className="space-y-3 border-t border-subtle bg-white/[0.02] px-4 py-3"
        >
          {q.feedback && (
            <div>
              <p className="mb-1 text-xs font-semibold text-sec">AI Feedback</p>
              <p className="text-xs leading-relaxed text-sec">{q.feedback}</p>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <label
              htmlFor={`rq-adj-${q.questionNumber}`}
              className="flex-shrink-0 text-xs font-semibold text-sec"
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
                className="w-16 rounded-lg border border-subtle bg-elevated px-2 py-1 text-center text-sm text-pri focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                aria-label={`Adjusted points for question ${q.questionNumber}`}
              />
              <span className="text-xs text-mut">/ {formatScore(q.pointsAvailable)} pts</span>
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
      <div className="flex min-h-48 h-full flex-col items-center justify-center gap-2 rounded-2xl border border-subtle bg-white/[0.03] p-6 text-mut">
        <span className="text-3xl" aria-hidden="true">🖼</span>
        <p className="text-xs text-center">Submission image unavailable</p>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt="Student submission"
      className="max-h-[520px] w-full rounded-2xl border border-subtle object-contain bg-white/[0.02]"
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
      toast.success('AI grade approved.')
      onReviewed(updated)
    } catch {
      toast.error('Unable to save approval.')
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
      toast.success('Review adjustments saved.')
      onReviewed(updated)
    } catch {
      toast.error('Unable to save adjustments.')
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
    <li className="overflow-hidden rounded-[20px] border border-subtle bg-white/[0.02]">
      {/* ── Collapsed row ── */}
      <button
        onClick={() => !reviewed && setExpanded((v) => !v)}
        disabled={reviewed}
        className={[
          'w-full px-4 py-4 text-left transition-colors sm:px-5',
          reviewed ? 'cursor-default' : 'hover:bg-white/[0.04]',
        ].join(' ')}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-pri">
            Submission {String(result.submissionId).slice(0, 8)}…
          </p>
          <p className="mt-0.5 text-xs text-mut">
            AI score: {formatScore(totalAiPoints)} / {totalAvailable} pts
          </p>
        </div>

        <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${cls.bg} ${cls.text}`}>
          {formatScore(confidenceScore)}% confidence
        </span>

        {reviewed ? (
          <span className="flex-shrink-0 rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-400">
            Reviewed ✓
          </span>
        ) : (
          <span className="flex-shrink-0 rounded-full border border-gold-500/25 bg-gold-500/10 px-2.5 py-1 text-xs font-medium text-gold-300">
            Needs Review
          </span>
        )}

        {!reviewed && (
          <span className="text-xs text-mut" aria-hidden="true">
            {expanded ? '▲' : '▼'}
          </span>
        )}
        </div>
      </button>

      {/* ── Expanded side-by-side panel ── */}
      {expanded && (
        <div className="border-t border-subtle bg-base/40">
          {error && (
            <div role="alert" className="mx-5 mt-4 rounded-xl border border-crimson-500/30 bg-crimson-500/10 p-3 text-sm text-crimson-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[1.1fr_1.15fr_0.9fr] lg:p-5">
            {/* Left: student submission image */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mut">
                Student Submission
              </p>
              <SubmissionImage url={result.submissionImageUrl} />
            </div>

            {/* Centre: question breakdown with adjustments */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mut">
                Question Breakdown
              </p>
              {parsedQuestions.length === 0 ? (
                <p className="text-sm text-sec">No question data available.</p>
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mut">
                  AI Grade Summary
                </p>
                <div className="space-y-2 rounded-2xl border border-subtle bg-white/[0.03] p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-sec">AI Score</span>
                    <span className="font-semibold text-pri">
                      {formatScore(totalAiPoints)} / {totalAvailable}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-sec">Confidence</span>
                    <span className={`font-semibold ${cls.text}`}>
                      {formatScore(confidenceScore)}%
                    </span>
                  </div>
                  {result.aiFeedback && (
                    <div className="border-t border-subtle pt-2">
                      <p className="mb-1 text-xs font-semibold text-sec">AI Feedback</p>
                      <p className="whitespace-pre-line text-xs leading-relaxed text-sec">
                        {result.aiFeedback}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-mut">
                  Review Actions
                </p>
                <button
                  onClick={handleApprove}
                  disabled={saving}
                  className="w-full rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-medium text-navy-950 transition-colors hover:bg-gold-600 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Approve AI Grade'}
                </button>
                <button
                  onClick={handleSaveAdjustments}
                  disabled={saving}
                  className="w-full rounded-xl border border-subtle bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-pri transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save with Adjustments'}
                </button>
                <button
                  onClick={() => setExpanded(false)}
                  disabled={saving}
                  className="w-full rounded-xl border border-subtle bg-transparent px-4 py-2.5 text-sm text-sec transition-colors hover:bg-white/[0.04]"
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
