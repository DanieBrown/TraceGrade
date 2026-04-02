import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AppNotice, AppPage, AppPageHeader, AppPanel } from '../components/layout/AppPage'
import type { GradingResultResponse, QuestionScore } from '../features/grading/gradingApi'
import { fetchPendingReviewByGradeId, submitReview } from '../features/review/reviewApi'

type LoadState = 'loading' | 'error' | 'done'

interface QuestionDraft {
  pointsAwarded: number
  rationale: string
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function confidenceClasses(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/25' }
  if (score >= 60) return { text: 'text-gold-300', bg: 'bg-gold-500/10 border-gold-500/25' }
  return { text: 'text-crimson-400', bg: 'bg-crimson-500/10 border-crimson-500/25' }
}

function parseQuestionScores(payload: string): QuestionScore[] {
  try {
    const parsed = JSON.parse(payload) as QuestionScore[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function ManualReviewDetailPage() {
  const { gradeId = '' } = useParams<{ gradeId: string }>()
  const navigate = useNavigate()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [result, setResult] = useState<GradingResultResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState('Unable to load manual grading details.')
  const [questionDrafts, setQuestionDrafts] = useState<Record<number, QuestionDraft>>({})
  const [saving, setSaving] = useState(false)

  const parsedQuestions = useMemo(() => parseQuestionScores(result?.questionScores ?? '[]'), [result?.questionScores])

  useEffect(() => {
    if (!result) {
      return
    }

    setQuestionDrafts(
      Object.fromEntries(
        parsedQuestions.map((question) => [
          question.questionNumber,
          {
            pointsAwarded: question.pointsAwarded,
            rationale: '',
          },
        ]),
      ),
    )
  }, [parsedQuestions, result])

  const loadReview = useCallback(async () => {
    setLoadState('loading')
    setErrorMessage('Unable to load manual grading details.')

    try {
      const pendingReview = await fetchPendingReviewByGradeId(gradeId)

      if (!pendingReview) {
        setResult(null)
        setLoadState('done')
        return
      }

      setResult(pendingReview)
      setLoadState('done')
    } catch (error) {
      setResult(null)
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load manual grading details.')
      setLoadState('error')
    }
  }, [gradeId])

  useEffect(() => {
    void loadReview()
  }, [loadReview])

  const totalAvailable = useMemo(
    () => parsedQuestions.reduce((sum, question) => sum + question.pointsAvailable, 0),
    [parsedQuestions],
  )
  const totalAdjusted = useMemo(
    () => parsedQuestions.reduce((sum, question) => sum + (questionDrafts[question.questionNumber]?.pointsAwarded ?? question.pointsAwarded), 0),
    [parsedQuestions, questionDrafts],
  )
  const finalPercentage = totalAvailable > 0 ? (totalAdjusted / totalAvailable) * 100 : 0

  const handleDraftChange = useCallback((questionNumber: number, updates: Partial<QuestionDraft>) => {
    setQuestionDrafts((previous) => ({
      ...previous,
      [questionNumber]: {
        pointsAwarded: previous[questionNumber]?.pointsAwarded ?? 0,
        rationale: previous[questionNumber]?.rationale ?? '',
        ...updates,
      },
    }))
  }, [])

  const handleApproveAi = useCallback(async () => {
    if (!result) {
      return
    }

    setSaving(true)
    try {
      await submitReview(String(result.gradeId), {
        finalScore: result.aiScore,
        teacherOverride: false,
      })
      toast.success('AI grade approved and saved to the student record.')
      navigate('/review')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save AI approval.')
    } finally {
      setSaving(false)
    }
  }, [navigate, result])

  const handleSaveFinalGrade = useCallback(async () => {
    if (!result) {
      return
    }

    const updatedQuestions = parsedQuestions.map((question) => ({
      ...question,
      pointsAwarded: questionDrafts[question.questionNumber]?.pointsAwarded ?? question.pointsAwarded,
    }))
    const overrideReason = parsedQuestions
      .map((question) => {
        const rationale = questionDrafts[question.questionNumber]?.rationale.trim() ?? ''
        return rationale ? `Q${question.questionNumber}: ${rationale}` : null
      })
      .filter((value): value is string => Boolean(value))
      .join('\n\n')

    setSaving(true)
    try {
      await submitReview(String(result.gradeId), {
        finalScore: finalPercentage,
        teacherOverride: true,
        questionScores: JSON.stringify(updatedQuestions),
        overrideReason: overrideReason || undefined,
      })
      toast.success('Manual grading saved to the student record.')
      navigate('/review')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save manual grading.')
    } finally {
      setSaving(false)
    }
  }, [finalPercentage, navigate, parsedQuestions, questionDrafts, result])

  if (loadState === 'loading') {
    return (
      <AppPage width="standard">
        <AppPageHeader
          eyebrow="Manual review"
          title="Manual Grading"
          description="Loading the flagged submission and question breakdown."
        />
        <AppPanel className="py-16">
          <div className="flex items-center justify-center gap-3 font-display text-sm text-sec">
            <span className="animate-spin text-lg" aria-hidden="true">⟳</span>
            <span>Loading manual grading workspace…</span>
          </div>
        </AppPanel>
      </AppPage>
    )
  }

  if (loadState === 'error') {
    return (
      <AppPage width="standard">
        <AppPageHeader
          eyebrow="Manual review"
          title="Manual Grading"
          description="The selected review item could not be opened."
          actions={(
            <Link
              to="/review"
              className="inline-flex items-center rounded-xl border border-subtle px-4 py-2 text-sm font-display font-semibold text-sec transition-colors hover:bg-white/[0.05]"
            >
              ← Back to Queue
            </Link>
          )}
        />
        <AppNotice tone="danger">
          <p className="font-body text-sm text-white/85">{errorMessage}</p>
        </AppNotice>
      </AppPage>
    )
  }

  if (!result) {
    return (
      <AppPage width="standard">
        <AppPageHeader
          eyebrow="Manual review"
          title="Manual Grading"
          description="This submission is no longer waiting in the manual review queue."
          actions={(
            <Link
              to="/review"
              className="inline-flex items-center rounded-xl border border-subtle px-4 py-2 text-sm font-display font-semibold text-sec transition-colors hover:bg-white/[0.05]"
            >
              ← Back to Queue
            </Link>
          )}
        />
        <AppNotice>
          <p className="font-body text-sm text-white/85">
            The grade was already reviewed or is no longer available in the active queue.
          </p>
        </AppNotice>
      </AppPage>
    )
  }

  return (
    <AppPage width="wide">
      <AppPageHeader
        eyebrow="Manual review"
        title="Manual Grading"
        description="Work question-by-question, add scoring rationale, and save the final grade back to the student record."
        actions={(
          <Link
            to="/review"
            className="inline-flex items-center rounded-xl border border-subtle px-4 py-2 text-sm font-display font-semibold text-sec transition-colors hover:bg-white/[0.05]"
          >
            ← Back to Queue
          </Link>
        )}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <AppPanel className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Submission</p>
          <p className="font-display text-xl font-semibold text-white">{String(result.submissionId).slice(0, 8)}…</p>
          <p className="font-body text-sm text-sec">Review every question before finalising the saved score.</p>
        </AppPanel>
        <AppPanel className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">AI Score</p>
          <p className="font-mono text-3xl font-semibold text-white">{formatScore(parsedQuestions.reduce((sum, question) => sum + question.pointsAwarded, 0))}<span className="text-sm text-sec"> / {formatScore(totalAvailable)}</span></p>
          <p className="font-body text-sm text-sec">Use this as the starting point, not the final answer.</p>
        </AppPanel>
        <AppPanel className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Final Grade</p>
          <p className="font-mono text-3xl font-semibold text-gold-300">{formatScore(finalPercentage)}%</p>
          <p className="font-body text-sm text-sec">Calculated from your manual question-by-question scoring.</p>
        </AppPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.85fr)]">
        <AppPanel>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">Question-by-Question Scoring</h2>
              <p className="mt-1 font-body text-sm text-sec">Capture the teacher rationale that explains each manual score change.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceClasses(Number(result.confidenceScore)).bg} ${confidenceClasses(Number(result.confidenceScore)).text}`}>
              {formatScore(Number(result.confidenceScore))}% confidence
            </span>
          </div>

          <div className="space-y-4">
            {parsedQuestions.map((question) => {
              const cls = confidenceClasses(question.confidenceScore)
              const draft = questionDrafts[question.questionNumber]

              return (
                <section key={question.questionNumber} className="rounded-2xl border border-subtle bg-white/[0.03] px-5 py-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold text-white">Question {question.questionNumber}</h3>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${cls.bg} ${cls.text}`}>
                          {formatScore(question.confidenceScore)}% confidence
                        </span>
                        {question.illegible && (
                          <span className="rounded-full border border-crimson-500/25 bg-crimson-500/10 px-2.5 py-1 text-xs font-medium text-crimson-400">
                            Illegible
                          </span>
                        )}
                      </div>
                      <p className="mt-2 font-body text-sm text-sec">{question.feedback || 'No AI rationale was provided for this question.'}</p>
                    </div>

                    <div className="min-w-40">
                      <label className="space-y-1.5 block">
                        <span className="font-body text-xs uppercase tracking-wide text-sec">Manual Score</span>
                        <input
                          type="number"
                          min={0}
                          max={question.pointsAvailable}
                          step={0.5}
                          value={draft?.pointsAwarded ?? question.pointsAwarded}
                          onChange={(event) => {
                            const nextValue = Number.parseFloat(event.target.value)
                            if (Number.isNaN(nextValue)) {
                              return
                            }

                            handleDraftChange(question.questionNumber, {
                              pointsAwarded: Math.min(Math.max(nextValue, 0), question.pointsAvailable),
                            })
                          }}
                          className="w-full rounded-xl border border-subtle bg-elevated px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gold-500/40 focus:ring-2 focus:ring-gold-500/20"
                        />
                      </label>
                      <p className="mt-1 text-xs text-sec">Out of {formatScore(question.pointsAvailable)} points</p>
                    </div>
                  </div>

                  <label className="mt-4 block space-y-1.5">
                    <span className="font-body text-xs uppercase tracking-wide text-sec">Scoring Rationale</span>
                    <textarea
                      value={draft?.rationale ?? ''}
                      onChange={(event) => handleDraftChange(question.questionNumber, { rationale: event.target.value })}
                      rows={4}
                      placeholder="Explain why this final score reflects the student's work."
                      className="w-full rounded-2xl border border-subtle bg-elevated px-3 py-3 text-sm text-white outline-none transition-colors focus:border-gold-500/40 focus:ring-2 focus:ring-gold-500/20"
                    />
                  </label>
                </section>
              )
            })}
          </div>
        </AppPanel>

        <AppPanel>
          <h2 className="font-display text-xl font-semibold text-white">Review Summary</h2>
          <div className="mt-5 space-y-3 rounded-2xl border border-subtle bg-white/[0.03] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-sec">Adjusted points</span>
              <span className="font-mono text-white">{formatScore(totalAdjusted)} / {formatScore(totalAvailable)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-sec">Final percentage</span>
              <span className="font-mono text-gold-300">{formatScore(finalPercentage)}%</span>
            </div>
            {result.aiFeedback && (
              <div className="border-t border-subtle pt-3">
                <p className="font-body text-xs uppercase tracking-wide text-sec">AI Summary</p>
                <p className="mt-2 font-body text-sm text-sec">{result.aiFeedback}</p>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={handleSaveFinalGrade}
              disabled={saving}
              className="w-full rounded-xl bg-gold-500 px-4 py-3 text-sm font-display font-semibold text-navy-950 transition-colors hover:bg-gold-600 disabled:opacity-60"
            >
              {saving ? 'Saving final grade…' : 'Save Final Grade'}
            </button>
            <button
              type="button"
              onClick={handleApproveAi}
              disabled={saving}
              className="w-full rounded-xl border border-subtle bg-white/[0.03] px-4 py-3 text-sm font-display font-semibold text-white transition-colors hover:bg-white/[0.06] disabled:opacity-60"
            >
              Approve AI Score As-Is
            </button>
          </div>
        </AppPanel>
      </div>
    </AppPage>
  )
}