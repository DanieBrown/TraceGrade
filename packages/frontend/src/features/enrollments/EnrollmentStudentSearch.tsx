import React from 'react'
import type { StudentListItem } from '../students/studentsTypes'

type StudentListLoadState = 'loading' | 'error' | 'done'

interface EnrollmentStudentSearchProps {
  studentListLoadState: StudentListLoadState
  studentListErrorMessage: string
  studentListCanRetry: boolean
  onRetryStudents: () => void
  allStudents: StudentListItem[]
  filteredStudents: StudentListItem[]
  activeEnrollmentStudentIds: Set<string>
  debouncedSearch: string
  enrollingStudentId: string | null
  enrollError: string
  searchTerm: string
  onSearchChange: (value: string) => void
  onAdd: (studentId: string) => void
}

const EnrollmentStudentSearch = React.forwardRef<
  HTMLInputElement,
  EnrollmentStudentSearchProps
>(function EnrollmentStudentSearch(
  {
    studentListLoadState,
    studentListErrorMessage,
    studentListCanRetry,
    onRetryStudents,
    allStudents,
    filteredStudents,
    activeEnrollmentStudentIds,
    debouncedSearch,
    enrollingStudentId,
    enrollError,
    searchTerm,
    onSearchChange,
    onAdd,
  },
  ref,
) {
  return (
    <>
      {/* Section header */}
      <p
        className="font-display text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        Add Students
      </p>

      {/* Search input */}
      <div className="space-y-1.5">
        <label
          htmlFor="enrollment-search"
          className="font-display text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Search
        </label>
        <input
          id="enrollment-search"
          ref={ref}
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Name or student number…"
          className="w-full rounded-lg px-3 py-2 text-sm font-body transition-colors focus:outline-none"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          aria-label="Search students by name or student number"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Results container */}
      <div className="overflow-y-auto" style={{ maxHeight: '260px' }}>
        {/* Loading state — 3 skeleton rows */}
        {studentListLoadState === 'loading' && (
          <div
            className="space-y-2 py-2"
            aria-busy="true"
            aria-label="Loading students"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`student-skeleton-${i}`}
                className="h-9 animate-pulse rounded-lg bg-elevated"
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {studentListLoadState === 'error' && (
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
              <p className="font-body text-xs" style={{ color: 'var(--accent-crimson)' }}>
                Failed to load students.{' '}
                {!studentListCanRetry ? 'Check your configuration.' : ''}
              </p>
              {studentListCanRetry && (
                <button
                  type="button"
                  onClick={onRetryStudents}
                  className="inline-flex items-center rounded-lg border px-3 py-1.5 font-display text-xs font-semibold
                             transition-opacity hover:opacity-90 active:scale-95
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2
                             focus-visible:ring-offset-[var(--bg-base)]"
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
        )}

        {/* Loaded state */}
        {studentListLoadState === 'done' && (
          <>
            {/* No students in school */}
            {allStudents.length === 0 ? (
              <p
                className="py-6 text-center font-body text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                No students found in your school.
              </p>
            ) : filteredStudents.length === 0 && debouncedSearch !== '' ? (
              /* No search results */
              <p
                className="py-6 text-center font-body text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                No students match &ldquo;{debouncedSearch}&rdquo;
              </p>
            ) : (
              /* Search result rows */
              <ul aria-label="Student search results">
                {filteredStudents.map((student) => {
                  const isEnrolled = activeEnrollmentStudentIds.has(student.id)
                  const isAdding = enrollingStudentId === student.id
                  const firstName = student.firstName ?? ''
                  const lastName = student.lastName ?? ''

                  return (
                    <li
                      key={student.id}
                      className={`flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors${
                        isEnrolled ? ' opacity-60' : ' hover:bg-elevated cursor-default'
                      }`}
                    >
                      {/* Left: name + student number */}
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-display text-sm font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {firstName} {lastName}
                        </p>
                        {student.studentNumber && (
                          <p
                            className="font-body text-xs"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            #{student.studentNumber}
                          </p>
                        )}
                      </div>

                      {/* Right: Enrolled badge or Add button */}
                      {isEnrolled ? (
                        <span
                          className="flex-shrink-0 rounded-full px-2 py-0.5 font-body text-xs font-medium"
                          style={{
                            background: 'rgba(232, 164, 40, 0.12)',
                            border: '1px solid rgba(232, 164, 40, 0.25)',
                            color: 'var(--accent-gold)',
                          }}
                          aria-label={`${firstName} ${lastName} is already enrolled`}
                        >
                          Enrolled
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAdd(student.id)}
                          disabled={enrollingStudentId !== null}
                          className="flex-shrink-0 inline-flex items-center justify-center rounded-lg px-3 py-1
                                     font-display text-xs font-semibold transition-opacity
                                     hover:opacity-90 active:scale-95
                                     focus-visible:outline-none focus-visible:ring-2
                                     focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2
                                     focus-visible:ring-offset-[var(--bg-base)]
                                     disabled:cursor-not-allowed disabled:opacity-60"
                          style={{
                            background: 'var(--accent-gold)',
                            color: 'var(--bg-base)',
                            opacity: isAdding ? 0.7 : undefined,
                          }}
                          aria-label={`Enroll ${firstName} ${lastName}`}
                        >
                          {isAdding ? 'Adding…' : 'Add'}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Enroll error message */}
      {enrollError && (
        <div
          role="alert"
          className="rounded-lg p-2.5"
          style={{
            background: 'rgba(232, 69, 90, 0.08)',
            border: '1px solid rgba(232, 69, 90, 0.22)',
          }}
        >
          <p className="font-body text-xs" style={{ color: 'var(--accent-crimson)' }}>
            {enrollError}
          </p>
        </div>
      )}
    </>
  )
})

export default EnrollmentStudentSearch
