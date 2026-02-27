import { useTeacherThreshold } from '../features/settings/useTeacherThreshold'

function ThresholdSourceBadge({ source }: { source: 'teacher_override' | 'default' }) {
  if (source === 'teacher_override') {
    return (
      <span
        className="font-mono text-[10px] px-2 py-1 rounded"
        style={{
          background: 'rgba(232,164,40,0.12)',
          color: 'var(--accent-gold)',
          border: '1px solid rgba(232,164,40,0.28)',
        }}
      >
        Teacher Override
      </span>
    )
  }

  return (
    <span
      className="font-mono text-[10px] px-2 py-1 rounded border border-subtle"
      style={{
        background: 'rgba(120,180,220,0.1)',
        color: 'var(--text-muted)',
      }}
    >
      System Default
    </span>
  )
}

export default function SettingsPage() {
  const {
    loadState,
    threshold,
    thresholdInput,
    fetchError,
    saveError,
    validationError,
    isSaving,
    showSavedSuccess,
    setThresholdInput,
    retryLoad,
    save,
  } = useTeacherThreshold()

  const showInputError = Boolean(validationError) || Boolean(saveError)
  const activeErrorMessage = validationError ?? saveError

  return (
    <div style={{ padding: '40px', maxWidth: '1100px' }}>
      <header style={{ marginBottom: '24px' }}>
        <p
          className="font-mono text-muted uppercase text-[10px] tracking-[0.16em]"
          style={{ color: 'var(--text-muted)', marginBottom: '6px' }}
        >
          Preferences
        </p>
        <h1 className="font-display text-primary text-[28px] font-extrabold" style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>
          Settings
        </h1>
        <p className="font-body text-secondary text-sm" style={{ color: 'var(--text-secondary)' }}>
          Manage your teacher preferences and AI grading behavior.
        </p>
      </header>

      <section
        className="bg-card rounded-xl border-subtle p-6 mb-6"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="font-display text-primary text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          AI Confidence Threshold
        </h2>
        <p className="font-body text-secondary text-sm mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
          Set the minimum confidence level required for the AI to automatically approve a grade. Submissions below this threshold will be flagged for your manual review.
        </p>

        {loadState === 'loading' && (
          <div className="flex items-center gap-3 py-4" style={{ color: 'var(--text-muted)' }}>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="font-mono text-xs">Loading preferences...</span>
          </div>
        )}

        {loadState === 'error' && (
          <div
            role="alert"
            className="rounded-lg p-4"
            style={{
              background: 'rgba(232,69,90,0.1)',
              border: '1px solid rgba(232,69,90,0.2)',
              color: 'var(--accent-crimson)',
            }}
          >
            <p className="font-display text-sm font-semibold">Unable to load preferences</p>
            <p className="font-body text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{fetchError}</p>
            <button
              type="button"
              onClick={() => void retryLoad()}
              className="mt-3 font-display font-semibold text-xs underline"
              style={{ color: 'var(--accent-gold)' }}
            >
              Retry
            </button>
          </div>
        )}

        {loadState === 'empty' && (
          <div className="rounded-lg border border-subtle p-4" style={{ borderColor: 'var(--border)' }}>
            <p className="font-display text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No preference found yet</p>
            <p className="font-body text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              We could not read your threshold settings. Try loading again.
            </p>
            <button
              type="button"
              onClick={() => void retryLoad()}
              className="mt-3 inline-flex items-center rounded-lg px-3 py-1.5 font-display font-semibold text-xs"
              style={{ background: 'var(--accent-gold)', color: 'var(--bg-base)' }}
            >
              Reload Preferences
            </button>
          </div>
        )}

        {loadState === 'done' && threshold && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex flex-col">
                <label
                  htmlFor="confidence-threshold"
                  className="font-mono text-[11px] mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Confidence Threshold
                </label>
                <input
                  id="confidence-threshold"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={thresholdInput}
                  onChange={(event) => setThresholdInput(event.target.value)}
                  className="bg-elevated border-subtle text-primary rounded-lg px-3 py-2 font-mono w-32 outline-none focus:border-accent-gold focus:ring-1 focus:ring-[var(--accent-gold)]"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: `1px solid ${showInputError ? 'var(--accent-crimson)' : 'var(--border)'}`,
                  }}
                  aria-describedby="confidence-threshold-help confidence-threshold-error"
                />
                <p id="confidence-threshold-help" className="font-mono text-muted text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  Enter a decimal value between 0.00 and 1.00 (e.g., 0.80 for 80%).
                </p>
                {activeErrorMessage && (
                  <p id="confidence-threshold-error" className="font-mono text-[11px] mt-1" style={{ color: 'var(--accent-crimson)' }}>
                    {activeErrorMessage}
                  </p>
                )}
              </div>

              <div className="pt-[22px]">
                <ThresholdSourceBadge source={threshold.source} />
              </div>

              <div className="pt-[22px] flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-accent-gold text-bg-base font-display font-bold rounded-lg px-4 py-2 text-sm transition-colors hover:bg-[#f0c050] disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: 'var(--accent-gold)', color: 'var(--bg-base)' }}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                {showSavedSuccess && (
                  <span className="text-xs font-mono animate-pulse" style={{ color: 'var(--accent-teal)' }}>
                    ✓ Saved successfully
                  </span>
                )}
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
