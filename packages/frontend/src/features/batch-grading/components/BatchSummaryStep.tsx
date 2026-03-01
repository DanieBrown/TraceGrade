import type { BatchSummary, BatchTrackingRow } from '../domain/batchTypes'

interface BatchSummaryStepProps {
  summary: BatchSummary
  rows: BatchTrackingRow[]
  failedRows: BatchTrackingRow[]
  retryError: string | null
  isRetrying: boolean
  onDone: () => void
  onRetryFailed: () => void
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-subtle bg-surface p-4">
      <p className="font-body text-xs text-mut">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold" style={{ color: accent ?? 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  )
}

export default function BatchSummaryStep({
  summary,
  rows,
  failedRows,
  retryError,
  isRetrying,
  onDone,
  onRetryFailed,
}: BatchSummaryStepProps) {
  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-display text-lg font-semibold text-pri">Batch grading complete</h2>
        <p className="font-body text-sm text-sec">Review aggregate outcomes and retry only failed entries if needed.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Processed" value={String(summary.totalProcessed)} />
        <StatCard label="Average Score" value={`${summary.averageScore.toFixed(1)}%`} accent="var(--accent-gold)" />
        <StatCard label="Pass Rate" value={`${summary.passRate.toFixed(1)}%`} accent="var(--accent-teal)" />
        <StatCard label="Fail Rate" value={`${summary.failRate.toFixed(1)}%`} accent="var(--accent-crimson)" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Passed" value={String(summary.passedCount)} accent="var(--accent-teal)" />
        <StatCard label="Failed / Review" value={String(summary.failedCount)} accent="var(--accent-crimson)" />
        <StatCard label="Flagged for Review" value={String(summary.flaggedReviewCount)} />
      </div>

      {summary.missingScoreCount > 0 && (
        <div className="rounded-xl border border-subtle bg-surface p-4">
          <p className="font-body text-sm text-sec">
            {summary.missingScoreCount} completed submission{summary.missingScoreCount === 1 ? '' : 's'} had no score and were excluded from average score calculation.
          </p>
        </div>
      )}

      {failedRows.length > 0 && (
        <div className="rounded-xl border border-subtle bg-surface p-4">
          <h3 className="font-display text-sm font-semibold text-pri">Failed submissions</h3>
          <ul className="mt-2 space-y-2">
            {failedRows.map((row) => (
              <li key={row.localFileId} className="rounded-lg border border-subtle bg-elevated px-3 py-2">
                <p className="font-body text-sm text-pri">{row.studentName}</p>
                <p className="font-mono text-xs text-mut">{row.fileName}</p>
                <p className="mt-1 font-body text-xs" style={{ color: 'var(--accent-crimson)' }}>
                  {row.errorMessage ?? 'Processing failed.'}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {retryError && (
        <div
          role="alert"
          className="rounded-xl border p-4"
          style={{
            borderColor: 'rgba(232, 69, 90, 0.22)',
            background: 'rgba(232, 69, 90, 0.08)',
          }}
        >
          <p className="font-body text-sm" style={{ color: 'var(--accent-crimson)' }}>
            {retryError}
          </p>
        </div>
      )}

      {rows.length === 0 && (
        <div className="rounded-xl border border-subtle bg-surface p-4">
          <p className="font-body text-sm text-sec">No batch rows are available for summary.</p>
        </div>
      )}

      <footer className="flex items-center justify-between gap-3 border-t border-subtle pt-4">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-4 py-2 font-display text-sm font-semibold text-sec transition-colors hover:text-pri"
        >
          Done
        </button>
        {failedRows.length > 0 && (
          <button
            type="button"
            onClick={onRetryFailed}
            disabled={isRetrying}
            className="rounded-lg px-4 py-2 font-display text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--bg-base)',
            }}
          >
            {isRetrying ? 'Retrying…' : `Retry Failed (${failedRows.length})`}
          </button>
        )}
      </footer>
    </section>
  )
}
