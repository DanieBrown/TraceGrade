import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppNotice, AppPage, AppPageHeader, AppPanel } from '../components/layout/AppPage'
import { fetchClasses } from '../features/classes/classesApi'
import type { ClassListItem } from '../features/classes/classesTypes'
import { ensureExamAssignmentForClass } from '../features/exams/examCreationApi'
import ExamBuilder from '../features/exams/ExamBuilder'
import {
  buildRubricPayloads,
  calculateTotalPoints,
  createEmptyQuestion,
  type BuilderQuestion,
  serializeQuestionsToJson,
} from '../features/exams/examQuestions'
import { createExamTemplate, type CreateExamTemplatePayload } from '../features/exams/examsApi'
import { createAnswerRubric } from '../features/rubrics/rubricsApi'

type Step = 1 | 2
type LoadState = 'loading' | 'error' | 'done'
type SubmissionState = 'idle' | 'submitting' | 'error'

function scoreClassMatch(classroom: ClassListItem, query: string): number {
  const normalizedName = classroom.name.trim().toLowerCase()
  const normalizedSubject = classroom.subject.trim().toLowerCase()
  const normalizedPeriod = classroom.period.trim().toLowerCase()

  if (normalizedName === query) {
    return 120
  }

  if (normalizedName.startsWith(query)) {
    return 90
  }

  if (normalizedName.includes(query)) {
    return 75
  }

  if (normalizedSubject.includes(query)) {
    return 45
  }

  if (normalizedPeriod.includes(query)) {
    return 30
  }

  return 0
}

function formatClassMeta(classroom: ClassListItem): string {
  return `${classroom.subject} · ${classroom.period} · ${classroom.schoolYear}`
}

