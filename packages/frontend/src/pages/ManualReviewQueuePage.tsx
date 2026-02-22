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
    <div style={{ padding: '40px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p
          className="font-mono"
          style={{
            fontSize: '10px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '6px',
          }}
        >
          AI Confidence Review
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Manual Review Queue
              {loadState === 'done' && pendingCount > 0 && (
                <span
                  className="font-mono pulse-soft"
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    marginLeft: '12px',
                    padding: '3px 10px',
                    borderRadius: '99px',
                    color: 'var(--accent-gold)',
                    background: 'rgba(232, 164, 40, 0.12)',
                    border: '1px solid rgba(232, 164, 40, 0.28)',
                    verticalAlign: 'middle',
                  }}
                >
                  {pendingCount} pending
                </span>
              )}
            </h1>
            <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
              Submissions where AI confidence was below 95%. Review each one and approve or
              adjust before grades are finalised.
            </p>
          </div>
        </div>
      </div>

      {/* Info bar */}
      {loadState === 'done' && items.length > 0 && (
        <div
          className="rounded-xl p-4 flex items-center gap-4"
          style={{
            background: 'rgba(232, 164, 40, 0.06)',
            border: '1px solid rgba(232, 164, 40, 0.18)',
            marginBottom: '24px',
          }}
        >
          <span style={{ color: 'var(--accent-gold)', fontSize: '18px' }}>⚑</span>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {pendingCount} submission{pendingCount !== 1 ? 's' : ''} need your review
            </p>
            <p className="font-body text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              AI graded these but flagged them due to low confidence. Your approval finalises the grade.
            </p>
          </div>
          <span
            className="font-mono"
            style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}
          >
            {reviewedIds.size} reviewed
          </span>
        </div>
      )}

      {/* Loading */}
      {loadState === 'loading' && (
        <div
          className="flex items-center justify-center py-24 gap-3"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="font-display text-sm">Loading review queue…</span>
        </div>
      )}

      {/* Error */}
      {loadState === 'error' && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl p-5"
          style={{
            background: 'rgba(232, 69, 90, 0.08)',
            border: '1px solid rgba(232, 69, 90, 0.22)',
          }}
        >
          <span style={{ color: 'var(--accent-crimson)', fontSize: '18px', flexShrink: 0 }} aria-hidden="true">✕</span>
          <div>
            <p className="font-display font-semibold text-sm" style={{ color: 'var(--accent-crimson)' }}>
              Failed to load review queue
            </p>
            <p className="font-body text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Check your connection and refresh the page to try again.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {loadState === 'done' && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-28 text-center gap-5">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
            style={{
              background: 'rgba(0, 201, 167, 0.1)',
              border: '1px solid rgba(0, 201, 167, 0.22)',
              color: 'var(--accent-teal)',
            }}
            aria-hidden="true"
          >
            ✓
          </div>
          <div>
            <p className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Queue is clear
            </p>
            <p className="font-body text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
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
