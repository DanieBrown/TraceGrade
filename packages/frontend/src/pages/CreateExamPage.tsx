import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import {
  createExamTemplate,
  fetchExamTemplateById,
  updateExamTemplate,
  type CreateExamTemplatePayload,
} from '../features/exams/examsApi'
import type { ExamTemplateListItem } from '../features/exams/examsTypes'
import {
  createAnswerRubric,
  fetchAnswerRubrics,
  updateAnswerRubric,
  type AnswerRubric,
} from '../features/rubrics/rubricsApi'

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toQuestionArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (!isRecord(value) || !Array.isArray(value.questions)) {
    return []
  }

  return value.questions
}

function toTrimmedString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const normalizedValue = value.trim()
  return normalizedValue.length > 0 ? normalizedValue : fallback
}

function toNonNegativeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : fallback
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value.trim())
    return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback
  }

  return fallback
}

function buildDefaultOptions() {
  return [
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' },
  ]
}

function parseQuestionType(value: unknown): BuilderQuestion['type'] {
  if (value === 'multiple-choice' || value === 'multi-part' || value === 'open-ended') {
    return value
  }

  return 'open-ended'
}

function buildInlineRubric(rubric: AnswerRubric | undefined, fallbackPoints: number) {
  return {
    answerText: rubric?.answerText ?? '',
    answerImageUrl: rubric?.answerImageUrl ?? '',
    pointsAvailable: rubric?.pointsAvailable ?? fallbackPoints,
    acceptableVariations: rubric?.acceptableVariations ?? '',
    gradingNotes: rubric?.gradingNotes ?? '',
  }
}

function buildMultipleChoiceOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return buildDefaultOptions()
  }

  const options = value.flatMap((option, index) => {
    if (typeof option === 'string') {
      return [{ label: String.fromCharCode(65 + index), text: option }]
    }

    if (!isRecord(option)) {
      return []
    }

    const label = toTrimmedString(option.label, String.fromCharCode(65 + index))
    const text = toTrimmedString(option.text ?? option.value)
    return [{ label, text }]
  })

  return options.length > 0 ? options : buildDefaultOptions()
}

function resolveCorrectOptionIndex(
  value: unknown,
  options: Array<{ label: string; text: string }>,
  rubricAnswerText?: string,
): number | null {
  const numericValue = toNonNegativeNumber(value, -1)
  if (Number.isInteger(numericValue) && numericValue >= 0 && numericValue < options.length) {
    return numericValue
  }

  if (!rubricAnswerText) {
    return null
  }

  const [answerLabel = '', ...answerTextParts] = rubricAnswerText.split(':')
  const normalizedAnswerLabel = answerLabel.trim().toUpperCase()
  if (normalizedAnswerLabel) {
    const labelMatchIndex = options.findIndex(
      (option) => option.label.trim().toUpperCase() === normalizedAnswerLabel,
    )
    if (labelMatchIndex >= 0) {
      return labelMatchIndex
    }
  }

  const normalizedAnswerText = answerTextParts.join(':').trim().toLowerCase()
  if (!normalizedAnswerText) {
    return null
  }

  const textMatchIndex = options.findIndex(
    (option) => option.text.trim().toLowerCase() === normalizedAnswerText,
  )
  return textMatchIndex >= 0 ? textMatchIndex : null
}

