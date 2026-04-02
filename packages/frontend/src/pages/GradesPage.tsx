import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ClassContextHeader from '../features/grades/ClassContextHeader'
import { EmptyGradesState, ErrorGradesState, LoadingGradesState } from '../features/grades/GradesStates'
import {
  fetchClassGradebook,
  fetchClassesForGradebook,
  getGradesLoadErrorDetails,
  isGradebookEmpty,
} from '../features/grades/gradesApi'
import type { GradebookClassOption, GradebookStudentRow, GradebookViewModel } from '../features/grades/gradesTypes'
import { AppNotice, AppPage, AppPageHeader, AppPanel } from '../components/layout/AppPage'

type LoadState = 'loading' | 'error' | 'done'

const EMPTY_VIEW_MODEL: GradebookViewModel = {
  classId: '',
  classLabel: 'Untitled Class',
  columns: [],
  rows: [],
}

const ASSIGNMENTS_PER_PAGE = 4

export default function GradesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [classOptions, setClassOptions] = useState<GradebookClassOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [assignmentPage, setAssignmentPage] = useState(1)
  const [gradebook, setGradebook] = useState<GradebookViewModel>(EMPTY_VIEW_MODEL)
  const [errorMessage, setErrorMessage] = useState('There was a problem connecting to the server.')
  const [canRetry, setCanRetry] = useState(true)
  const initialClassIdRef = useRef((searchParams.get('classId') ?? '').trim())
  const latestRequestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  const loadInitialState = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current
    setLoadState('loading')

    try {
      const classes = await fetchClassesForGradebook()
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      setClassOptions(classes)

      if (classes.length === 0) {
        setSelectedClassId('')
        setSelectedStudentId('')
        setAssignmentPage(1)
        setGradebook(EMPTY_VIEW_MODEL)
        setErrorMessage('There was a problem connecting to the server.')
        setCanRetry(true)
        setLoadState('done')
        return
      }

      const initialClassId =
        classes.find((classOption) => classOption.id === initialClassIdRef.current)?.id ?? classes[0].id
      setSelectedClassId(initialClassId)

      const viewModel = await fetchClassGradebook(initialClassId)
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

        setSelectedStudentId(viewModel.rows[0]?.studentId ?? '')
        setAssignmentPage(1)
      setGradebook(viewModel)
      setErrorMessage('There was a problem connecting to the server.')
      setCanRetry(true)
      setLoadState('done')
    } catch (error) {
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      const details = getGradesLoadErrorDetails(error)
      setErrorMessage(details.message)
      setCanRetry(details.retryable)
      setLoadState('error')
    }
  }, [])

  const loadGradebookForClass = useCallback(async (classId: string) => {
    const requestId = ++latestRequestIdRef.current
    setLoadState('loading')

    try {
      const viewModel = await fetchClassGradebook(classId)
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

        setSelectedStudentId(viewModel.rows[0]?.studentId ?? '')
        setAssignmentPage(1)
      setGradebook(viewModel)
      setErrorMessage('There was a problem connecting to the server.')
      setCanRetry(true)
      setLoadState('done')
    } catch (error) {
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      const details = getGradesLoadErrorDetails(error)
      setErrorMessage(details.message)
      setCanRetry(details.retryable)
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    void loadInitialState()

    return () => {
      isMountedRef.current = false
    }
  }, [loadInitialState])

  const handleClassChange = useCallback(
    (nextClassId: string) => {
      if (!nextClassId || nextClassId === selectedClassId) {
        return
      }

      const nextSearchParams = new URLSearchParams(searchParams)
      nextSearchParams.set('classId', nextClassId)

      setSelectedClassId(nextClassId)
      setSearchParams(nextSearchParams, { replace: true })
      void loadGradebookForClass(nextClassId)
    },
    [loadGradebookForClass, searchParams, selectedClassId, setSearchParams],
  )

  const handleRetry = useCallback(() => {
    if (classOptions.length === 0 || !selectedClassId) {
      void loadInitialState()
      return
    }

    void loadGradebookForClass(selectedClassId)
  }, [classOptions.length, loadGradebookForClass, loadInitialState, selectedClassId])

  const selectedClassLabel = useMemo(
    () => classOptions.find((option) => option.id === selectedClassId)?.label ?? '',
    [classOptions, selectedClassId],
  )

  const selectedStudent = useMemo<GradebookStudentRow | null>(
    () => gradebook.rows.find((row) => row.studentId === selectedStudentId) ?? gradebook.rows[0] ?? null,
    [gradebook.rows, selectedStudentId],
  )

  const emptyStateContent = useMemo(() => {
    if (classOptions.length === 0) {
      return {
        title: 'No classes found',
        description: 'There are no classes available for gradebook viewing yet.',
      }
    }

    return {
      title: 'No gradebook data found',
      description: "This class doesn't have any students or assignments yet.",
    }
  }, [classOptions.length])

  const summary = useMemo(() => {
    if (isGradebookEmpty(gradebook)) {
      return null
    }

    const rowAverages = gradebook.rows.map((row) => {
      const scores = row.cells.filter((cell) => cell.score !== null).map((cell) => cell.score as number)
      const average = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null
      return {
        studentName: row.studentName,
        average,
        completed: scores.length,
        total: row.cells.length,
      }
    })

    const populatedScores = rowAverages.map((row) => row.average).filter((value): value is number => value !== null)
    const overallAverage = populatedScores.length > 0
      ? populatedScores.reduce((sum, value) => sum + value, 0) / populatedScores.length
      : null
    const completionEntries = rowAverages.reduce((sum, row) => sum + row.completed, 0)
    const completionTotal = rowAverages.reduce((sum, row) => sum + row.total, 0)
    const topStudent = [...rowAverages]
      .filter((row) => row.average !== null)
      .sort((left, right) => (right.average as number) - (left.average as number))[0] ?? null

    return {
      overallAverage,
      completionEntries,
      completionTotal,
      studentCount: gradebook.rows.length,
      assignmentCount: gradebook.columns.length,
      topStudent,
    }
  }, [gradebook])

  const selectedStudentMetrics = useMemo(() => {
    if (!selectedStudent) {
      return null
    }

    const cellsWithScores = selectedStudent.cells.filter((cell) => cell.score !== null)
    const numericScores = cellsWithScores.map((cell) => cell.score as number)
    const average = numericScores.length > 0
      ? numericScores.reduce((sum, score) => sum + score, 0) / numericScores.length
      : null
    const highest = numericScores.length > 0 ? Math.max(...numericScores) : null
    const lowest = numericScores.length > 0 ? Math.min(...numericScores) : null

    return {
      completed: cellsWithScores.length,
      total: selectedStudent.cells.length,
      average,
      highest,
      lowest,
    }
  }, [selectedStudent])

  const selectedStudentAssignments = useMemo(() => {
    if (!selectedStudent) {
      return []
    }

    return gradebook.columns.map((column) => {
      const matchingCell = selectedStudent.cells.find((cell) => cell.columnId === column.id)
      return {
        column,
        cell: matchingCell ?? null,
      }
    })
  }, [gradebook.columns, selectedStudent])

  useEffect(() => {
    setAssignmentPage(1)
  }, [selectedStudentId])

  const totalAssignmentPages = useMemo(
    () => Math.max(1, Math.ceil(selectedStudentAssignments.length / ASSIGNMENTS_PER_PAGE)),
    [selectedStudentAssignments.length],
  )

  const paginatedAssignments = useMemo(() => {
    const startIndex = (assignmentPage - 1) * ASSIGNMENTS_PER_PAGE
    return selectedStudentAssignments.slice(startIndex, startIndex + ASSIGNMENTS_PER_PAGE)
  }, [assignmentPage, selectedStudentAssignments])

  const paginatedAssignmentSlots = useMemo(() => {
    return Array.from({ length: ASSIGNMENTS_PER_PAGE }, (_, index) => paginatedAssignments[index] ?? null)
  }, [paginatedAssignments])

  const visibleAssignmentRange = useMemo(() => {
    if (selectedStudentAssignments.length === 0) {
      return { start: 0, end: 0 }
    }

    const start = (assignmentPage - 1) * ASSIGNMENTS_PER_PAGE + 1
    const end = Math.min(assignmentPage * ASSIGNMENTS_PER_PAGE, selectedStudentAssignments.length)
    return { start, end }
  }, [assignmentPage, selectedStudentAssignments.length])

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Gradebook"
        title="Grades"
        description="Review published assignments and finalized exam grades by class in a read-only summary."
      />

      <AppNotice>
        <p className="font-display text-sm font-semibold text-pri">Read-only gradebook summary</p>
        <p className="mt-1 font-body text-sm text-sec">
          This page summarizes published class assignments and finalized exam grades. Homework items created on the Homework page do not create gradebook columns.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link to="/homework" className="font-display text-sm font-semibold text-gold-300 no-underline hover:text-gold-200">
            View Homework Planner
          </Link>
          <Link to="/exams" className="font-display text-sm font-semibold text-gold-300 no-underline hover:text-gold-200">
            Create Gradeable Exam
          </Link>
        </div>
      </AppNotice>

      <ClassContextHeader
        classOptions={classOptions}
        selectedClassId={selectedClassId}
        onClassChange={handleClassChange}
        disabled={loadState === 'loading'}
      />

      {loadState === 'done' && summary && (
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <section className="surface-panel-plain rounded-[24px] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">Class snapshot</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="font-display text-2xl text-white">{summary.studentCount}</p>
                <p className="font-body text-sm text-sec">Students in this view</p>
              </div>
              <div>
                <p className="font-display text-2xl text-white">{summary.assignmentCount}</p>
                <p className="font-body text-sm text-sec">Published grade columns</p>
              </div>
              <div>
                <p className="font-display text-2xl text-white">
                  {summary.overallAverage === null ? '—' : `${summary.overallAverage.toFixed(1)}%`}
                </p>
                <p className="font-body text-sm text-sec">Average recorded score</p>
              </div>
            </div>
          </section>

          <section className="surface-panel-plain rounded-[24px] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">Coverage</p>
            <p className="mt-4 font-display text-2xl text-white">
              {summary.completionTotal === 0 ? '—' : `${Math.round((summary.completionEntries / summary.completionTotal) * 100)}%`}
            </p>
            <p className="mt-2 font-body text-sm text-sec">
              {summary.completionEntries} of {summary.completionTotal} possible grades are filled in this class.
            </p>
          </section>

          <section className="surface-panel-plain rounded-[24px] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">Top average</p>
            {summary.topStudent ? (
              <>
                <p className="mt-4 font-display text-xl text-white">{summary.topStudent.studentName}</p>
                <p className="mt-2 font-body text-sm text-sec">{(summary.topStudent.average as number).toFixed(1)}% across completed grade columns.</p>
              </>
            ) : (
              <p className="mt-4 font-body text-sm text-sec">No completed grades yet for this class.</p>
            )}
          </section>
        </div>
      )}

      {loadState === 'loading' && <LoadingGradesState />}

      {loadState === 'error' && (
        <ErrorGradesState
          message={errorMessage}
          canRetry={canRetry}
          onRetry={handleRetry}
        />
      )}

      {loadState === 'done' && classOptions.length > 0 && selectedClassLabel && (
        <div className="mb-4 flex items-center justify-between gap-3" aria-live="polite">
          <p className="font-body text-sm text-sec">
            Showing gradebook for <span className="font-semibold text-pri">{selectedClassLabel}</span>.
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mut">Select a student to inspect assignment-by-assignment results</p>
        </div>
      )}

      {loadState === 'done' && (classOptions.length === 0 || isGradebookEmpty(gradebook)) && (
        <EmptyGradesState title={emptyStateContent.title} description={emptyStateContent.description} />
      )}

      {loadState === 'done' && classOptions.length > 0 && !isGradebookEmpty(gradebook) && selectedStudent && selectedStudentMetrics && (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.35fr]">
          <AppPanel>
            <div>
              <p className="font-display text-lg font-medium text-white">Student view</p>
              <p className="mt-1 font-body text-sm text-sec">Choose one student to review their full set of recorded grades.</p>
            </div>

            <div className="mt-5 space-y-2">
              <label htmlFor="student-grade-select" className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">
                Student
              </label>
              <select
                id="student-grade-select"
                value={selectedStudent.studentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                className="w-full rounded-xl border border-subtle bg-elevated px-3 py-3 font-body text-sm text-pri outline-none focus:ring-2 focus:ring-gold-500/40"
              >
                {gradebook.rows.map((row) => (
                  <option key={row.studentId} value={row.studentId}>
                    {row.studentName}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 rounded-2xl border border-subtle bg-white/[0.03] p-4">
              <p className="font-display text-xl text-white">{selectedStudent.studentName}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">Average</p>
                  <p className="mt-2 font-display text-2xl text-white">
                    {selectedStudentMetrics.average === null ? '—' : `${selectedStudentMetrics.average.toFixed(1)}%`}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">Completed</p>
                  <p className="mt-2 font-display text-2xl text-white">{selectedStudentMetrics.completed}/{selectedStudentMetrics.total}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">Highest</p>
                  <p className="mt-2 font-display text-xl text-teal-400">
                    {selectedStudentMetrics.highest === null ? '—' : `${selectedStudentMetrics.highest.toFixed(1)}%`}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">Lowest</p>
                  <p className="mt-2 font-display text-xl text-gold-300">
                    {selectedStudentMetrics.lowest === null ? '—' : `${selectedStudentMetrics.lowest.toFixed(1)}%`}
                  </p>
                </div>
              </div>
            </div>
          </AppPanel>

          <AppPanel>
            <div>
              <p className="font-display text-lg font-medium text-white">Recorded grades</p>
              <p className="mt-1 font-body text-sm text-sec">Browse {selectedStudent.studentName}&apos;s assignment and exam results in smaller pages instead of one long scroll.</p>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-subtle bg-white/[0.03] px-4 py-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">Page</p>
                <p className="mt-1 font-body text-sm text-sec">
                  Showing {visibleAssignmentRange.start}-{visibleAssignmentRange.end} of {selectedStudentAssignments.length} recorded grades
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssignmentPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={assignmentPage === 1}
                  className="rounded-lg border border-subtle px-4 py-2 font-display text-sm font-semibold text-pri transition-colors hover:border-gold-500/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="min-w-20 text-center font-mono text-xs uppercase tracking-[0.2em] text-mut">
                  {assignmentPage} / {totalAssignmentPages}
                </div>
                <button
                  type="button"
                  onClick={() => setAssignmentPage((currentPage) => Math.min(totalAssignmentPages, currentPage + 1))}
                  disabled={assignmentPage === totalAssignmentPages}
                  className="rounded-lg bg-gold-500 px-4 py-2 font-display text-sm font-semibold text-[var(--bg-base)] transition-colors hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="mt-5 grid min-h-[548px] gap-3" style={{ gridTemplateRows: 'repeat(4, minmax(0, 1fr))' }}>
              {paginatedAssignmentSlots.map((assignment, index) => {
                if (!assignment) {
                  return (
                    <div
                      key={`assignment-placeholder-${index}`}
                      aria-hidden="true"
                      className="rounded-2xl border border-dashed border-subtle/70 bg-white/[0.015] px-4 py-4"
                    />
                  )
                }

                const { column, cell } = assignment
                const score = cell?.score ?? null
                const scoreTone = score === null
                  ? 'text-mut'
                  : score >= 80
                    ? 'text-teal-400'
                    : score >= 60
                      ? 'text-gold-300'
                      : 'text-crimson-400'

                return (
                  <div key={column.id} className="flex h-full min-h-32 flex-col justify-between rounded-2xl border border-subtle bg-white/[0.03] px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-base font-medium text-white">{column.label}</p>
                        <p className="mt-1 font-body text-sm text-sec">
                          {column.categoryLabel ?? 'Recorded grade'}
                          {column.maxPoints ? ` · ${column.maxPoints} pts possible` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-display text-xl ${scoreTone}`}>
                          {cell?.displayValue ?? '—'}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-mut">
                          {score === null ? 'No grade yet' : 'Recorded'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </AppPanel>
        </div>
      )}
    </AppPage>
  )
}
