interface ErrorHomeworkStateProps {
  onRetry: () => void
  message?: string
  canRetry?: boolean
}

export function LoadingHomeworkState() {
  return (
    <section aria-live="polite" aria-label="Loading homework" className="space-y-4">
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`homework-skeleton-${index}`}
            className="h-20 animate-pulse rounded-xl bg-elevated"
            aria-hidden="true"
          />
        ))}
      </div>
    </section>
  )
}

export function ErrorHomeworkState({ onRetry, message, canRetry = true }: ErrorHomeworkStateProps) {
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
              Failed to load homework.
            </p>
            <p className="mt-0.5 font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
              {message ?? 'There was a problem connecting to the server.'}
            </p>
          </div>
          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center rounded-lg border px-3 py-1.5 font-display text-xs font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-crimson)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] active:scale-95"
              style={{
                borderColor: 'var(--accent-crimson)',
                color: 'var(--accent-crimson)',
              }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export function EmptyHomeworkState({ onCreateHomework }: { onCreateHomework?: () => void }) {
  return (
    <section className="flex flex-col items-center justify-center gap-5 py-24 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl"
        style={{
          background: 'rgba(232, 164, 40, 0.1)',
          border: '1px solid rgba(232, 164, 40, 0.22)',
          color: 'var(--accent-gold)',
        }}
        aria-hidden="true"
      >
        📋
      </div>
      <div>
        <p className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          No homework assignments yet
        </p>
        <p className="mt-1 font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
          Create your first homework assignment to get started.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreateHomework}
        className="inline-flex items-center rounded-lg px-5 py-2.5 font-display text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] active:scale-95"
        style={{
          background: 'var(--accent-gold)',
          color: 'var(--bg-base)',
        }}
        aria-label="Create homework"
      >
        + Create Homework
      </button>
    </section>
  )
}
