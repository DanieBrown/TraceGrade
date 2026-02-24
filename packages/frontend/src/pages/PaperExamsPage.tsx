import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchExamTemplates } from '../features/exams/examsApi'
import type { ExamTemplateListItem } from '../features/exams/examsTypes'
import type { SavedScore } from '../features/grading/GradingResultCard'
import GradingResultCard from '../features/grading/GradingResultCard'
import GradingResultsList from '../features/grading/GradingResultsList'
import type { GradedStudentRecord } from '../features/grading/GradingResultsList'
import { useGrading } from '../features/grading/useGrading'
import {
  fetchStudents,
  getStudentsLoadErrorDetails,
} from '../features/students/studentsApi'
import type { StudentListItem } from '../features/students/studentsTypes'
import FileUpload from '../features/submissions/FileUpload'

function EmptyState({
  title,
  description,
  primaryLinkLabel,
  primaryLinkTo,
  secondaryLinkLabel,
  secondaryLinkTo,
}: {
  title: string
  description: string
  primaryLinkLabel: string
  primaryLinkTo: string
  secondaryLinkLabel?: string
  secondaryLinkTo?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-display font-bold"
        style={{
          background: 'rgba(232, 164, 40, 0.1)',
          border: '1px solid rgba(232, 164, 40, 0.22)',
          color: 'var(--accent-gold)',
        }}
      >
        +
      </div>
      <div className="text-center">
        <p className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        <p className="text-sm mt-1 font-body" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to={primaryLinkTo}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-semibold text-sm transition-colors"
          style={{
            background: 'var(--accent-gold)',
            color: '#06101e',
          }}
        >
          {primaryLinkLabel}
        </Link>
        {secondaryLinkLabel && secondaryLinkTo && (
          <Link
            to={secondaryLinkTo}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-semibold text-sm transition-colors"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            {secondaryLinkLabel}
          </Link>
        )}
      </div>
    </div>
  )
}

function ExamCard({
  exam,
  gradedCount,
  totalStudents,
  onGrade,
}: {
  exam: ExamTemplateListItem
  gradedCount: number
  totalStudents: number
  onGrade: () => void
}) {
  const progressPct = totalStudents > 0 ? (gradedCount / totalStudents) * 100 : 0

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {exam.title}
            </h3>
            <span
              className="font-mono text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                color: '#5bc5f5',
                background: 'rgba(91, 197, 245, 0.1)',
                border: '1px solid rgba(91, 197, 245, 0.2)',
              }}
            >
              {exam.statusLabel}
            </span>
          </div>
          <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {exam.questionCount} questions · {exam.totalPoints} total points
          </p>
        </div>
        <button
          onClick={onGrade}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-display font-semibold text-xs transition-colors"
          style={{ background: 'var(--accent-gold)', color: '#06101e' }}
        >
          ✏ Grade
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-mono" style={{ color: 'var(--text-muted)' }}>Grading Progress</span>
          <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
            {gradedCount}/{totalStudents} students ({Math.round(progressPct)}%)
          </span>
        </div>
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: '6px', background: 'rgba(120, 180, 220, 0.1)' }}
          role="progressbar"
          aria-valuenow={gradedCount}
          aria-valuemin={0}
          aria-valuemax={Math.max(totalStudents, 1)}
          aria-label={`${gradedCount} of ${totalStudents} students graded`}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              background: progressPct === 100 ? 'var(--accent-teal)' : 'var(--accent-gold)',
            }}
          />
        </div>
      </div>

      <button className="mt-3 text-xs transition-colors font-mono" style={{ color: 'var(--text-muted)' }}>
        ◈ View {exam.questionCount} questions
      </button>
    </div>
  )
}

