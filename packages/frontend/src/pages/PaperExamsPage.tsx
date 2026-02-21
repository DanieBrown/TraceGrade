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
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl text-gray-400">
        +
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-gray-800">No paper exams yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Create your first paper exam with custom questions or upload an image
        </p>
      </div>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{exam.title}</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              {exam.tag}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {exam.questions} questions · {exam.totalPoints} total points
          </p>
        </div>
        <button
          onClick={onGrade}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          ✏️ Grade
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Grading Progress</span>
          <span>
            {gradedCount}/{totalStudents} students ({Math.round(progressPct)}%)
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5" role="progressbar" aria-valuenow={gradedCount} aria-valuemin={0} aria-valuemax={totalStudents} aria-label={`${gradedCount} of ${totalStudents} students graded`}>
          <div
            className="h-1.5 bg-indigo-500 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <button className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
        👁 View {exam.questions} questions
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

  // Reset grading state when the selected student changes
  useEffect(() => {
    setSubmissionId(null)
    reset()
  }, [selectedStudentId, reset])

  // Guard against duplicate calls if multiple files are uploaded
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Grade Paper Exam</h2>
          <p className="text-sm text-gray-500 mt-0.5">{examTitle}</p>
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← Back to Exams
        </button>
      </div>

      {/* Summary */}
      <div className="bg-indigo-50 rounded-lg p-4 flex items-center justify-between text-sm">
        <div className="space-y-0.5">
          <p>
            <span className="font-medium">Total Points:</span> 20
          </p>
          <p>
            <span className="font-medium">Questions:</span> 3
          </p>
        </div>
        <p className="text-gray-500">
          <span className="font-medium">Graded:</span>{' '}
          {gradedStudents.length}/{DEMO_STUDENTS.length}
        </p>
      </div>

      {/* Student selector */}
      <div className="space-y-1.5">
        <label htmlFor="student-select" className="text-sm font-medium text-gray-700">
          Select Student to Grade
        </label>
        <select
          id="student-select"
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className={[
            'w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors',
            selectedStudentId ? 'border-indigo-400' : 'border-gray-200 text-gray-400',
          ].join(' ')}
        >
          <option value="">Choose a student…</option>
          {ungradedStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          {gradedStudents.length > 0 && (
            <optgroup label="Already graded">
              {gradedStudents.map((g) => (
                <option key={g.studentId} value={g.studentId}>
                  {g.studentName} ✓
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Upload area — shown only once a student is selected */}
      {selectedStudent && (
        <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-2">
            <span className="text-violet-600 text-lg" aria-hidden="true">✦</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Upload Student's Handwritten Exam
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Upload a picture of {selectedStudent.name}'s completed exam for AI-powered grading.
              </p>
            </div>
          </div>

          <FileUpload
            assignmentId={DEMO_ASSIGNMENT_ID}
            studentId={selectedStudent.id}
            onUploadComplete={handleUploadComplete}
          />

          {/* Grade button — appears after upload completes */}
          {submissionId && gradingState.phase === 'idle' && (
            <button
              onClick={() => grade(submissionId)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ✦ Grade with AI
            </button>
          )}

          {/* Loading state */}
          {gradingState.phase === 'loading' && (
            <div className="flex items-center justify-center gap-3 py-6 text-indigo-700" role="status" aria-live="polite">
              <span className="animate-spin text-xl" aria-hidden="true">⟳</span>
              <span className="text-sm font-medium">AI is grading the submission…</span>
            </div>
          )}

          {/* Error state */}
          {gradingState.phase === 'error' && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-2" role="alert">
              <p className="text-sm font-semibold text-red-700">Grading failed</p>
              <p className="text-xs text-red-600">{gradingState.message}</p>
              <button
                onClick={() => submissionId && grade(submissionId)}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                Retry grading
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grading result — rendered outside the upload area for visual prominence */}
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
  const [showExams] = useState(true) // false = empty state
  const [gradingExamId, setGradingExamId] = useState<string | null>(null)
  const [gradedStudents, setGradedStudents] = useState<GradedStudentRecord[]>([])

  const gradingExam = DEMO_EXAMS.find((e) => e.id === gradingExamId) ?? null

  function handleSaveGrades(record: GradedStudentRecord) {
    setGradedStudents((prev) => {
      // Replace if re-grading the same student
      const filtered = prev.filter((g) => g.studentId !== record.studentId)
      return [...filtered, record]
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paper Exams</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create custom exams with AI-powered grading
          </p>
        </div>
        {!gradingExam && (
          <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            + Create Paper Exam
          </button>
        )}
      </div>

      {/* AI features callout */}
      {!gradingExam && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-indigo-600" aria-hidden="true">↑</span>
            <p className="text-sm font-semibold text-indigo-800">AI-Powered Features</p>
          </div>
          <ul className="space-y-1 text-xs text-indigo-700 list-disc list-inside">
            <li>Build custom exams with multiple choice or free-response questions</li>
            <li>Upload exam images to auto-generate questions (OCR simulation)</li>
            <li>Grade student exams by uploading handwritten answer images</li>
            <li>AI confidence scores for automated grading accuracy</li>
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
