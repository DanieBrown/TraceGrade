import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { GradingResultResponse } from '../features/grading/gradingApi'
import { getTeacherThreshold } from '../features/settings/settingsApi'
import { fetchPendingReviews } from '../features/review/reviewApi'
import ReviewQueueItem from '../features/review/ReviewQueueItem'
import { AppNotice, AppPage, AppPageHeader, AppPanel } from '../components/layout/AppPage'

type LoadState = 'loading' | 'error' | 'done'

function formatThresholdPercent(threshold: number): string {
  const percentValue = threshold * 100
  const rounded = Number.isInteger(percentValue)
    ? String(percentValue)
    : percentValue.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')

  return `${rounded}%`
}

export default function ManualReviewQueuePage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [items, setItems] = useState<GradingResultResponse[]>([])
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [thresholdLabel, setThresholdLabel] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingReviews()
      .then((data) => {
        setItems(data)
        setLoadState('done')
      })
      .catch(() => setLoadState('error'))
  }, [])

  useEffect(() => {
    let isMounted = true

    getTeacherThreshold()
      .then((threshold) => {
        if (!isMounted || !threshold) {
          return
        }

        setThresholdLabel(formatThresholdPercent(threshold.effectiveThreshold))
      })
      .catch(() => {
        if (!isMounted) {
          return
        }

        setThresholdLabel(null)
      })

    return () => {
      isMounted = false
    }
  }, [])

  function handleReviewed(updated: GradingResultResponse) {
    const id = String(updated.gradeId)
    setReviewedIds((prev) => new Set([...prev, id]))
    setItems((prev) => prev.map((item) => (String(item.gradeId) === id ? updated : item)))
  }

  const pendingCount = items.filter((item) => !reviewedIds.has(String(item.gradeId))).length

  return (
    <AppPage width="standard">
      <AppPageHeader
        title="Manual Review Queue"
        description={`Review submissions that fell below ${thresholdLabel ?? 'your current'} confidence threshold before finalising grades.`}
      />

      {loadState === 'done' && items.length > 0 && (
        <AppNotice>
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent bg-gold-500/10 text-gold-400">⚑</span>
            <div className="flex-1">
            <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {pendingCount} submission{pendingCount !== 1 ? 's' : ''} need your review
            </p>
            <p className="font-body text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              AI graded these but flagged them due to low confidence. Your approval finalises the grade.
            </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">Reviewed</p>
              <p className="mt-1 font-display text-lg text-white">{reviewedIds.size}</p>
            </div>
          </div>
          <p className="mt-3 font-body text-sm text-sec">
            Need to change the threshold? <Link to="/settings" className="font-semibold text-gold-300 no-underline hover:text-gold-200">Open Settings</Link>.
          </p>
        </AppNotice>
      )}

      {loadState === 'loading' && (
        <AppPanel className="py-16">
          <div className="flex items-center justify-center gap-3" style={{ color: 'var(--text-muted)' }}>
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
        </AppPanel>
      )}

      {loadState === 'error' && (
        <AppNotice tone="danger">
          <div className="flex items-start gap-3">
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
        </AppNotice>
      )}

      {loadState === 'done' && items.length === 0 && (
        <AppPanel className="py-20">
          <div className="flex flex-col items-center justify-center text-center gap-5">
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
        </AppPanel>
      )}

      {loadState === 'done' && items.length > 0 && (
        <AppPanel className="p-4 sm:p-5">
          <ol className="space-y-3" aria-label="Manual review queue">
          {items.map((item) => (
            <ReviewQueueItem
              key={String(item.gradeId)}
              result={item}
              onReviewed={handleReviewed}
            />
          ))}
          </ol>
        </AppPanel>
      )}
    </AppPage>
  )
}
