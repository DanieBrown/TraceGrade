import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppNotice, AppPage, AppPageHeader, AppPanel } from '../components/layout/AppPage'
import ExamBuilder from '../features/exams/ExamBuilder'
import {
  calculateHomeworkTotalPoints,
  createEmptyHomeworkQuestion,
  getHomeworkMaterialValidationError,
  serializeHomeworkMaterials,
} from '../features/homework/homeworkMaterials'
import { createHomework, type CreateHomeworkPayload } from '../features/homework/homeworkApi'

type Step = 1 | 2
type SubmissionState = 'idle' | 'submitting' | 'error'

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

export default function CreateHomeworkPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [className, setClassName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [questions, setQuestions] = useState([createEmptyHomeworkQuestion(1)])
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const totalPoints = calculateHomeworkTotalPoints(questions)
  const isSubmitting = submissionState === 'submitting'

  function handleContinue() {
    if (!title.trim()) {
      setErrorMessage('Homework title is required before you can continue.')
      return
    }

    setErrorMessage('')
    setStep(2)
  }

  async function handleCreateHomework() {
    if (!title.trim()) {
      setStep(1)
      setErrorMessage('Homework title is required before you can create the assignment.')
      return
    }

    const materialError = getHomeworkMaterialValidationError(questions)
    if (materialError) {
      setSubmissionState('error')
      setErrorMessage(materialError)
      return
    }

    setSubmissionState('submitting')
    setErrorMessage('')

    const payload: CreateHomeworkPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      className: className.trim() || undefined,
      dueDate: dueDate || undefined,
      maxPoints: totalPoints,
      materialsJson: serializeHomeworkMaterials(questions),
    }

    try {
      await createHomework(payload)
      navigate('/homework')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'The homework assignment could not be created. Refresh and try again.'
      setErrorMessage(message)
      setSubmissionState('error')
    }
  }

  return (
    <AppPage width="standard">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/homework')}
          className="font-display text-sm font-semibold text-gold-300 transition-colors hover:text-gold-200"
        >
          ← Back to homework
        </button>
      </div>

      <AppPageHeader
        eyebrow="Homework planning"
        title="Create homework"
        description="Capture the assignment basics first, then define the questions and expected answers in one focused flow."
      />

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <StepCard
          index={1}
          title="Basic information"
          detail="Set the title, context, and due date."
          isActive={step === 1}
          isComplete={step === 2}
        />
        <StepCard
          index={2}
          title="Materials"
          detail="Add the homework questions and expected answers."
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
              Set the planning details here, then move into the assignment material builder.
            </p>
          </div>

          <div className="grid gap-5">
            <Field label="Homework title" htmlFor="homework-title">
              <input
                id="homework-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Chapter 5 Review"
                className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-gold-500"
              />
            </Field>

            <Field label="Class Label" htmlFor="homework-class-name">
              <input
                id="homework-class-name"
                type="text"
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                placeholder="Algebra II — Period 3"
                className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-gold-500"
              />
            </Field>

            <Field label="Due date" htmlFor="homework-due-date">
              <input
                id="homework-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-gold-500"
              />
            </Field>

            <Field label="Teacher notes" htmlFor="homework-description">
              <textarea
                id="homework-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional notes or reminders for this homework record"
                rows={4}
                className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-gold-500"
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleContinue}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-gold-500 px-5 py-3 font-display text-sm font-semibold text-navy-950 transition-colors duration-150 hover:bg-gold-600 disabled:cursor-not-allowed disabled:bg-gold-500/60"
            >
              Continue to materials
            </button>
          </div>
        </AppPanel>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <AppPanel className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">Materials and answer key</h2>
              <p className="mt-2 font-body text-sm leading-6 text-sec">
                Define the assignment questions and their expected answers before you save this homework record.
              </p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-subtle bg-white/[0.03] p-4 md:grid-cols-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Class</p>
                <p className="mt-2 font-display text-sm font-semibold text-white">{className.trim() || 'Not set'}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Due date</p>
                <p className="mt-2 font-body text-sm text-sec">{dueDate || 'No due date selected'}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Live total</p>
                <p className="mt-2 font-mono text-lg font-semibold text-gold-300">{totalPoints} pts</p>
              </div>
            </div>

            <ExamBuilder
              questions={questions}
              onChange={setQuestions}
              allowAnswerImageUpload={false}
              disabled={isSubmitting}
            />

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
                onClick={() => void handleCreateHomework()}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-gold-500 px-5 py-3 font-display text-sm font-semibold text-navy-950 transition-colors duration-150 hover:bg-gold-600 disabled:cursor-not-allowed disabled:bg-gold-500/60"
              >
                {isSubmitting ? 'Creating homework…' : 'Create homework'}
              </button>
            </div>
          </AppPanel>
        </div>
      )}
    </AppPage>
  )
}