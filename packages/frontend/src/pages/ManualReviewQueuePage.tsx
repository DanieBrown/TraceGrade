import { useEffect, useState } from 'react'
import type { GradingResultResponse } from '../features/grading/gradingApi'
import { fetchPendingReviews } from '../features/review/reviewApi'
import ReviewQueueItem from '../features/review/ReviewQueueItem'

type LoadState = 'loading' | 'error' | 'done'

export default function ManualReviewQueuePage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [items, setItems] = useState<GradingResultResponse[]>([])
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPendingReviews()
      .then((data) => {
        setItems(data)
        setLoadState('done')
      })
      .catch(() => setLoadState('error'))
  }, [])

  function handleReviewed(updated: GradingResultResponse) {
    const id = String(updated.gradeId)
    setReviewedIds((prev) => new Set([...prev, id]))
    setItems((prev) => prev.map((item) => (String(item.gradeId) === id ? updated : item)))
  }

  const pendingCount = items.filter((item) => !reviewedIds.has(String(item.gradeId))).length

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Manual Review Queue
          {loadState === 'done' && (
            <span className="ml-3 text-lg font-normal text-gray-500">
              ({pendingCount} pending)
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Submissions where AI confidence was below the threshold. Review each and approve or
          adjust before grades are finalised.
        </p>
      </div>

      {/* Loading */}
      {loadState === 'loading' && (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span className="text-sm">Loading review queue…</span>
        </div>
      )}

      {/* Error */}
      {loadState === 'error' && (
        <div
          role="alert"
          className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-5"
        >
          <span className="text-red-500 text-lg flex-shrink-0" aria-hidden="true">✕</span>
          <div>
            <p className="text-sm font-semibold text-red-800">Failed to load review queue</p>
            <p className="text-xs text-red-700 mt-0.5">
              Check your connection and refresh the page to try again.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {loadState === 'done' && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 text-2xl font-bold" aria-hidden="true">✓</span>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">Queue is clear</p>
            <p className="text-sm text-gray-500 mt-1">
              No submissions are currently awaiting manual review.
            </p>
          </div>
        </div>
      )}

      {/* Queue list */}
      {loadState === 'done' && items.length > 0 && (
        <ol className="space-y-3" aria-label="Manual review queue">
          {items.map((item) => (
            <ReviewQueueItem
              key={String(item.gradeId)}
              result={item}
              onReviewed={handleReviewed}
            />
          ))}
        </ol>
      )}
    </div>
  )
}