function StepCard({
  index,
  title,
  detail,
  isActive,
  isComplete,
}: {
  index: number
  title: string
  detail: string
  isActive: boolean
  isComplete: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        isActive ? 'border-gold-500/40 bg-gold-500/10' : 'border-subtle bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full font-mono text-sm font-semibold ${
            isActive || isComplete ? 'bg-gold-500 text-navy-950' : 'border border-subtle text-sec'
          }`}
        >
          {isComplete ? '✓' : index}
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-white">{title}</p>
          <p className="font-body text-xs text-sec">{detail}</p>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block font-display text-sm font-medium text-white">
        {label}
      </label>
      {children}
    </div>
  )
}

export default function CreateExamPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [classesLoadState, setClassesLoadState] = useState<LoadState>('loading')
  const [classes, setClasses] = useState<ClassListItem[]>([])
  const [classesError, setClassesError] = useState('')
  const [name, setName] = useState('')
  const [classQuery, setClassQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState<ClassListItem | null>(null)
  const [topic, setTopic] = useState('')
  const [questions, setQuestions] = useState<BuilderQuestion[]>([createEmptyQuestion(1)])
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    fetchClasses()
      .then((classItems) => {
        if (!isMounted) {
          return
        }

        setClasses(classItems)
        setClassesLoadState('done')
        setClassesError('')
      })
      .catch((error) => {
        if (!isMounted) {
          return
        }

        const message = error instanceof Error
          ? error.message
          : 'Classes could not be loaded. Refresh and try again.'
        setClassesError(message)
        setClassesLoadState('error')
      })

    return () => {
      isMounted = false
    }
  }, [])

  const normalizedClassQuery = classQuery.trim().toLowerCase()
  const classSuggestions = useMemo(() => {
    if (!normalizedClassQuery) {
      return []
    }

    return classes
      .map((classroom) => ({
        classroom,
        score: scoreClassMatch(classroom, normalizedClassQuery),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.classroom.name.localeCompare(right.classroom.name))
      .map((item) => item.classroom)
      .slice(0, 5)
  }, [classes, normalizedClassQuery])

  const totalPoints = calculateTotalPoints(questions)
  const isSubmitting = submissionState === 'submitting'

  function selectClass(classroom: ClassListItem) {
    setSelectedClass(classroom)
    setClassQuery(classroom.name)
    setErrorMessage('')
  }

  function resolveSelectedClass(): ClassListItem | null {
    if (selectedClass) {
      return selectedClass
    }

    const fallbackMatch = classSuggestions[0] ?? null
    if (fallbackMatch) {
      selectClass(fallbackMatch)
    }

    return fallbackMatch
  }

  function handleContinue() {
    if (!name.trim()) {
      setErrorMessage('Exam name is required before you can continue.')
      return
    }

    const resolvedClass = resolveSelectedClass()
    if (!resolvedClass) {
      setErrorMessage('Choose a class before you move into rubric design.')
      return
    }

    setErrorMessage('')
    setStep(2)
  }

  async function handleCreateExam() {
    const resolvedClass = resolveSelectedClass()
    if (!resolvedClass) {
      setStep(1)
      setErrorMessage('Choose a class before you create the exam.')
      return
    }

    if (!name.trim()) {
      setStep(1)
      setErrorMessage('Exam name is required before you can create the exam.')
      return
    }

    if (questions.length === 0) {
      setErrorMessage('Add at least one question.')
      setSubmissionState('error')
      return
    }

    const missingCorrect = questions.find(
      (question) => question.type === 'multiple-choice' && question.correctOptionIndex === null,
    )

    if (missingCorrect) {
      setErrorMessage(`Question ${missingCorrect.questionNumber}: select the correct answer.`)
      setSubmissionState('error')
      return
    }

    setSubmissionState('submitting')
    setErrorMessage('')

    try {
      const questionsJson = serializeQuestionsToJson(questions)
      const assignment = await ensureExamAssignmentForClass({
        classId: resolvedClass.id,
        examName: name.trim(),
        topic: topic.trim(),
        totalPoints,
      })

      const payload: CreateExamTemplatePayload = {
        assignmentId: assignment.assignmentId,
        name: name.trim(),
        topic: topic.trim() || undefined,
        totalPoints,
        questionsJson,
      }

      const created = await createExamTemplate(payload)
      const rubricPayloads = buildRubricPayloads(questions)

      if (created.id && rubricPayloads.length > 0) {
        await Promise.all(
          rubricPayloads.map((rubricPayload) => createAnswerRubric(created.id, rubricPayload)),
        )
      }

      navigate('/exams')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'The exam could not be created. Refresh and try again.'
      setErrorMessage(message)
      setSubmissionState('error')
    }
  }

  return (
    <AppPage width="standard">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/exams')}
          className="font-display text-sm font-semibold text-gold-300 transition-colors hover:text-gold-200"
        >
          ← Back to exams
        </button>
      </div>

      <AppPageHeader
        eyebrow="Assessment templates"
        title="Create exam"
        description="Start by choosing a class, then build the answer key and rubric structure question by question."
      />

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <StepCard
          index={1}
          title="Basic information"
          detail="Choose the class and confirm the exam basics."
          isActive={step === 1}
          isComplete={step === 2}
        />
        <StepCard
          index={2}
          title="Rubrics"
          detail="Build the answer key and scoring rules for each question."
          isActive={step === 2}
          isComplete={false}
        />
      </div>

      {errorMessage && (
        <AppNotice tone="danger">
          <p className="font-body text-sm">{errorMessage}</p>
        </AppNotice>
      )}

      {step === 1 && (
        <AppPanel className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">Basic information</h2>
            <p className="mt-2 font-body text-sm leading-6 text-sec">
              Choose a class and set the exam basics before you move into rubric design.
            </p>
          </div>

          <div className="grid gap-5">
            <Field label="Exam name" htmlFor="exam-name">
              <input
                id="exam-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Algebra Midterm"
                className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-gold-500"
              />
            </Field>

            <Field label="Class" htmlFor="exam-class">
              <input
                id="exam-class"
                type="text"
                value={classQuery}
                onChange={(event) => {
                  setClassQuery(event.target.value)
                  if (selectedClass?.name.trim().toLowerCase() !== event.target.value.trim().toLowerCase()) {
                    setSelectedClass(null)
                  }
                }}
                placeholder={classesLoadState === 'loading' ? 'Loading classes…' : 'Search by class name, subject, or period'}
                disabled={classesLoadState === 'loading' || isSubmitting}
                className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-gold-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </Field>

            {classesLoadState === 'error' && (
              <p className="font-body text-sm text-crimson-400">{classesError}</p>
            )}

            {selectedClass && (
              <div className="rounded-2xl border border-teal-500/25 bg-teal-500/10 px-4 py-3">
                <p className="font-display text-sm font-semibold text-white">Connected to {selectedClass.name}</p>
                <p className="mt-1 font-body text-sm text-sec">{formatClassMeta(selectedClass)}</p>
              </div>
            )}

            {!selectedClass && classSuggestions.length > 0 && (
              <div className="rounded-2xl border border-subtle bg-white/[0.03] p-4">
                <p className="font-display text-sm font-semibold text-white">Best matches</p>
                <div className="mt-3 flex flex-col gap-2">
                  {classSuggestions.map((classroom) => (
                    <button
                      key={classroom.id}
                      type="button"
                      onClick={() => selectClass(classroom)}
                      className="rounded-xl border border-subtle px-4 py-3 text-left transition-colors hover:border-gold-500/40 hover:bg-gold-500/10"
                      aria-label={`Use ${classroom.name}`}
                    >
                      <p className="font-display text-sm font-semibold text-white">Use {classroom.name}</p>
                      <p className="mt-1 font-body text-sm text-sec">{formatClassMeta(classroom)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Field label="Topic" htmlFor="exam-topic">
              <input
                id="exam-topic"
                type="text"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Optional unit or focus area"
                className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-gold-500"
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleContinue}
              disabled={classesLoadState !== 'done' || isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-gold-500 px-5 py-3 font-display text-sm font-semibold text-navy-950 transition-colors duration-150 hover:bg-gold-600 disabled:cursor-not-allowed disabled:bg-gold-500/60"
            >
              Continue to rubrics
            </button>
          </div>
        </AppPanel>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <AppPanel className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">Rubrics and answer key</h2>
              <p className="mt-2 font-body text-sm leading-6 text-sec">
                Build the answer key and scoring rules for each question before you publish the exam.
              </p>
            </div>

            {selectedClass && (
              <div className="grid gap-3 rounded-2xl border border-subtle bg-white/[0.03] p-4 md:grid-cols-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Class</p>
                  <p className="mt-2 font-display text-sm font-semibold text-white">{selectedClass.name}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Context</p>
                  <p className="mt-2 font-body text-sm text-sec">{formatClassMeta(selectedClass)}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Live total</p>
                  <p className="mt-2 font-mono text-lg font-semibold text-gold-300">{totalPoints} pts</p>
                </div>
              </div>
            )}

            <ExamBuilder questions={questions} onChange={setQuestions} disabled={isSubmitting} />

            <div className="flex flex-col gap-3 border-t border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3 font-display text-sm font-medium text-gold-300 transition-colors duration-150 hover:bg-gold-500/20 hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Back to basics
              </button>
              <button
                type="button"
                onClick={() => void handleCreateExam()}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-gold-500 px-5 py-3 font-display text-sm font-semibold text-navy-950 transition-colors duration-150 hover:bg-gold-600 disabled:cursor-not-allowed disabled:bg-gold-500/60"
              >
                {isSubmitting ? 'Creating exam…' : 'Create exam'}
              </button>
            </div>
          </AppPanel>
        </div>
      )}
    </AppPage>
  )
}