function GradePanel({
  exam,
  students,
  studentsLoading,
  studentsError,
  studentsRetryable,
  onRetryStudents,
  gradedStudents,
  onBack,
  onSaveGrades,
}: {
  exam: ExamTemplateListItem
  students: StudentListItem[]
  studentsLoading: boolean
  studentsError: string | null
  studentsRetryable: boolean
  onRetryStudents: () => void
  gradedStudents: GradedStudentRecord[]
  onBack: () => void
  onSaveGrades: (record: GradedStudentRecord) => void
}) {
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const { state: gradingState, grade, reset } = useGrading()

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  )
  const gradedStudentIds = useMemo(
    () => new Set(gradedStudents.map((gradedStudent) => gradedStudent.studentId)),
    [gradedStudents],
  )
  const ungradedStudents = useMemo(
    () => students.filter((student) => !gradedStudentIds.has(student.id)),
    [students, gradedStudentIds],
  )

  useEffect(() => {
    setSubmissionId(null)
    reset()
  }, [selectedStudentId, reset])

  const handleUploadComplete = useCallback((uploadedSubmissionId: string) => {
    setSubmissionId((currentSubmissionId) => currentSubmissionId ?? uploadedSubmissionId)
  }, [])

  function handleSaveGrades(savedScores: SavedScore[]) {
    if (!selectedStudent || gradingState.phase !== 'success') return

    const totalAdjusted = savedScores.reduce((sum, score) => sum + score.adjustedPoints, 0)
    const totalAvailable = gradingState.parsedQuestions.reduce((sum, question) => sum + question.pointsAvailable, 0)

    onSaveGrades({
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      submissionId: submissionId ?? '',
      result: gradingState.result,
      parsedQuestions: gradingState.parsedQuestions,
      savedScores,
      totalAdjusted,
      totalAvailable,
    })

    setSubmissionId(null)
    setSelectedStudentId('')
    reset()
  }

  function handleCancel() {
    setSubmissionId(null)
    reset()
  }

  return (
    <div
      className="rounded-xl p-6 space-y-6"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            Grade Paper Exam
          </h2>
          <p className="font-body text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {exam.title}
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-lg text-sm font-display font-medium transition-colors"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            background: 'transparent',
          }}
          onMouseEnter={(event) => ((event.currentTarget as HTMLElement).style.background = 'rgba(120, 180, 220, 0.06)')}
          onMouseLeave={(event) => ((event.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          ← Back to Exams
        </button>
      </div>

      <div
        className="rounded-lg p-4 flex items-center justify-between text-sm"
        style={{
          background: 'rgba(232, 164, 40, 0.06)',
          border: '1px solid rgba(232, 164, 40, 0.18)',
        }}
      >
        <div className="space-y-0.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
          <p>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Total Points:</span>{' '}
            {exam.totalPoints}
          </p>
          <p>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Questions:</span>{' '}
            {exam.questionCount}
          </p>
        </div>
        <p className="font-mono" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Graded:</span>{' '}
          {gradedStudents.length}/{students.length}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="student-select" className="font-display text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Select Student to Grade
        </label>
        <select
          id="student-select"
          value={selectedStudentId}
          onChange={(event) => setSelectedStudentId(event.target.value)}
          disabled={studentsLoading || !!studentsError || ungradedStudents.length === 0}
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: `1px solid ${selectedStudentId ? 'rgba(232, 164, 40, 0.4)' : 'var(--border)'}`,
            color: selectedStudentId ? 'var(--text-primary)' : 'var(--text-muted)',
            opacity: studentsLoading ? 0.7 : 1,
          }}
        >
          <option value="">Choose a student…</option>
          {ungradedStudents.map((student) => (
            <option key={student.id} value={student.id}>{student.fullName}</option>
          ))}
          {gradedStudents.length > 0 && (
            <optgroup label="Already graded">
              {gradedStudents.map((gradedStudent) => (
                <option key={gradedStudent.studentId} value={gradedStudent.studentId}>{gradedStudent.studentName} ✓</option>
              ))}
            </optgroup>
          )}
        </select>

        {studentsLoading && (
          <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
            Loading students…
          </p>
        )}

        {studentsError && (
          <div
            className="rounded-lg p-3 space-y-1.5"
            role="alert"
            style={{
              background: 'rgba(232, 69, 90, 0.08)',
              border: '1px solid rgba(232, 69, 90, 0.25)',
            }}
          >
            <p className="font-display font-semibold text-sm" style={{ color: 'var(--accent-crimson)' }}>
              Failed to load students
            </p>
            <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
              {studentsError}
            </p>
            {studentsRetryable && (
              <button onClick={onRetryStudents} className="text-xs underline" style={{ color: 'var(--accent-crimson)' }}>
                Retry loading students
              </button>
            )}
          </div>
        )}

        {!studentsLoading && !studentsError && ungradedStudents.length === 0 && (
          <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
            No students available for grading yet.{' '}
            <Link to="/students" className="underline" style={{ color: 'var(--accent-gold)' }}>
              Add students
            </Link>
            .
          </p>
        )}
      </div>

      {selectedStudent && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{
            background: 'rgba(0, 201, 167, 0.04)',
            border: '1px solid rgba(0, 201, 167, 0.14)',
          }}
        >
          <div className="flex items-start gap-2">
            <span style={{ color: 'var(--accent-teal)', fontSize: '18px' }} aria-hidden="true">✦</span>
            <div>
              <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Upload Student's Handwritten Exam
              </h3>
              <p className="font-body text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Upload a picture of {selectedStudent.fullName}'s completed exam for AI-powered grading.
              </p>
            </div>
          </div>

          <FileUpload
            assignmentId={exam.assignmentId}
            studentId={selectedStudent.id}
            onUploadComplete={handleUploadComplete}
          />

          {submissionId && gradingState.phase === 'idle' && (
            <button
              onClick={() => grade(submissionId)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-display font-semibold text-sm transition-colors"
              style={{ background: 'var(--accent-teal)', color: '#06101e' }}
            >
              ✦ Grade with AI
            </button>
          )}

          {gradingState.phase === 'loading' && (
            <div
              className="flex items-center justify-center gap-3 py-6 font-display"
              role="status"
              aria-live="polite"
              style={{ color: 'var(--accent-teal)' }}
            >
              <span className="animate-spin text-xl" aria-hidden="true">⟳</span>
              <span className="text-sm font-medium">AI is grading the submission…</span>
            </div>
          )}

          {gradingState.phase === 'error' && (
            <div
              className="rounded-lg p-4 space-y-2"
              role="alert"
              style={{
                background: 'rgba(232, 69, 90, 0.08)',
                border: '1px solid rgba(232, 69, 90, 0.25)',
              }}
            >
              <p className="font-display font-semibold text-sm" style={{ color: 'var(--accent-crimson)' }}>
                Grading failed
              </p>
              <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
                {gradingState.message}
              </p>
              <button
                onClick={() => submissionId && grade(submissionId)}
                className="text-xs underline"
                style={{ color: 'var(--accent-crimson)' }}
              >
                Retry grading
              </button>
            </div>
          )}
        </div>
      )}

      {gradingState.phase === 'success' && selectedStudent && (
        <div className="space-y-2">
          <GradingResultCard
            result={gradingState.result}
            parsedQuestions={gradingState.parsedQuestions}
            studentName={selectedStudent.fullName}
            onSave={handleSaveGrades}
            onCancel={handleCancel}
          />
        </div>
      )}

      {gradedStudents.length > 0 && <GradingResultsList records={gradedStudents} />}
    </div>
  )
}

