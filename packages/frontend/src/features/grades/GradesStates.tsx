interface ErrorGradesStateProps {
  message: string
  canRetry: boolean
  onRetry: () => void
}

interface EmptyGradesStateProps {
  title?: string
  description?: string
}

export function LoadingGradesState() {
  return (
    <section aria-live="polite" aria-label="Loading gradebook" className="overflow-hidden rounded-xl border border-subtle">
      <div className="border-b border-subtle bg-elevated px-4 py-3">
        <div className="h-4 w-40 animate-pulse rounded bg-surface" aria-hidden="true" />
      </div>
      <div className="bg-surface">
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <div
            key={`gradebook-loading-row-${rowIndex}`}
            className="grid grid-cols-4 gap-4 border-t border-subtle px-4 py-4 first:border-t-0"
            aria-hidden="true"
          >
            {Array.from({ length: 4 }).map((__, cellIndex) => (
              <div
                key={`gradebook-loading-row-${rowIndex}-cell-${cellIndex}`}
                className="h-4 animate-pulse rounded bg-elevated"
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

export function ErrorGradesState({ message, canRetry, onRetry }: ErrorGradesStateProps) {
  return (
    <section
      role="alert"
      className="rounded-xl border p-5"
      style={{
        background: 'rgba(232, 69, 90, 0.08)',
        borderColor: 'rgba(232, 69, 90, 0.22)',
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg" style={{ color: 'var(--accent-crimson)' }} aria-hidden="true">
          ⚠
        </span>
        <div className="space-y-3">
          <div>
            <p className="font-display text-sm font-semibold" style={{ color: 'var(--accent-crimson)' }}>
              Failed to load gradebook.
            </p>
            <p className="mt-0.5 font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
          </div>

          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center rounded-lg border px-3 py-1.5 font-display text-xs font-semibold transition-colors duration-150 hover:bg-[rgba(232,69,90,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] active:scale-95"
              style={{
                borderColor: 'var(--accent-crimson)',
                color: 'var(--accent-crimson)',
              }}
              aria-label="Retry loading grades"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export function EmptyGradesState({
  title = 'No gradebook data found',
  description = "This class doesn't have any students or assignments yet.",
}: EmptyGradesStateProps) {
  return (
    <section className="flex flex-col items-center justify-center gap-5 py-24 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-display font-bold"
        style={{
          background: 'rgba(120, 180, 220, 0.08)',
          border: '1px solid rgba(120, 180, 220, 0.18)',
          color: 'var(--text-muted)',
        }}
        aria-hidden="true"
      >
        —
      </div>
      <div>
        <p className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        <p className="mt-1 font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
    </section>
  )
}
