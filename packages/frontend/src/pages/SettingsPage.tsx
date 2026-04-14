import { useTeacherThreshold } from '../features/settings/useTeacherThreshold'
import { useGradingProvider } from '../features/settings/useGradingProvider'
import { AppNotice, AppPage, AppPageHeader, AppPanel } from '../components/layout/AppPage'
import type { GradingProviderId } from '../features/settings/types'

function ThresholdSourceBadge({ source }: { source: 'teacher_override' | 'default' }) {
  if (source === 'teacher_override') {
    return (
      <span className="rounded-full border border-accent bg-gold-500/10 px-2.5 py-1 font-mono text-[10px] text-gold-400">
        Teacher Override
      </span>
    )
  }

  return (
    <span className="rounded-full border border-subtle bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-mut">
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

  const {
    loadState: providerLoadState,
    settings: providerSettings,
    fetchError: providerFetchError,
    saveError: providerSaveError,
    isSaving: providerIsSaving,
    showSavedSuccess: providerSavedSuccess,
    retryLoad: retryProviderLoad,
    selectProvider,
  } = useGradingProvider()

  const showInputError = Boolean(validationError) || Boolean(saveError)
  const activeErrorMessage = validationError ?? saveError

  return (
    <AppPage width="standard">
      <AppPageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Manage your teacher preferences and the confidence threshold used by AI grading."
      />

      {/* ── AI Grading Model ── */}
      <AppPanel className="mb-6">
        <h2 className="font-display text-primary text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          AI Grading Model
        </h2>
        <p className="font-body text-secondary text-sm mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
          Choose the AI model used to grade your students' handwritten submissions. Gemini 2.0 Flash is free and recommended.
        </p>

        {providerLoadState === 'loading' && (
          <div className="flex items-center gap-3 py-4" style={{ color: 'var(--text-muted)' }}>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="font-mono text-xs">Loading preferences...</span>
          </div>
        )}

        {providerLoadState === 'error' && (
          <AppNotice tone="danger">
            <p className="font-display text-sm font-semibold">Unable to load grading model preferences</p>
            <p className="font-body text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{providerFetchError}</p>
            <button
              type="button"
              onClick={() => void retryProviderLoad()}
              className="mt-3 font-display font-semibold text-xs underline"
              style={{ color: 'var(--accent-gold)' }}
            >
              Retry
            </button>
          </AppNotice>
        )}

        {providerLoadState === 'done' && providerSettings && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col">
              <label
                htmlFor="grading-provider"
                className="font-mono text-[11px] mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                AI Model
              </label>
              <select
                id="grading-provider"
                value={providerSettings.currentProvider}
                disabled={providerIsSaving}
                onChange={(e) => void selectProvider(e.target.value as GradingProviderId)}
                className="w-72 rounded-xl border bg-elevated px-3 py-2 font-mono text-sm text-primary outline-none focus:ring-1 focus:ring-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: `1px solid ${providerSaveError ? 'var(--accent-crimson)' : 'var(--border)'}`,
                }}
              >
                {providerSettings.availableProviders.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.displayName} — {opt.description}
                  </option>
                ))}
              </select>
              {providerSaveError && (
                <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--accent-crimson)' }}>
                  {providerSaveError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {providerIsSaving && (
                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  Saving...
                </span>
              )}
              {providerSavedSuccess && (
                <span className="text-xs font-mono animate-pulse" style={{ color: 'var(--accent-teal)' }}>
                  ✓ Saved successfully
                </span>
              )}
            </div>
          </div>
        )}
      </AppPanel>

      {/* ── AI Confidence Threshold ── */}
      <AppPanel className="mb-6">
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
          <AppNotice tone="danger">
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
          </AppNotice>
        )}

        {loadState === 'empty' && (
          <div className="rounded-2xl border border-subtle bg-white/[0.03] p-4">
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
                  className="w-32 rounded-xl border bg-elevated px-3 py-2 font-mono text-primary outline-none focus:ring-1 focus:ring-[var(--accent-gold)]"
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
                  className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-display font-bold text-navy-950 transition-colors hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-70"
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
      </AppPanel>
    </AppPage>
  )
}