export default function PaperExamsPage() {
  const [gradingExamId, setGradingExamId] = useState<string | null>(null)
  const [gradedStudents, setGradedStudents] = useState<GradedStudentRecord[]>([])

  const [exams, setExams] = useState<ExamTemplateListItem[]>([])
  const [examsLoading, setExamsLoading] = useState(true)
  const [examsError, setExamsError] = useState<string | null>(null)

  const [students, setStudents] = useState<StudentListItem[]>([])
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [studentsError, setStudentsError] = useState<string | null>(null)
  const [studentsRetryable, setStudentsRetryable] = useState(true)

  const gradingExam = useMemo(
    () => exams.find((exam) => exam.id === gradingExamId) ?? null,
    [exams, gradingExamId],
  )

  function handleSaveGrades(record: GradedStudentRecord) {
    setGradedStudents((previousRecords) => {
      const otherRecords = previousRecords.filter((gradedStudent) => gradedStudent.studentId !== record.studentId)
      return [...otherRecords, record]
    })
  }

  const loadExams = useCallback(async () => {
    setExamsLoading(true)
    setExamsError(null)

    try {
      const templates = await fetchExamTemplates()
      setExams(templates)
    } catch (error) {
      setExamsError(error instanceof Error ? error.message : 'Failed to load exam templates.')
      setExams([])
    } finally {
      setExamsLoading(false)
    }
  }, [])

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true)
    setStudentsError(null)
    setStudentsRetryable(true)

    try {
      const loadedStudents = await fetchStudents()
      setStudents(loadedStudents)
    } catch (error) {
      const details = getStudentsLoadErrorDetails(error)
      setStudentsError(details.message)
      setStudentsRetryable(details.retryable)
      setStudents([])
    } finally {
      setStudentsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadExams()
    void loadStudents()
  }, [loadExams, loadStudents])

  const gradedCount = useMemo(
    () => gradedStudents.filter((record) => students.some((student) => student.id === record.studentId)).length,
    [gradedStudents, students],
  )

  return (
    <div style={{ padding: '40px', maxWidth: '860px' }}>
      <div className="flex items-start justify-between" style={{ marginBottom: '28px' }}>
        <div>
          <p
            className="font-mono"
            style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}
          >
            AI Grading
          </p>
          <h1 className="font-display" style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Paper Exams
          </h1>
          <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
            Grade real student submissions using your existing exam templates.
          </p>
        </div>
        {!gradingExam && (
          <Link
            to="/exams"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-display font-semibold text-sm transition-colors flex-shrink-0"
            style={{ background: 'var(--accent-gold)', color: '#06101e' }}
          >
            + Create Paper Exam
          </Link>
        )}
      </div>

      {!gradingExam && (
        <div
          className="rounded-xl p-5"
          style={{
            background: 'rgba(0, 201, 167, 0.05)',
            border: '1px solid rgba(0, 201, 167, 0.15)',
            marginBottom: '24px',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: 'var(--accent-teal)', fontSize: '14px' }} aria-hidden="true">✦</span>
            <p className="font-display font-semibold text-sm" style={{ color: 'var(--accent-teal)' }}>
              AI-Powered Features
            </p>
          </div>
          <ul className="space-y-1.5 font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
            <li>· Select from your real exam templates</li>
            <li>· Upload handwritten student submissions for each template</li>
            <li>· Trigger AI grading with confidence scoring and review support</li>
            <li>· Save adjusted grades for each student submission</li>
          </ul>
        </div>
      )}

      {gradingExam ? (
        <GradePanel
          exam={gradingExam}
          students={students}
          studentsLoading={studentsLoading}
          studentsError={studentsError}
          studentsRetryable={studentsRetryable}
          onRetryStudents={loadStudents}
          gradedStudents={gradedStudents}
          onBack={() => setGradingExamId(null)}
          onSaveGrades={handleSaveGrades}
        />
      ) : examsLoading ? (
        <div
          className="rounded-xl p-6 font-body text-sm"
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          Loading exam templates…
        </div>
      ) : examsError ? (
        <div
          className="rounded-xl p-6 space-y-2"
          role="alert"
          style={{
            background: 'rgba(232, 69, 90, 0.08)',
            border: '1px solid rgba(232, 69, 90, 0.25)',
          }}
        >
          <p className="font-display font-semibold text-sm" style={{ color: 'var(--accent-crimson)' }}>
            Failed to load exam templates
          </p>
          <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
            {examsError}
          </p>
          <button onClick={loadExams} className="text-xs underline" style={{ color: 'var(--accent-crimson)' }}>
            Retry loading exam templates
          </button>
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          title="No exam templates available"
          description="Create your first template before grading paper submissions."
          primaryLinkLabel="Create exam template"
          primaryLinkTo="/exams"
          secondaryLinkLabel="Add students"
          secondaryLinkTo="/students"
        />
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              gradedCount={gradedCount}
              totalStudents={students.length}
              onGrade={() => setGradingExamId(exam.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
