import { useState } from 'react'
import type { GradingResultResponse, QuestionScore } from './gradingApi'
import type { SavedScore } from './GradingResultCard'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GradedStudentRecord {
  studentId: string
  studentName: string
  submissionId: string
  result: GradingResultResponse
  parsedQuestions: QuestionScore[]
  savedScores: SavedScore[]
  /** Sum of teacher-adjusted points */
  totalAdjusted: number
  /** Sum of all points available across questions */
  totalAvailable: number
}

type FilterMode = 'all' | 'needs-review' | 'high-confidence'
type SortMode = 'name-asc' | 'score-desc' | 'confidence-desc'

// ── Helpers ───────────────────────────────────────────────────────────────────

function confidencePill(score: number) {
  if (score >= 80)
    return (
      <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-400">
        {score.toFixed(0)}% confident
      </span>
    )
  if (score >= 60)
    return (
      <span className="rounded-full border border-gold-500/25 bg-gold-500/10 px-2 py-0.5 text-xs font-medium text-gold-300">
        {score.toFixed(0)}% confident
      </span>
    )
  return (
    <span className="rounded-full border border-crimson-500/25 bg-crimson-500/10 px-2 py-0.5 text-xs font-medium text-crimson-400">
      {score.toFixed(0)}% confident
    </span>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResultRow({ record }: { record: GradedStudentRecord }) {
  const scoreLabel =
    record.totalAvailable > 0
      ? `${record.totalAdjusted % 1 === 0 ? record.totalAdjusted : record.totalAdjusted.toFixed(1)} / ${record.totalAvailable}`
      : '—'

  return (
    <div
      role="row"
      className="grid gap-3 rounded-2xl border border-subtle bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.05] sm:grid-cols-[minmax(0,1.4fr)_auto_auto_auto] sm:items-center"
    >
      <span className="min-w-0 truncate font-display text-sm font-semibold text-pri" role="cell" title={record.studentName}>
        {record.studentName}
      </span>

      <span className="font-mono text-sm font-semibold text-gold-300" role="cell">
        {scoreLabel}
      </span>

      <span role="cell">{confidencePill(record.result.confidenceScore)}</span>

      {record.result.needsReview && (
        <span
          role="cell"
          className="rounded-full border border-crimson-500/25 bg-crimson-500/10 px-2 py-0.5 text-xs font-medium text-crimson-400"
        >
          Needs Review
        </span>
      )}
    </div>
  )
}

function FilterTab({
  label,
  active,
  count,
  onClick,
}: {
  label: string
  active: boolean
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border border-gold-500/30 bg-gold-500/10 text-gold-300'
          : 'border border-subtle bg-white/[0.03] text-sec hover:bg-white/[0.05]',
      ].join(' ')}
    >
      {label}
      <span
        className={[
          'rounded-full px-1.5 py-0.5 text-xs',
          active ? 'bg-gold-500/20 text-gold-200' : 'bg-white/[0.06] text-mut',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GradingResultsList({ records }: { records: GradedStudentRecord[] }) {
  const [filter, setFilter] = useState<FilterMode>('all')
  const [sort, setSort] = useState<SortMode>('name-asc')

  const needsReviewCount = records.filter((r) => r.result.needsReview).length
  const highConfidenceCount = records.filter((r) => r.result.confidenceScore >= 80).length

  const filtered = records.filter((r) => {
    if (filter === 'needs-review') return r.result.needsReview
    if (filter === 'high-confidence') return r.result.confidenceScore >= 80
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'name-asc') return a.studentName.localeCompare(b.studentName)
    if (sort === 'score-desc') {
      const aRatio = a.totalAvailable > 0 ? a.totalAdjusted / a.totalAvailable : 0
      const bRatio = b.totalAvailable > 0 ? b.totalAdjusted / b.totalAvailable : 0
      return bRatio - aRatio
    }
    if (sort === 'confidence-desc') {
      return b.result.confidenceScore - a.result.confidenceScore
    }
    return 0
  })

  return (
    <section
      aria-label={`Graded results (${records.length} student${records.length !== 1 ? 's' : ''})`}
      className="surface-panel-plain rounded-[24px] p-5 space-y-4 sm:p-6"
    >
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="font-display text-sm font-semibold text-pri">
          Graded Results{' '}
          <span className="font-body font-normal text-mut">({records.length})</span>
        </p>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label htmlFor="results-sort" className="flex-shrink-0 font-body text-xs text-mut">
            Sort by
          </label>
          <select
            id="results-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="rounded-lg border border-subtle bg-elevated px-2 py-1 text-xs text-pri focus:outline-none focus:ring-2 focus:ring-gold-500/40"
          >
            <option value="name-asc">Student name</option>
            <option value="score-desc">Score (highest)</option>
            <option value="confidence-desc">Confidence (highest)</option>
          </select>
        </div>
      </div>

      {/* Filter tabs */}
      <div role="group" aria-label="Filter results" className="flex items-center gap-2 flex-wrap">
        <FilterTab
          label="All"
          active={filter === 'all'}
          count={records.length}
          onClick={() => setFilter('all')}
        />
        <FilterTab
          label="Needs Review"
          active={filter === 'needs-review'}
          count={needsReviewCount}
          onClick={() => setFilter('needs-review')}
        />
        <FilterTab
          label="High Confidence"
          active={filter === 'high-confidence'}
          count={highConfidenceCount}
          onClick={() => setFilter('high-confidence')}
        />
      </div>

      {/* Results */}
      {sorted.length === 0 ? (
        <p className="py-6 text-center font-body text-sm text-sec">
          No results match the selected filter.
        </p>
      ) : (
        <div role="table" aria-label="Graded student results" className="space-y-2">
          {sorted.map((record) => (
            <ResultRow key={record.studentId} record={record} />
          ))}
        </div>
      )}
    </section>
  )
}
