import { useCallback, useEffect, useState } from 'react'
import FileUpload from '../features/submissions/FileUpload'
import GradingResultCard from '../features/grading/GradingResultCard'
import type { SavedScore } from '../features/grading/GradingResultCard'
import GradingResultsList from '../features/grading/GradingResultsList'
import type { GradedStudentRecord } from '../features/grading/GradingResultsList'
import { useGrading } from '../features/grading/useGrading'

// Placeholder exam data until the exam entity API is wired up
const DEMO_EXAMS = [
  {
    id: 'exam-001',
    title: 'Exam from Uploaded Image',
    tag: 'From Image',
    questions: 3,
    totalPoints: 20,
  },
]

// Placeholder students
const DEMO_STUDENTS = [
  { id: 'stu-001', name: 'Jack' },
  { id: 'stu-002', name: 'Sarah' },
  { id: 'stu-003', name: 'Mohammed' },
]

// Fixed demo assignment id until assignment entity is implemented
const DEMO_ASSIGNMENT_ID = '00000000-0000-0000-0000-000000000001'

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
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
          No paper exams yet
        </p>
        <p className="text-sm mt-1 font-body" style={{ color: 'var(--text-secondary)' }}>
          Create your first paper exam with custom questions or upload an image
        </p>
      </div>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-semibold text-sm transition-colors"
        style={{
          background: 'var(--accent-gold)',
          color: '#06101e',
        }}
      >
        + Create Your First Paper Exam
      </button>
    </div>
  )
}

// ── Exam card ────────────────────────────────────────────────────────────────
function ExamCard({
  exam,
  gradedCount,
  totalStudents,
  onGrade,
}: {
  exam: (typeof DEMO_EXAMS)[0]
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
              {exam.tag}
            </span>
          </div>
          <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {exam.questions} questions · {exam.totalPoints} total points
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
          aria-valuemax={totalStudents}
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
        ◈ View {exam.questions} questions
      </button>
    </div>
  )
}

// ── Grade panel ───────────────────────────────────────────────────────────────
function GradePanel({
  examTitle,
  gradedStudents,
  onBack,
  onSaveGrades,
}: {
  examTitle: string
  gradedStudents: GradedStudentRecord[]
  onBack: () => void
  onSaveGrades: (record: GradedStudentRecord) => void
}) {
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const { state: gradingState, grade, reset } = useGrading()

  const selectedStudent = DEMO_STUDENTS.find((s) => s.id === selectedStudentId)
  const gradedStudentIds = new Set(gradedStudents.map((g) => g.studentId))
  const ungradedStudents = DEMO_STUDENTS.filter((s) => !gradedStudentIds.has(s.id))

  useEffect(() => {
    setSubmissionId(null)
    reset()
  }, [selectedStudentId, reset])

  const handleUploadComplete = useCallback((sid: string) => {
    setSubmissionId((prev) => prev ?? sid)
  }, [])

  function handleSaveGrades(savedScores: SavedScore[]) {
    if (!selectedStudent || gradingState.phase !== 'success') return
    const totalAdjusted = savedScores.reduce((s, sc) => s + sc.adjustedPoints, 0)
    const totalAvailable = gradingState.parsedQuestions.reduce((s, q) => s + q.pointsAvailable, 0)
    onSaveGrades({
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            Grade Paper Exam
          </h2>
          <p className="font-body text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {examTitle}
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
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(120, 180, 220, 0.06)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          ← Back to Exams
        </button>
      </div>

      {/* Summary */}
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
            20
          </p>
          <p>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Questions:</span>{' '}
            3
          </p>
        </div>
        <p className="font-mono" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Graded:</span>{' '}
          {gradedStudents.length}/{DEMO_STUDENTS.length}
        </p>
      </div>

      {/* Student selector */}
      <div className="space-y-1.5">
        <label htmlFor="student-select" className="font-display text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Select Student to Grade
        </label>
        <select
          id="student-select"
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: `1px solid ${selectedStudentId ? 'rgba(232, 164, 40, 0.4)' : 'var(--border)'}`,
            color: selectedStudentId ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          <option value="">Choose a student…</option>
          {ungradedStudents.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
          {gradedStudents.length > 0 && (
            <optgroup label="Already graded">
              {gradedStudents.map((g) => (
                <option key={g.studentId} value={g.studentId}>{g.studentName} ✓</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Upload area */}
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
                Upload a picture of {selectedStudent.name}'s completed exam for AI-powered grading.
              </p>
            </div>
          </div>

          <FileUpload
            assignmentId={DEMO_ASSIGNMENT_ID}
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

      {/* Grading result */}
      {gradingState.phase === 'success' && (
        <div className="space-y-2">
          <GradingResultCard
            result={gradingState.result}
            parsedQuestions={gradingState.parsedQuestions}
            studentName={selectedStudent?.name ?? 'Student'}
            onSave={handleSaveGrades}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Graded results list */}
      {gradedStudents.length > 0 && (
        <GradingResultsList records={gradedStudents} />
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PaperExamsPage() {
  const [showExams] = useState(true)
  const [gradingExamId, setGradingExamId] = useState<string | null>(null)
  const [gradedStudents, setGradedStudents] = useState<GradedStudentRecord[]>([])

  const gradingExam = DEMO_EXAMS.find((e) => e.id === gradingExamId) ?? null

  function handleSaveGrades(record: GradedStudentRecord) {
    setGradedStudents((prev) => {
      const filtered = prev.filter((g) => g.studentId !== record.studentId)
      return [...filtered, record]
    })
  }

  return (
    <div style={{ padding: '40px', maxWidth: '860px' }}>
      {/* Page header */}
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
            Create custom exams with AI-powered handwriting recognition &amp; grading
          </p>
        </div>
        {!gradingExam && (
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-display font-semibold text-sm transition-colors flex-shrink-0"
            style={{ background: 'var(--accent-gold)', color: '#06101e' }}
          >
            + Create Paper Exam
          </button>
        )}
      </div>

      {/* AI features callout */}
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
            <li>· Build custom exams with multiple choice or free-response questions</li>
            <li>· Upload exam images to auto-generate questions via OCR</li>
            <li>· Grade student exams by uploading handwritten answer images</li>
            <li>· Confidence scoring flags submissions below 95% for your review</li>
          </ul>
        </div>
      )}

      {/* Content */}
      {gradingExam ? (
        <GradePanel
          examTitle={gradingExam.title}
          gradedStudents={gradedStudents}
          onBack={() => setGradingExamId(null)}
          onSaveGrades={handleSaveGrades}
        />
      ) : showExams ? (
        <div className="space-y-4">
          {DEMO_EXAMS.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              gradedCount={gradedStudents.filter((g) =>
                DEMO_STUDENTS.some((s) => s.id === g.studentId),
              ).length}
              totalStudents={DEMO_STUDENTS.length}
              onGrade={() => setGradingExamId(exam.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState onCreateClick={() => {}} />
      )}
    </div>
  )
}