function hydrateBuilderQuestions(template: ExamTemplateListItem, rubrics: AnswerRubric[]): BuilderQuestion[] {
  if (!template.questionsJson?.trim()) {
    return [createEmptyQuestion(1)]
  }

  try {
    const parsedQuestions = toQuestionArray(JSON.parse(template.questionsJson))
    const rubricsByQuestionNumber = new Map(rubrics.map((rubric) => [rubric.questionNumber, rubric]))
    const questions = parsedQuestions.flatMap((item, index) => {
      if (!isRecord(item)) {
        return []
      }

      const questionNumber = toNonNegativeNumber(item.questionNumber ?? item.number, index + 1)
      const prompt = toTrimmedString(item.prompt ?? item.question ?? item.text, `Question ${questionNumber}`)
      const questionType = parseQuestionType(
        item.type ?? (Array.isArray(item.subQuestions) ? 'multi-part' : Array.isArray(item.options) ? 'multiple-choice' : 'open-ended'),
      )

      if (questionType === 'multi-part') {
        const subQuestions = (Array.isArray(item.subQuestions) ? item.subQuestions : []).flatMap((subQuestion, subIndex) => {
          if (!isRecord(subQuestion)) {
            return []
          }

          const subQuestionNumber = questionNumber * 100 + (subIndex + 1)
          const pointsAvailable = toNonNegativeNumber(subQuestion.pointsAvailable ?? subQuestion.points, 0)
          return [{
            id: `sub-${questionNumber}-${subIndex + 1}`,
            prompt: toTrimmedString(subQuestion.prompt ?? subQuestion.question ?? subQuestion.text, `Part ${subIndex + 1}`),
            pointsAvailable,
            rubric: buildInlineRubric(rubricsByQuestionNumber.get(subQuestionNumber), pointsAvailable),
          }]
        })

        return [{
          id: `question-${questionNumber}`,
          questionNumber,
          type: 'multi-part' as const,
          prompt,
          pointsAvailable: subQuestions.reduce((total, subQuestion) => total + subQuestion.pointsAvailable, 0),
          options: [],
          correctOptionIndex: null,
          subQuestions,
          rubric: buildInlineRubric(undefined, 0),
        }]
      }

      const pointsAvailable = toNonNegativeNumber(item.pointsAvailable ?? item.points, 0)
      if (questionType === 'open-ended') {
        return [{
          id: `question-${questionNumber}`,
          questionNumber,
          type: 'open-ended' as const,
          prompt,
          pointsAvailable,
          options: [],
          correctOptionIndex: null,
          subQuestions: [],
          rubric: buildInlineRubric(rubricsByQuestionNumber.get(questionNumber), pointsAvailable),
        }]
      }

      const options = buildMultipleChoiceOptions(item.options)
      const rubric = rubricsByQuestionNumber.get(questionNumber)

      return [{
        id: `question-${questionNumber}`,
        questionNumber,
        type: 'multiple-choice' as const,
        prompt,
        pointsAvailable,
        options,
        correctOptionIndex: resolveCorrectOptionIndex(item.correctOptionIndex, options, rubric?.answerText ?? undefined),
        subQuestions: [],
        rubric: buildInlineRubric(undefined, pointsAvailable),
      }]
    })

    return questions.length > 0 ? questions : [createEmptyQuestion(1)]
  } catch {
    return [createEmptyQuestion(1)]
  }
}

