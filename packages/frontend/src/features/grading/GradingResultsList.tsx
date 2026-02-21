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
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
        {score.toFixed(0)}% confident
      </span>
    )
  if (score >= 60)
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        {score.toFixed(0)}% confident
      </span>
    )
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
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
      className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors flex-wrap"
    >
      <span className="text-sm font-medium text-gray-900 min-w-24 flex-shrink-0" role="cell">
        {record.studentName}
      </span>

      <span className="text-sm font-semibold text-gray-800 flex-shrink-0" role="cell">
        {scoreLabel}
      </span>

      <span role="cell">{confidencePill(record.result.confidenceScore)}</span>

      {record.result.needsReview && (
        <span
          role="cell"
          className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
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
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
      ].join(' ')}
    >
      {label}
      <span
        className={[
          'px-1.5 py-0.5 rounded-full text-xs',
          active ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500',
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
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4"
    >
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm font-semibold text-gray-800">
          Graded Results{' '}
          <span className="font-normal text-gray-500">({records.length})</span>
        </p>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label htmlFor="results-sort" className="text-xs text-gray-500 flex-shrink-0">
            Sort by
          </label>
          <select
            id="results-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <p className="text-sm text-gray-500 text-center py-6">
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
