import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AppNotice, AppPage, AppPageHeader, AppPanel } from '../components/layout/AppPage'
import { fetchClasses, getClassesLoadErrorDetails } from '../features/classes/classesApi'
import type { ClassListItem } from '../features/classes/classesTypes'
import { fetchClassGradebook, getGradesLoadErrorDetails } from '../features/grades/gradesApi'
import type { GradebookStudentRow, GradebookViewModel } from '../features/grades/gradesTypes'
import {
  fetchStudentById,
  getStudentsLoadErrorDetails,
  updateStudent,
  type UpdateStudentPayload,
} from '../features/students/studentsApi'
import type { StudentListItem } from '../features/students/studentsTypes'

type LoadState = 'loading' | 'error' | 'done'
type SaveState = 'idle' | 'saving' | 'error'

interface StudentAssignmentSnapshot {
  columnId: string
  label: string
  score: number | null
  maxPoints: number | null
}

interface StudentClassPerformance {
  classId: string
  classLabel: string
  subject: string
  period: string
  schoolYear: string
  average: number | null
  completedAssignments: number
  totalAssignments: number
  assignments: StudentAssignmentSnapshot[]
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return 'No grades yet'
  }

  return `${value.toFixed(1).replace(/\.0$/, '')}%`
}

function formatScore(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

function getAverageTone(average: number | null): string {
  if (average === null) {
    return 'text-white'
  }

  if (average >= 80) {
    return 'text-teal-400'
  }

  if (average >= 60) {
    return 'text-gold-300'
  }

  return 'text-crimson-400'
}

function validateStudentProfile(data: UpdateStudentPayload): string | null {
  if (data.firstName !== undefined && !data.firstName.trim()) return 'First name cannot be empty.'
  if (data.lastName !== undefined && !data.lastName.trim()) return 'Last name cannot be empty.'
  if (data.email !== undefined && !data.email.trim()) return 'Email cannot be empty.'
  if (data.email && !EMAIL_REGEX.test(data.email.trim())) return 'Please enter a valid email address.'
  return null
}

function computeRowAverage(row: GradebookStudentRow): number | null {
  if (typeof row.average === 'number' && Number.isFinite(row.average)) {
    return row.average
  }

  const populatedScores = row.cells.map((cell) => cell.score).filter((score): score is number => score !== null)
  if (populatedScores.length === 0) {
    return null
  }

  return populatedScores.reduce((sum, score) => sum + score, 0) / populatedScores.length
}

function buildClassPerformance(
  studentId: string,
  classes: ClassListItem[],
  gradebooks: GradebookViewModel[],
): StudentClassPerformance[] {
  return classes
    .map((classItem) => {
      const gradebook = gradebooks.find((item) => item.classId === classItem.id)
      if (!gradebook) {
        return null
      }

      const studentRow = gradebook.rows.find((row) => row.studentId === studentId)
      if (!studentRow) {
        return null
      }

      const assignments = gradebook.columns.map((column) => {
        const cell = studentRow.cells.find((candidate) => candidate.columnId === column.id) ?? null
        return {
          columnId: column.id,
          label: column.label,
          score: cell?.score ?? null,
          maxPoints: column.maxPoints ?? null,
        }
      })
      const completedAssignments = assignments.filter((assignment) => assignment.score !== null).length

      return {
        classId: classItem.id,
        classLabel: gradebook.classLabel || `${classItem.name} ${classItem.period}`.trim(),
        subject: classItem.subject,
        period: classItem.period,
        schoolYear: classItem.schoolYear,
        average: computeRowAverage(studentRow),
        completedAssignments,
        totalAssignments: assignments.length,
        assignments,
      }
    })
    .filter((item): item is StudentClassPerformance => item !== null)
}

export default function StudentDetailPage() {
  const { studentId = '' } = useParams<{ studentId: string }>()
  const [searchParams] = useSearchParams()
  const [studentLoadState, setStudentLoadState] = useState<LoadState>('loading')
  const [student, setStudent] = useState<StudentListItem | null>(null)
  const [studentError, setStudentError] = useState('There was a problem connecting to the server.')
  const [performanceLoadState, setPerformanceLoadState] = useState<LoadState>('loading')
  const [performanceError, setPerformanceError] = useState<string | null>(null)
  const [classPerformance, setClassPerformance] = useState<StudentClassPerformance[]>([])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')

  const loadStudent = useCallback(async () => {
    setStudentLoadState('loading')
    setStudentError('There was a problem connecting to the server.')

    try {
      const loadedStudent = await fetchStudentById(studentId)
      setStudent(loadedStudent)
      setFirstName(loadedStudent.firstName ?? '')
      setLastName(loadedStudent.lastName ?? '')
      setEmail(loadedStudent.email ?? '')
      setStudentNumber(loadedStudent.studentNumber ?? '')
      setIsActive(loadedStudent.isActive)
      setSaveError('')
      setSaveState('idle')
      setStudentLoadState('done')
    } catch (error) {
      setStudent(null)
      setStudentError(getStudentsLoadErrorDetails(error).message)
      setStudentLoadState('error')
    }
  }, [studentId])

  const loadPerformance = useCallback(async () => {
    setPerformanceLoadState('loading')
    setPerformanceError(null)

    try {
      const classes = await fetchClasses()
      const gradebookResults = await Promise.allSettled(classes.map((classItem) => fetchClassGradebook(classItem.id)))

      const successfulGradebooks = gradebookResults.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      )
      const firstFailure = gradebookResults.find((result) => result.status === 'rejected')

      setClassPerformance(buildClassPerformance(studentId, classes, successfulGradebooks))
      if (firstFailure && firstFailure.status === 'rejected') {
        setPerformanceError(getGradesLoadErrorDetails(firstFailure.reason).message)
      }
      setPerformanceLoadState('done')
    } catch (error) {
      setClassPerformance([])
      const classError = getClassesLoadErrorDetails(error)
      setPerformanceError(classError.message)
      setPerformanceLoadState('error')
    }
  }, [studentId])

  useEffect(() => {
    void loadStudent()
  }, [loadStudent])

  useEffect(() => {
    void loadPerformance()
  }, [loadPerformance])

  const overallAverage = useMemo(() => {
    const populatedAverages = classPerformance
      .map((item) => item.average)
      .filter((value): value is number => value !== null)

    if (populatedAverages.length === 0) {
      return null
    }

    return populatedAverages.reduce((sum, value) => sum + value, 0) / populatedAverages.length
  }, [classPerformance])

  const completedGradeCount = useMemo(
    () => classPerformance.reduce((sum, item) => sum + item.completedAssignments, 0),
    [classPerformance],
  )

  const handleSaveProfile = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!student) {
      return
    }

    const payload: UpdateStudentPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      studentNumber: studentNumber.trim() || undefined,
      isActive,
    }

    const validationError = validateStudentProfile(payload)
    if (validationError) {
      setSaveError(validationError)
      setSaveState('error')
      return
    }

    setSaveState('saving')
    setSaveError('')

    try {
      const updatedStudent = await updateStudent(student.id, payload)
      setStudent(updatedStudent)
      setFirstName(updatedStudent.firstName ?? '')
      setLastName(updatedStudent.lastName ?? '')
      setEmail(updatedStudent.email ?? '')
      setStudentNumber(updatedStudent.studentNumber ?? '')
      setIsActive(updatedStudent.isActive)
      setSaveState('idle')
      toast.success('Student profile updated.')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to update student profile.')
      setSaveState('error')
    }
  }, [email, firstName, isActive, lastName, student, studentNumber])

  const openedFromGrading = searchParams.get('source') === 'grading'

  if (studentLoadState === 'loading') {
    return (
      <AppPage width="standard">
        <AppPageHeader
          eyebrow="Student records"
          title="Student Profile"
          description="Loading the student profile and grade context."
        />
        <AppPanel className="py-16">
          <div className="flex items-center justify-center gap-3 font-display text-sm text-sec">
            <span className="animate-spin text-lg" aria-hidden="true">⟳</span>
            <span>Loading student profile…</span>
          </div>
        </AppPanel>
      </AppPage>
    )
  }

  if (studentLoadState === 'error' || !student) {
    return (
      <AppPage width="standard">
        <AppPageHeader
          eyebrow="Student records"
          title="Student Profile"
          description="The selected student record could not be opened."
          actions={(
            <Link
              to="/students"
              className="inline-flex items-center rounded-xl border border-subtle px-4 py-2 text-sm font-display font-semibold text-sec transition-colors hover:bg-white/[0.05]"
            >
              ← Back to Students
            </Link>
          )}
        />
        <AppNotice tone="danger">
          <div className="space-y-1">
            <p className="font-display text-sm font-semibold">Unable to load student details</p>
            <p className="font-body text-sm text-white/80">{studentError}</p>
          </div>
        </AppNotice>
      </AppPage>
    )
  }

  return (
    <AppPage width="wide">
      <AppPageHeader
        eyebrow="Student records"
        title={student.fullName}
        description="Review profile details, class placement, grade snapshots, and recent performance from one workspace."
        actions={(
          <>
            <Link
              to="/students"
              className="inline-flex items-center rounded-xl border border-subtle px-4 py-2 text-sm font-display font-semibold text-sec transition-colors hover:bg-white/[0.05]"
            >
              ← Back to Students
            </Link>
            <Link
              to="/grades"
              className="inline-flex items-center rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-sm font-display font-semibold text-gold-300 transition-colors hover:bg-gold-500/20"
            >
              Open Gradebook
            </Link>
          </>
        )}
      />

      {openedFromGrading && (
        <AppNotice>
          <p className="font-body text-sm text-white/85">
            The latest paper exam score was saved to this student record. Review the updated class performance below.
          </p>
        </AppNotice>
      )}

      {performanceError && performanceLoadState === 'done' && (
        <AppNotice>
          <p className="font-body text-sm text-white/85">
            Some performance details could not be loaded completely: {performanceError}
          </p>
        </AppNotice>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <AppPanel className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Overall Average</p>
          <p className={`font-mono text-3xl font-semibold ${getAverageTone(overallAverage)}`}>{formatPercent(overallAverage)}</p>
          <p className="font-body text-sm text-sec">Across every class where this student already has recorded grades.</p>
        </AppPanel>
        <AppPanel className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Active Classes</p>
          <p className="font-mono text-3xl font-semibold text-white">{classPerformance.length}</p>
          <p className="font-body text-sm text-sec">Classes where the student appears in the current gradebook roster.</p>
        </AppPanel>
        <AppPanel className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Recorded Grades</p>
          <p className="font-mono text-3xl font-semibold text-white">{completedGradeCount}</p>
          <p className="font-body text-sm text-sec">Published assignment and exam scores currently visible in gradebooks.</p>
        </AppPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
        <AppPanel>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">Student Profile</h2>
              <p className="mt-1 font-body text-sm text-sec">Update roster details and keep contact information aligned with current records.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${student.isActive ? 'border-gold-500/30 bg-gold-500/10 text-gold-300' : 'border-crimson-500/30 bg-crimson-500/10 text-crimson-400'}`}>
              {student.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <form className="space-y-4" onSubmit={handleSaveProfile}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="font-body text-xs uppercase tracking-wide text-sec">First Name</span>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="w-full rounded-xl border border-subtle bg-elevated px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gold-500/40 focus:ring-2 focus:ring-gold-500/20"
                />
              </label>
              <label className="space-y-1.5">
                <span className="font-body text-xs uppercase tracking-wide text-sec">Last Name</span>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="w-full rounded-xl border border-subtle bg-elevated px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gold-500/40 focus:ring-2 focus:ring-gold-500/20"
                />
              </label>
            </div>

            <label className="space-y-1.5 block">
              <span className="font-body text-xs uppercase tracking-wide text-sec">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-subtle bg-elevated px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gold-500/40 focus:ring-2 focus:ring-gold-500/20"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="font-body text-xs uppercase tracking-wide text-sec">Student Number</span>
                <input
                  value={studentNumber}
                  onChange={(event) => setStudentNumber(event.target.value)}
                  className="w-full rounded-xl border border-subtle bg-elevated px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gold-500/40 focus:ring-2 focus:ring-gold-500/20"
                />
              </label>
              <label className="space-y-1.5">
                <span className="font-body text-xs uppercase tracking-wide text-sec">Status</span>
                <select
                  value={isActive ? 'active' : 'inactive'}
                  onChange={(event) => setIsActive(event.target.value === 'active')}
                  className="w-full rounded-xl border border-subtle bg-elevated px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gold-500/40 focus:ring-2 focus:ring-gold-500/20"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            {saveError && (
              <div className="rounded-xl border border-crimson-500/30 bg-crimson-500/10 px-4 py-3 text-sm text-crimson-400">
                {saveError}
              </div>
            )}

            <div className="rounded-2xl border border-subtle bg-white/[0.03] px-4 py-4">
              <p className="font-body text-xs uppercase tracking-wide text-sec">Roster Snapshot</p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="font-body text-xs text-sec">Primary Class Label</dt>
                  <dd className="mt-1 font-display text-sm text-white">{student.classLabel ?? 'No class label on roster'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs text-sec">Grade Label</dt>
                  <dd className="mt-1 font-display text-sm text-white">{student.gradeLabel ?? 'No grade label on roster'}</dd>
                </div>
              </dl>
            </div>

            <button
              type="submit"
              disabled={saveState === 'saving'}
              className="inline-flex items-center justify-center rounded-xl bg-gold-500 px-5 py-3 font-display text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-600 disabled:opacity-60"
            >
              {saveState === 'saving' ? 'Saving profile…' : 'Save Student Profile'}
            </button>
          </form>
        </AppPanel>

        <AppPanel>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">Class Performance</h2>
              <p className="mt-1 font-body text-sm text-sec">Track where this student is enrolled, how many scores are recorded, and which assignments are already visible in gradebooks.</p>
            </div>
            {performanceLoadState === 'loading' && <span className="font-body text-xs text-sec">Loading…</span>}
          </div>

          {performanceLoadState === 'error' && (
            <div className="rounded-xl border border-crimson-500/30 bg-crimson-500/10 px-4 py-4 text-sm text-crimson-400">
              {performanceError ?? 'Performance data could not be loaded.'}
            </div>
          )}

          {performanceLoadState === 'done' && classPerformance.length === 0 && (
            <div className="rounded-2xl border border-subtle bg-white/[0.03] px-5 py-10 text-center">
              <p className="font-display text-lg font-semibold text-white">No class performance found</p>
              <p className="mt-2 font-body text-sm text-sec">
                This student is not yet visible in any active class gradebook rows.
              </p>
            </div>
          )}

          {classPerformance.length > 0 && (
            <div className="space-y-4">
              {classPerformance.map((performance) => (
                <section key={performance.classId} className="rounded-2xl border border-subtle bg-white/[0.03] px-5 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold text-white">{performance.classLabel}</h3>
                        <span className="rounded-full border border-subtle px-2.5 py-0.5 text-xs text-sec">{performance.subject}</span>
                        <span className="rounded-full border border-subtle px-2.5 py-0.5 text-xs text-sec">{performance.schoolYear}</span>
                      </div>
                      <p className="mt-1 font-body text-sm text-sec">Period {performance.period} · {performance.completedAssignments} of {performance.totalAssignments} scores recorded.</p>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Class Average</p>
                      <p className={`mt-1 font-mono text-2xl font-semibold ${getAverageTone(performance.average)}`}>
                        {formatPercent(performance.average)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {performance.assignments.length === 0 && (
                      <div className="rounded-xl border border-subtle bg-base/40 px-4 py-4 text-sm text-sec">
                        No published assignments are available for this class yet.
                      </div>
                    )}

                    {performance.assignments.map((assignment) => (
                      <div key={assignment.columnId} className="rounded-xl border border-subtle bg-base/40 px-4 py-4">
                        <p className="font-display text-sm font-semibold text-white">{assignment.label}</p>
                        <p className="mt-2 font-mono text-lg text-white">
                          {formatScore(assignment.score)}
                          <span className="text-sm text-sec"> / {formatScore(assignment.maxPoints)}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <Link
                      to={`/grades?classId=${encodeURIComponent(performance.classId)}`}
                      className="inline-flex items-center rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-sm font-display font-semibold text-gold-300 transition-colors hover:bg-gold-500/20"
                    >
                      Open {performance.classLabel} in Gradebook
                    </Link>
                  </div>
                </section>
              ))}
            </div>
          )}
        </AppPanel>
      </div>
    </AppPage>
  )
}