export default function CreateExamPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const examId = searchParams.get('examId')?.trim() ?? ''
  const isEditMode = examId.length > 0
  const [step, setStep] = useState<Step>(1)
  const [classesLoadState, setClassesLoadState] = useState<LoadState>('loading')
  const [editorLoadState, setEditorLoadState] = useState<LoadState>(isEditMode ? 'loading' : 'done')
  const [classes, setClasses] = useState<ClassListItem[]>([])
  const [loadedRubrics, setLoadedRubrics] = useState<AnswerRubric[]>([])
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

  useEffect(() => {
    if (!isEditMode) {
      setEditorLoadState('done')
      setLoadedRubrics([])
      return
    }

    let isMounted = true

    setEditorLoadState('loading')

    Promise.all([fetchExamTemplateById(examId), fetchAnswerRubrics(examId)])
      .then(([loadedExam, existingRubrics]) => {
        if (!isMounted) {
          return
        }

        setName(loadedExam.title)
        setTopic(loadedExam.topic ?? '')
        setClassQuery('')
        setSelectedClass(null)
        setQuestions(hydrateBuilderQuestions(loadedExam, existingRubrics))
        setLoadedRubrics(existingRubrics)
        setSubmissionState('idle')
        setErrorMessage('')
        setStep(1)
        setEditorLoadState('done')
      })
      .catch((error) => {
        if (!isMounted) {
          return
        }

        const message = error instanceof Error
          ? error.message
          : 'The exam could not be loaded. Refresh and try again.'
        setErrorMessage(message)
        setSubmissionState('error')
        setEditorLoadState('error')
      })

    return () => {
      isMounted = false
    }
  }, [examId, isEditMode])

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
  const isHydratingExam = editorLoadState === 'loading'
  const isBusy = isSubmitting || isHydratingExam

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
    if (isHydratingExam) {
      return
    }

    if (!name.trim()) {
      setErrorMessage('Exam name is required before you can continue.')
      return
    }

    if (!isEditMode) {
      const resolvedClass = resolveSelectedClass()
      if (!resolvedClass) {
        setErrorMessage('Choose a class before you move into rubric design.')
        return
      }
    }

    setErrorMessage('')
    setStep(2)
  }

  async function handleSubmitExam() {
    if (!name.trim()) {
      setStep(1)
      setErrorMessage('Exam name is required before you can create the exam.')
      return
    }

    let resolvedClass: ClassListItem | null = null
    if (!isEditMode) {
      resolvedClass = resolveSelectedClass()
      if (!resolvedClass) {
        setStep(1)
        setErrorMessage('Choose a class before you create the exam.')
        return
      }
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
      const rubricPayloads = buildRubricPayloads(questions)

      if (isEditMode) {
        await updateExamTemplate(examId, {
          name: name.trim(),
          topic: topic.trim() || undefined,
          totalPoints,
          questionsJson,
        })

        if (rubricPayloads.length > 0) {
          const savedRubrics = await Promise.all(
            rubricPayloads.map((rubricPayload) => {
              const existingRubric = loadedRubrics.find(
                (rubric) => rubric.questionNumber === rubricPayload.questionNumber,
              )

              return existingRubric
                ? updateAnswerRubric(examId, existingRubric.id, rubricPayload)
                : createAnswerRubric(examId, rubricPayload)
            }),
          )

          setLoadedRubrics((currentRubrics) => {
            const remainingRubrics = currentRubrics.filter(
              (rubric) => !savedRubrics.some((savedRubric) => savedRubric.questionNumber === rubric.questionNumber),
            )
            return [...remainingRubrics, ...savedRubrics].sort(
              (leftRubric, rightRubric) => leftRubric.questionNumber - rightRubric.questionNumber,
            )
          })
        }
      } else {
        const assignment = await ensureExamAssignmentForClass({
          classId: resolvedClass!.id,
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

        if (created.id && rubricPayloads.length > 0) {
          await Promise.all(
            rubricPayloads.map((rubricPayload) => createAnswerRubric(created.id, rubricPayload)),
          )
        }
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
        title={isEditMode ? 'Edit exam' : 'Create exam'}
        description={isEditMode
          ? 'Update the exam basics and rubric structure from the same full-page builder.'
          : 'Start by choosing a class, then build the answer key and rubric structure question by question.'}
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

      {isEditMode && isHydratingExam && (
        <AppNotice>
          <p className="font-body text-sm text-white/85">Loading the existing exam details and answer rubrics.</p>
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
                disabled={isBusy}
                className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-gold-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                disabled={(!isEditMode && classesLoadState === 'loading') || isBusy}
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
                disabled={isBusy}
                className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-gold-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleContinue}
              disabled={((!isEditMode && classesLoadState !== 'done') || isBusy)}
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
                disabled={isBusy}
                className="inline-flex items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3 font-display text-sm font-medium text-gold-300 transition-colors duration-150 hover:bg-gold-500/20 hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Back to basics
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitExam()}
                disabled={isBusy}
                className="inline-flex items-center justify-center rounded-xl bg-gold-500 px-5 py-3 font-display text-sm font-semibold text-navy-950 transition-colors duration-150 hover:bg-gold-600 disabled:cursor-not-allowed disabled:bg-gold-500/60"
              >
                {isSubmitting ? (isEditMode ? 'Saving changes…' : 'Creating exam…') : isEditMode ? 'Save exam changes' : 'Create exam'}
              </button>
            </div>
          </AppPanel>
        </div>
      )}
    </AppPage>
  )
}