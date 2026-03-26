import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchExamTemplateById } from '../features/exams/examsApi'
import { parseExamQuestions } from '../features/exams/examQuestions'
import type { ExamTemplateListItem } from '../features/exams/examsTypes'
import {
  createAnswerRubric,
  fetchAnswerRubrics,
  type AnswerRubric,
  uploadAnswerRubricImage,
  updateAnswerRubric,
} from '../features/rubrics/rubricsApi'

interface RubricDraft {
  answerText: string
  answerImageUrl: string
  pointsAvailable: string
  acceptableVariations: string
  gradingNotes: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Failed to save the rubric. Please try again.'
}

export default function ExamRubricPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const [exam, setExam] = useState<ExamTemplateListItem | null>(null)
  const [rubrics, setRubrics] = useState<AnswerRubric[]>([])
  const [drafts, setDrafts] = useState<Record<number, RubricDraft>>({})
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({})
  const [saveMessages, setSaveMessages] = useState<Record<number, string>>({})
  const [imageUploadStates, setImageUploadStates] = useState<Record<number, SaveState>>({})
  const [imageUploadMessages, setImageUploadMessages] = useState<Record<number, string>>({})

  const questions = useMemo(() => parseExamQuestions(exam?.questionsJson), [exam?.questionsJson])
  const requiredRubricCount = questions.length > 0 ? questions.length : exam?.questionCount ?? 0
  const configuredRubricCount = useMemo(
    () => new Set(rubrics.map((rubric) => rubric.questionNumber)).size,
    [rubrics],
  )

  useEffect(() => {
    if (!examId) {
      setLoadState('error')
      setLoadError('Exam template not found.')
      return
    }

    let cancelled = false

    async function load() {
      setLoadState('loading')
      setLoadError('')

      try {
        const [loadedExam, loadedRubrics] = await Promise.all([
          fetchExamTemplateById(examId),
          fetchAnswerRubrics(examId),
        ])

        if (cancelled) {
          return
        }

        setExam(loadedExam)
        setRubrics(loadedRubrics)
        setLoadState('ready')
      } catch (error) {
        if (cancelled) {
          return
        }

        setLoadState('error')
        setLoadError(getErrorMessage(error))
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [examId])

  useEffect(() => {
    if (questions.length === 0) {
      setDrafts({})
      return
    }

    const rubricsByQuestionNumber = new Map(rubrics.map((rubric) => [rubric.questionNumber, rubric]))
    const nextDrafts: Record<number, RubricDraft> = {}

    for (const question of questions) {
      const rubric = rubricsByQuestionNumber.get(question.questionNumber)
      nextDrafts[question.questionNumber] = {
        answerText: rubric?.answerText ?? '',
        answerImageUrl: rubric?.answerImageUrl ?? '',
        pointsAvailable: rubric?.pointsAvailable != null
          ? String(rubric.pointsAvailable)
          : question.pointsAvailable != null
            ? String(question.pointsAvailable)
            : '',
        acceptableVariations: rubric?.acceptableVariations ?? '',
        gradingNotes: rubric?.gradingNotes ?? '',
      }
    }

    setDrafts(nextDrafts)
  }, [questions, rubrics])

  async function handleSave(questionNumber: number) {
    if (!exam) {
      return
    }

    const draft = drafts[questionNumber]
    if (!draft || (!draft.answerText.trim() && !draft.answerImageUrl.trim())) {
      setSaveStates((current) => ({ ...current, [questionNumber]: 'error' }))
      setSaveMessages((current) => ({
        ...current,
        [questionNumber]: 'Add either expected answer text or a teacher answer image before saving this rubric.',
      }))
      return
    }

    const pointsAvailable = Number(draft.pointsAvailable)
    if (!Number.isFinite(pointsAvailable) || pointsAvailable <= 0) {
      setSaveStates((current) => ({ ...current, [questionNumber]: 'error' }))
      setSaveMessages((current) => ({
        ...current,
        [questionNumber]: 'Points available must be a positive number.',
      }))
      return
    }

    setSaveStates((current) => ({ ...current, [questionNumber]: 'saving' }))
    setSaveMessages((current) => ({ ...current, [questionNumber]: '' }))

    const existingRubric = rubrics.find((rubric) => rubric.questionNumber === questionNumber)
    const imageWasRemoved = Boolean(existingRubric?.answerImageUrl) && draft.answerImageUrl.trim() === ''
    const payload = {
      questionNumber,
      answerText: draft.answerText.trim() || undefined,
      answerImageUrl: imageWasRemoved ? '' : draft.answerImageUrl.trim() || undefined,
      pointsAvailable,
      acceptableVariations: draft.acceptableVariations.trim() || undefined,
      gradingNotes: draft.gradingNotes.trim() || undefined,
    }

    try {
      const savedRubric = existingRubric
        ? await updateAnswerRubric(exam.id, existingRubric.id, payload)
        : await createAnswerRubric(exam.id, payload)

      setRubrics((current) => {
        const otherRubrics = current.filter((rubric) => rubric.questionNumber !== questionNumber)
        return [...otherRubrics, savedRubric].sort((left, right) => left.questionNumber - right.questionNumber)
      })
      setSaveStates((current) => ({ ...current, [questionNumber]: 'saved' }))
      setSaveMessages((current) => ({ ...current, [questionNumber]: 'Rubric saved.' }))
    } catch (error) {
      setSaveStates((current) => ({ ...current, [questionNumber]: 'error' }))
      setSaveMessages((current) => ({ ...current, [questionNumber]: getErrorMessage(error) }))
    }
  }

  async function handleImageUpload(questionNumber: number, file: File | null) {
    if (!exam || !file) {
      return
    }

    setImageUploadStates((current) => ({ ...current, [questionNumber]: 'saving' }))
    setImageUploadMessages((current) => ({ ...current, [questionNumber]: '' }))

    try {
      const uploadedImage = await uploadAnswerRubricImage(exam.id, file)
      setDrafts((current) => ({
        ...current,
        [questionNumber]: {
          ...current[questionNumber],
          answerImageUrl: uploadedImage.fileUrl,
        },
      }))
      setImageUploadStates((current) => ({ ...current, [questionNumber]: 'saved' }))
      setImageUploadMessages((current) => ({
        ...current,
        [questionNumber]: `Uploaded ${uploadedImage.fileName}. Save the rubric to keep it on this question.`,
      }))
    } catch (error) {
      setImageUploadStates((current) => ({ ...current, [questionNumber]: 'error' }))
      setImageUploadMessages((current) => ({ ...current, [questionNumber]: getErrorMessage(error) }))
    }
  }

  function handleImageClear(questionNumber: number) {
    updateDraft(questionNumber, 'answerImageUrl', '')
    setImageUploadStates((current) => ({ ...current, [questionNumber]: 'idle' }))
    setImageUploadMessages((current) => ({
      ...current,
      [questionNumber]: 'Teacher answer image removed. Save the rubric to keep this change.',
    }))
  }

  function updateDraft(questionNumber: number, field: keyof RubricDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [questionNumber]: {
        ...current[questionNumber],
        [field]: value,
      },
    }))

    if (saveStates[questionNumber] === 'saved' || saveStates[questionNumber] === 'error') {
      setSaveStates((current) => ({ ...current, [questionNumber]: 'idle' }))
      setSaveMessages((current) => ({ ...current, [questionNumber]: '' }))
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '980px' }}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between" style={{ marginBottom: '28px' }}>
        <div>
          <p
            className="font-mono"
            style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}
          >
            AI Grading Setup
          </p>
          <h1 className="font-display" style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Answer Rubrics
          </h1>
          <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
            Add the expected answers and scoring rules the AI should use for this exam.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(exam ? `/exams/${encodeURIComponent(exam.id)}` : '/exams')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-display font-semibold text-sm transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            ← Back to Grading
          </button>
          <Link
            to="/exams"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-display font-semibold text-sm transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            All Exams
          </Link>
        </div>
      </div>

      {loadState === 'loading' && (
        <div
          className="rounded-xl p-6 font-body text-sm"
          role="status"
          aria-live="polite"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          Loading rubric setup…
        </div>
      )}

      {loadState === 'error' && (
        <div
          className="rounded-xl p-6 space-y-2"
          role="alert"
          style={{ background: 'rgba(232, 69, 90, 0.08)', border: '1px solid rgba(232, 69, 90, 0.25)' }}
        >
          <p className="font-display font-semibold text-sm" style={{ color: 'var(--accent-crimson)' }}>
            Failed to load rubric setup
          </p>
          <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
            {loadError}
          </p>
        </div>
      )}

      {loadState === 'ready' && exam && (
        <div className="space-y-6">
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {exam.title}
                </h2>
                <p className="font-body text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Configure one rubric entry per question before using AI grading.
                </p>
              </div>
              <div
                className="rounded-lg px-4 py-3 text-sm font-mono"
                style={{ background: 'rgba(0, 201, 167, 0.06)', border: '1px solid rgba(0, 201, 167, 0.18)', color: 'var(--text-secondary)' }}
              >
                <div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Configured:</span>{' '}
                  {configuredRubricCount}/{requiredRubricCount || questions.length}
                </div>
                <div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Status:</span>{' '}
                  {requiredRubricCount > 0 && configuredRubricCount >= requiredRubricCount ? 'Ready for AI grading' : 'Rubric setup required'}
                </div>
              </div>
            </div>
          </div>

          {questions.length === 0 ? (
            <div
              className="rounded-xl p-6 space-y-2"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                No structured questions found
              </p>
              <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
                This exam template does not expose question definitions from its questions JSON yet, so rubric setup cannot be completed from this page.
              </p>
              <Link to="/exams" className="text-sm underline" style={{ color: 'var(--accent-gold)' }}>
                Return to Exams
              </Link>
            </div>
          ) : (
            questions.map((question) => {
              const draft = drafts[question.questionNumber] ?? {
                answerText: '',
                answerImageUrl: '',
                pointsAvailable: '',
                acceptableVariations: '',
                gradingNotes: '',
              }
              const saveState = saveStates[question.questionNumber] ?? 'idle'
              const saveMessage = saveMessages[question.questionNumber] ?? ''
              const imageUploadState = imageUploadStates[question.questionNumber] ?? 'idle'
              const imageUploadMessage = imageUploadMessages[question.questionNumber] ?? ''

              return (
                <section
                  key={question.questionNumber}
                  className="rounded-xl p-6 space-y-4"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                        Question {question.questionNumber}
                      </p>
                      <p className="font-body text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {question.prompt}
                      </p>
                    </div>
                    <div className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Suggested points: {question.pointsAvailable ?? 'Not provided'}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor={`rubric-answer-${question.questionNumber}`}
                      className="font-display text-xs font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Expected answer
                    </label>
                    <textarea
                      id={`rubric-answer-${question.questionNumber}`}
                      value={draft.answerText}
                      onChange={(event) => updateDraft(question.questionNumber, 'answerText', event.target.value)}
                      rows={4}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body resize-y"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    <p className="font-body text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      You can save with typed text, a handwritten answer image, or both.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={`rubric-image-${question.questionNumber}`}
                      className="font-display text-xs font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Upload or replace teacher answer image
                    </label>
                    <input
                      id={`rubric-image-${question.questionNumber}`}
                      type="file"
                      accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic"
                      onChange={(event) => {
                        const [file] = Array.from(event.target.files ?? [])
                        void handleImageUpload(question.questionNumber, file ?? null)
                        event.currentTarget.value = ''
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-sm font-body"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    {draft.answerImageUrl && (
                      <div
                        className="rounded-lg p-3 space-y-2"
                        style={{ background: 'rgba(91, 197, 245, 0.06)', border: '1px solid rgba(91, 197, 245, 0.18)' }}
                      >
                        <p className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Uploaded teacher answer image
                        </p>
                        <img
                          src={draft.answerImageUrl}
                          alt={`Teacher answer for question ${question.questionNumber}`}
                          className="max-h-48 rounded-lg border"
                          style={{ borderColor: 'var(--border)' }}
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleImageClear(question.questionNumber)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-display font-semibold"
                            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                          >
                            Remove image
                          </button>
                        </div>
                      </div>
                    )}
                    {imageUploadMessage && (
                      <p className="font-body text-xs" style={{ color: imageUploadState === 'error' ? 'var(--accent-crimson)' : 'var(--text-secondary)' }}>
                        {imageUploadMessage}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`rubric-points-${question.questionNumber}`}
                        className="font-display text-xs font-medium"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Points available
                      </label>
                      <input
                        id={`rubric-points-${question.questionNumber}`}
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={draft.pointsAvailable}
                        onChange={(event) => updateDraft(question.questionNumber, 'pointsAvailable', event.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor={`rubric-variations-${question.questionNumber}`}
                        className="font-display text-xs font-medium"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Acceptable variations
                      </label>
                      <textarea
                        id={`rubric-variations-${question.questionNumber}`}
                        value={draft.acceptableVariations}
                        onChange={(event) => updateDraft(question.questionNumber, 'acceptableVariations', event.target.value)}
                        rows={3}
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body resize-y"
                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor={`rubric-notes-${question.questionNumber}`}
                      className="font-display text-xs font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Grading notes
                    </label>
                    <textarea
                      id={`rubric-notes-${question.questionNumber}`}
                      value={draft.gradingNotes}
                      onChange={(event) => updateDraft(question.questionNumber, 'gradingNotes', event.target.value)}
                      rows={3}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body resize-y"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="font-body text-xs" style={{ color: saveState === 'error' ? 'var(--accent-crimson)' : 'var(--text-secondary)' }}>
                      {saveMessage}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSave(question.questionNumber)}
                      disabled={saveState === 'saving'}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-display font-semibold text-sm transition-opacity"
                      style={{ background: 'var(--accent-gold)', color: '#06101e', opacity: saveState === 'saving' ? 0.7 : 1 }}
                    >
                      {saveState === 'saving' ? 'Saving…' : `Save Question ${question.questionNumber} Rubric`}
                    </button>
                  </div>
                </section>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}