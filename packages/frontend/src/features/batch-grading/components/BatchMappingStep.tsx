import type {
  BatchFileMapping,
  MappingValidationResult,
  RosterStudent,
} from '../domain/batchTypes'

interface BatchMappingStepProps {
  files: BatchFileMapping[]
  roster: RosterStudent[]
  rosterState: 'loading' | 'error' | 'done'
  rosterError: string | null
  validation: MappingValidationResult
  submitError: string | null
  isSubmitting: boolean
  canSubmit: boolean
  onRetryRoster: () => void
  onMapStudent: (localFileId: string, studentId: string | null) => void
  onBack: () => void
  onSubmit: () => void
}

export default function BatchMappingStep({
  files,
  roster,
  rosterState,
  rosterError,
  validation,
  submitError,
  isSubmitting,
  canSubmit,
  onRetryRoster,
  onMapStudent,
  onBack,
  onSubmit,
}: BatchMappingStepProps) {
  const disabled = !canSubmit || isSubmitting

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-display text-lg font-semibold text-pri">Map students</h2>
        <p className="font-body text-sm text-sec">
          Assign each file to the correct student. All files must be mapped before proceeding.
        </p>
      </header>

      {rosterState === 'loading' && (
        <div className="rounded-xl border border-subtle bg-surface p-4" aria-live="polite">
          <p className="font-body text-sm text-sec">Loading class roster…</p>
        </div>
      )}

      {rosterState === 'error' && (
        <div
          role="alert"
          className="rounded-xl border p-4"
          style={{
            borderColor: 'rgba(232, 69, 90, 0.22)',
            background: 'rgba(232, 69, 90, 0.08)',
          }}
        >
          <p className="font-display text-sm font-semibold" style={{ color: 'var(--accent-crimson)' }}>
            Failed to load roster
          </p>
          <p className="mt-1 font-body text-sm text-sec">{rosterError}</p>
          <button
            type="button"
            onClick={onRetryRoster}
            className="mt-2 rounded-lg px-3 py-1 text-xs font-display font-semibold"
            style={{
              background: 'var(--accent-crimson)',
              color: 'var(--bg-base)',
            }}
          >
            Retry roster load
          </button>
        </div>
      )}

      {rosterState === 'done' && roster.length === 0 && (
        <div className="rounded-xl border border-subtle bg-surface p-4" role="status">
          <p className="font-display text-sm font-semibold text-pri">No enrolled students found</p>
          <p className="mt-1 font-body text-sm text-sec">
            Add students to this class roster before submitting a batch.
          </p>
        </div>
      )}

      {validation.formErrors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border p-4"
          style={{
            borderColor: 'rgba(232, 69, 90, 0.22)',
            background: 'rgba(232, 69, 90, 0.08)',
          }}
        >
          <ul className="list-disc space-y-1 pl-5 font-body text-sm" style={{ color: 'var(--accent-crimson)' }}>
            {validation.formErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          className="rounded-xl border p-4"
          style={{
            borderColor: 'rgba(232, 69, 90, 0.22)',
            background: 'rgba(232, 69, 90, 0.08)',
          }}
        >
          <p className="font-body text-sm" style={{ color: 'var(--accent-crimson)' }}>
            {submitError}
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-subtle bg-surface p-1">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-subtle">
              <th className="px-3 py-2 font-display text-xs uppercase tracking-wide text-mut">File</th>
              <th className="px-3 py-2 font-display text-xs uppercase tracking-wide text-mut">Student</th>
              <th className="px-3 py-2 font-display text-xs uppercase tracking-wide text-mut">Status</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const rowErrors = validation.rowErrors[file.localFileId] ?? []

              return (
                <tr key={file.localFileId} className="border-b border-subtle last:border-b-0">
                  <td className="px-3 py-3 align-top">
                    <p className="max-w-[280px] truncate font-body text-sm text-pri" title={file.fileName}>
                      {file.fileName}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <label htmlFor={`mapping-${file.localFileId}`} className="sr-only">
                      Select student for {file.fileName}
                    </label>
                    <select
                      id={`mapping-${file.localFileId}`}
                      value={file.studentId ?? ''}
                      onChange={(event) => onMapStudent(file.localFileId, event.target.value || null)}
                      disabled={rosterState !== 'done' || roster.length === 0 || isSubmitting}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      style={{
                        background: 'var(--bg-elevated)',
                        borderColor: rowErrors.length > 0 ? 'var(--accent-crimson)' : 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">Select Student…</option>
                      {roster.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.fullName}
                        </option>
                      ))}
                    </select>
                    {rowErrors.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {rowErrors.map((error) => (
                          <li key={error} className="font-body text-xs" style={{ color: 'var(--accent-crimson)' }}>
                            {error}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {rowErrors.length === 0 && file.studentId ? (
                      <span className="font-body text-xs" style={{ color: 'var(--accent-teal)' }}>
                        Ready
                      </span>
                    ) : (
                      <span className="font-body text-xs" style={{ color: 'var(--accent-crimson)' }}>
                        Needs attention
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-subtle pt-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-4 py-2 font-display text-sm font-semibold text-sec transition-colors hover:text-pri"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="rounded-lg px-4 py-2 font-display text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: 'var(--accent-gold)',
            color: 'var(--bg-base)',
          }}
        >
          {isSubmitting
            ? 'Submitting…'
            : `Grade ${files.length} Submission${files.length === 1 ? '' : 's'}`}
        </button>
      </footer>
    </section>
  )
}
