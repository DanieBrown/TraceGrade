import type { BatchTrackingRow, BatchUiStatus } from '../domain/batchTypes'

interface BatchProgressStepProps {
  rows: BatchTrackingRow[]
  isPolling: boolean
  pollError: string | null
  isRestoredFromSession: boolean
}

function getStatusLabel(status: BatchUiStatus): string {
  if (status === 'processing') {
    return 'Processing'
  }

  if (status === 'completed') {
    return 'Completed'
  }

  if (status === 'failed') {
    return 'Failed'
  }

  return 'Queued'
}

function getStatusColor(status: BatchUiStatus): string {
  if (status === 'processing') {
    return 'var(--accent-gold)'
  }

  if (status === 'completed') {
    return 'var(--accent-teal)'
  }

  if (status === 'failed') {
    return 'var(--accent-crimson)'
  }

  return 'var(--text-muted)'
}

export default function BatchProgressStep({
  rows,
  isPolling,
  pollError,
  isRestoredFromSession,
}: BatchProgressStepProps) {
  const terminalCount = rows.filter((row) => row.status === 'completed' || row.status === 'failed').length
  const total = rows.length
  const progressPercent = total === 0 ? 0 : Math.round((terminalCount / total) * 100)

  return (
    <section className="space-y-5" aria-live="polite">
      <header className="space-y-1">
        <h2 className="font-display text-lg font-semibold text-pri">Grading in progress…</h2>
        <p className="font-body text-sm text-sec">
          Track each student submission as it moves through queued, processing, completed, or failed.
        </p>
      </header>

      {isRestoredFromSession && (
        <div className="rounded-xl border border-subtle bg-surface p-4">
          <p className="font-body text-sm text-sec">Restored this batch from your last in-progress session.</p>
        </div>
      )}

      {pollError && (
        <div
          role="alert"
          className="rounded-xl border p-4"
          style={{
            borderColor: 'rgba(232, 69, 90, 0.22)',
            background: 'rgba(232, 69, 90, 0.08)',
          }}
        >
          <p className="font-body text-sm" style={{ color: 'var(--accent-crimson)' }}>
            {pollError}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-subtle bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-semibold text-pri">Overall progress</p>
          <p className="font-mono text-xs text-sec">
            {terminalCount}/{total} complete ({progressPercent}%)
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(120, 180, 220, 0.12)' }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${progressPercent}%`,
              background: 'var(--accent-gold)',
            }}
          />
        </div>
        <p className="mt-2 font-body text-xs text-mut">{isPolling ? 'Refreshing statuses…' : 'Waiting for next refresh…'}</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-subtle bg-surface p-4">
          <p className="font-body text-sm text-sec">No submissions are being tracked in this batch.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-subtle bg-surface p-1">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-subtle">
                <th className="px-3 py-2 font-display text-xs uppercase tracking-wide text-mut">Student</th>
                <th className="px-3 py-2 font-display text-xs uppercase tracking-wide text-mut">Status</th>
                <th className="px-3 py-2 font-display text-xs uppercase tracking-wide text-mut">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.localFileId} className="border-b border-subtle last:border-b-0">
                  <td className="px-3 py-3 align-top">
                    <p className="font-body text-sm text-pri">{row.studentName}</p>
                    <p className="font-mono text-xs text-mut">{row.fileName}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className="font-display text-xs font-semibold" style={{ color: getStatusColor(row.status) }}>
                      {getStatusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    {row.status === 'completed' ? (
                      <p className="font-body text-sm text-pri">
                        {typeof row.score === 'number' ? `${row.score.toFixed(1)}%` : 'Score unavailable'}
                      </p>
                    ) : row.status === 'failed' ? (
                      <p className="font-body text-xs" style={{ color: 'var(--accent-crimson)' }}>
                        {row.errorMessage ?? 'Processing failed.'}
                      </p>
                    ) : (
                      <p className="font-body text-sm text-sec">—</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
