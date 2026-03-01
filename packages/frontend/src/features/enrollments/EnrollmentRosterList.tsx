import type { EnrollmentListItem } from './enrollmentTypes'
import type { StudentListItem } from '../students/studentsTypes'

type LoadState = 'loading' | 'error' | 'done'

interface EnrollmentRosterListProps {
  enrollments: EnrollmentListItem[]
  loadState: LoadState
  errorMessage: string
  canRetry: boolean
  onRetry: () => void
  droppingEnrollmentId: string | null
  dropErrorEnrollmentId: string | null
  dropError: string
  onDrop: (enrollmentId: string) => void
  onFocusSearch: () => void
  studentMap: Map<string, StudentListItem>
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export default function EnrollmentRosterList({
  enrollments,
  loadState,
  errorMessage,
  canRetry,
  onRetry,
  droppingEnrollmentId,
  dropErrorEnrollmentId,
  dropError,
  onDrop,
  onFocusSearch,
  studentMap,
}: EnrollmentRosterListProps) {
  return (
    <>
      {/* Section header */}
      <p
        className="font-display text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        Enrolled Students
      </p>

      {/* Loading state — 4 skeleton rows */}
      {loadState === 'loading' && (
        <div
          className="space-y-2"
          aria-busy="true"
          aria-label="Loading enrolled students"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`roster-skeleton-${i}`}
              className="h-10 animate-pulse rounded-lg bg-elevated"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {loadState === 'error' && (
        <div
          role="alert"
          className="rounded-lg p-3 flex items-start gap-2"
          style={{
            background: 'rgba(232, 69, 90, 0.08)',
            border: '1px solid rgba(232, 69, 90, 0.22)',
          }}
        >
          <span style={{ color: 'var(--accent-crimson)' }} aria-hidden="true">
            ⚠
          </span>
          <div className="space-y-2">
            <p
              className="font-display text-sm font-semibold"
              style={{ color: 'var(--accent-crimson)' }}
            >
              Failed to load roster.
            </p>
            <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
              {errorMessage}
            </p>
            {canRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center rounded-lg border px-3 py-1.5 font-display text-xs font-semibold
                           transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2
                           focus-visible:ring-offset-[var(--bg-base)] active:scale-95"
                style={{
                  borderColor: 'var(--accent-crimson)',
                  color: 'var(--accent-crimson)',
                }}
              >
                Try Again
              </button>
            ) : (
              <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
                Check your configuration and refresh the page.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loaded state */}
      {loadState === 'done' && (
        <>
          {/* Empty state */}
          {enrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-xl"
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
                <p
                  className="font-display text-sm font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  No students enrolled yet
                </p>
                <p
                  className="mt-1 font-body text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Use the search to add students to this class.
                </p>
              </div>
              <button
                type="button"
                onClick={onFocusSearch}
                className="inline-flex items-center rounded-lg px-4 py-2 font-display text-xs font-semibold
                           transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2
                           focus-visible:ring-offset-[var(--bg-base)] active:scale-95"
                style={{
                  background: 'var(--accent-gold)',
                  color: 'var(--bg-base)',
                }}
              >
                + Add Students
              </button>
            </div>
          ) : (
            /* Roster rows */
            <ul aria-label="Enrolled students list">
              {enrollments.map((enrollment) => {
                const student = studentMap.get(enrollment.studentId)
                const firstName = student?.firstName ?? 'Unknown'
                const lastName = student?.lastName ?? 'Student'
                const displayName =
                  student != null
                    ? `${firstName} ${lastName}`
                    : 'Unknown Student'
                const formattedDate = dateFormatter.format(
                  new Date(enrollment.enrolledAt),
                )

                return (
                  <li
                    key={enrollment.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    {/* Left: name + date */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-display text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {displayName}
                      </p>
                      <p
                        className="font-body text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Added {formattedDate}
                      </p>
                    </div>

                    {/* Right: Drop button + per-row error */}
                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={() => onDrop(enrollment.id)}
                        disabled={droppingEnrollmentId !== null}
                        className="inline-flex items-center rounded-lg px-2 py-1 font-display text-xs font-semibold
                                   transition-opacity hover:opacity-90
                                   focus-visible:outline-none focus-visible:ring-2
                                   focus-visible:ring-[var(--accent-crimson)] focus-visible:ring-offset-2
                                   focus-visible:ring-offset-[var(--bg-base)]
                                   disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                          color: 'var(--accent-crimson)',
                          opacity:
                            droppingEnrollmentId === enrollment.id ? 0.6 : undefined,
                        }}
                        aria-label={`Drop ${firstName} ${lastName}`}
                      >
                        {droppingEnrollmentId === enrollment.id
                          ? 'Dropping…'
                          : 'Drop'}
                      </button>

                      {/* Per-row drop error */}
                      {dropErrorEnrollmentId === enrollment.id && dropError && (
                        <p
                          className="font-body text-xs"
                          style={{ color: 'var(--accent-crimson)' }}
                          role="alert"
                        >
                          {dropError}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </>
  )
}
