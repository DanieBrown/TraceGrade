interface ErrorClassesStateProps {
  onRetry: () => void
  message: string
  canRetry: boolean
}

export function LoadingClassesState() {
  return (
    <section aria-live="polite" aria-label="Loading classes" className="space-y-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`class-skeleton-${index}`}
            className="h-32 animate-pulse rounded-xl bg-elevated"
            aria-hidden="true"
          />
        ))}
      </div>
    </section>
  )
}

export function ErrorClassesState({ onRetry, message, canRetry }: ErrorClassesStateProps) {
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
              Failed to load classes.
            </p>
            <p className="mt-0.5 font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
          </div>
          {canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center rounded-lg border px-3 py-1.5 font-display text-xs font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] active:scale-95"
              style={{
                borderColor: 'var(--accent-crimson)',
                color: 'var(--accent-crimson)',
              }}
              aria-label="Retry loading classes"
            >
              Try Again
            </button>
          ) : (
            <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
              Update your configuration and refresh this page.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export function EmptyClassesState({ onNewClass }: { onNewClass?: () => void }) {
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
        +
      </div>
      <div>
        <p className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          No classes found
        </p>
        <p className="mt-1 font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
          Get started by creating your first class.
        </p>
      </div>
      <button
        type="button"
        onClick={onNewClass}
        className="inline-flex items-center rounded-lg px-5 py-2.5 font-display text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] active:scale-95"
        style={{
          background: 'var(--accent-gold)',
          color: 'var(--bg-base)',
        }}
        aria-label="Create class"
      >
        + New Class
      </button>
    </section>
  )
}