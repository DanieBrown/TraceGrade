import { Link } from 'react-router-dom'
import type { GradingResultResponse, QuestionScore } from '../grading/gradingApi'

// ── Confidence helpers (mirrored from GradingResultCard) ──────────────────────

function confidenceClasses(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/25' }
  if (score >= 60) return { text: 'text-gold-300', bg: 'bg-gold-500/10 border-gold-500/25' }
  return { text: 'text-crimson-400', bg: 'bg-crimson-500/10 border-crimson-500/25' }
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ReviewQueueItem({
  result,
  onReviewed,
}: {
  result: GradingResultResponse
  onReviewed: (updated: GradingResultResponse) => void
}) {
  const parsedQuestions: QuestionScore[] = (() => {
    try {
      return JSON.parse(result.questionScores) as QuestionScore[]
    } catch {
      return []
    }
  })()

  const confidenceScore = Number(result.confidenceScore)
  const cls = confidenceClasses(confidenceScore)
  const totalAiPoints = parsedQuestions.reduce((s, q) => s + q.pointsAwarded, 0)
  const totalAvailable = parsedQuestions.reduce((s, q) => s + q.pointsAvailable, 0)
  const lowConfidenceQuestions = parsedQuestions.filter((question) => question.confidenceScore < 80 || question.illegible).length

  void onReviewed

  return (
    <li className="overflow-hidden rounded-[20px] border border-subtle bg-white/[0.02]">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-pri">
            Submission {String(result.submissionId).slice(0, 8)}…
          </p>
          <p className="mt-0.5 text-xs text-mut">
            AI score: {formatScore(totalAiPoints)} / {formatScore(totalAvailable)} pts
          </p>
          <p className="mt-1 text-xs text-sec">
            {lowConfidenceQuestions > 0
              ? `${lowConfidenceQuestions} question${lowConfidenceQuestions === 1 ? '' : 's'} need closer manual scoring.`
              : 'Review the AI rationale before finalising the score.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${cls.bg} ${cls.text}`}>
            {formatScore(confidenceScore)}% confidence
          </span>

          <span className="flex-shrink-0 rounded-full border border-gold-500/25 bg-gold-500/10 px-2.5 py-1 text-xs font-medium text-gold-300">
            Needs Review
          </span>

          <Link
            to={`/review/${encodeURIComponent(String(result.gradeId))}`}
            className="inline-flex items-center rounded-xl bg-gold-500 px-4 py-2 text-sm font-display font-semibold text-navy-950 transition-colors hover:bg-gold-600"
          >
            Open Manual Grading
          </Link>
        </div>
      </div>
    </li>
  )
}
