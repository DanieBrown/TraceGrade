import { useState } from 'react'
import type { GradingResultResponse, QuestionScore } from './gradingApi'

// ── Confidence helpers ────────────────────────────────────────────────────────

function confidenceClasses(score: number): { bar: string; text: string; bg: string } {
  if (score >= 95) return { bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-100' }
  if (score >= 75) return { bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-100' }
  return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-100' }
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NeedsReviewBanner() {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
      <span className="text-amber-500 text-lg flex-shrink-0">⚠</span>
      <div>
        <p className="text-sm font-semibold text-amber-800">Manual Review Required</p>
        <p className="text-xs text-amber-700 mt-0.5">
          One or more questions had a confidence score below threshold or contained illegible
          handwriting. Please review the results below before finalising the grade.
        </p>
      </div>
    </div>
  )
}

function ScoreSummary({
  result,
}: {
  result: Pick<GradingResultResponse, 'status' | 'finalScore' | 'aiScore' | 'processingTimeMs'>
}) {
  const failed = result.status === 'FAILED'
  return (
    <div className="bg-indigo-50 rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">AI Score</p>
        <p className="text-3xl font-bold text-indigo-900">
          {failed ? '—' : `${formatScore(result.finalScore)}`}
          <span className="text-base font-normal text-indigo-600"> / 100</span>
        </p>
      </div>
      <div className="text-right space-y-0.5">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Processed in</p>
        <p className="text-sm font-semibold text-gray-700">
          {result.processingTimeMs < 1000
            ? `${result.processingTimeMs} ms`
            : `${(result.processingTimeMs / 1000).toFixed(1)} s`}
        </p>
      </div>
    </div>
  )
}

function ConfidenceMeter({ score }: { score: number }) {
  const cls = confidenceClasses(score)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">AI Confidence</span>
        <span className={`font-semibold ${cls.text}`}>{formatScore(score)}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`${cls.bar} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  )
}

function QuestionScoreRow({ q }: { q: QuestionScore }) {
  const cls = confidenceClasses(q.confidenceScore)
  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
          Q{q.questionNumber}
        </span>
        <span className="text-xs font-medium text-gray-800">
          {formatScore(q.pointsAwarded)} / {formatScore(q.pointsAvailable)} pts
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls.bg} ${cls.text}`}>
          {formatScore(q.confidenceScore)}% confidence
        </span>
        {q.illegible && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            Illegible
          </span>
        )}
      </div>
      {q.feedback && (
        <p className="text-xs text-gray-600 leading-relaxed">{q.feedback}</p>
      )}
    </div>
  )
}

function QuestionBreakdownList({ questions }: { questions: QuestionScore[] }) {
  if (questions.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Per-Question Breakdown</p>
      <div className="space-y-2">
        {questions.map((q) => (
          <QuestionScoreRow key={q.questionNumber} q={q} />
        ))}
      </div>
    </div>
  )
}

function AiFeedbackSection({ feedback }: { feedback: string }) {
  const [open, setOpen] = useState(false)
  if (!feedback) return null
  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <span>{open ? '▾' : '▸'}</span>
        AI Feedback
      </button>
      {open && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{feedback}</p>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GradingResultCard({
  result,
  parsedQuestions,
}: {
  result: GradingResultResponse
  parsedQuestions: QuestionScore[]
}) {
  return (
    <div className="space-y-4">
      {result.needsReview && <NeedsReviewBanner />}
      <ScoreSummary result={result} />
      <ConfidenceMeter score={result.confidenceScore} />
      <QuestionBreakdownList questions={parsedQuestions} />
      <AiFeedbackSection feedback={result.aiFeedback} />
    </div>
  )
}
