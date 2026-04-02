import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GradingResultResponse } from '../grading/gradingApi'
import ReviewQueueItem from './ReviewQueueItem'
import { submitReview } from './reviewApi'
import { toast } from 'sonner'

vi.mock('./reviewApi', () => ({
  submitReview: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const submitReviewMock = vi.mocked(submitReview)
const toastSuccessMock = vi.mocked(toast.success)

function createResult(): GradingResultResponse {
  return {
    gradeId: 'grade-1',
    submissionId: 'abc12345-submission',
    status: 'COMPLETED',
    aiScore: 90,
    finalScore: 90,
    confidenceScore: 72,
    needsReview: true,
    questionScores: JSON.stringify([
      {
        questionNumber: 1,
        pointsAwarded: 8,
        pointsAvailable: 10,
        confidenceScore: 70,
        illegible: false,
        feedback: 'Strong answer.',
      },
      {
        questionNumber: 2,
        pointsAwarded: 10,
        pointsAvailable: 10,
        confidenceScore: 74,
        illegible: false,
        feedback: 'Complete answer.',
      },
    ]),
    aiFeedback: 'Looks correct overall.',
    teacherOverride: false,
    reviewedBy: null,
    reviewedAt: null,
    submissionImageUrl: null,
    processingTimeMs: 1500,
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-01T10:00:00Z',
  }
}

function openReviewItem() {
  const summary = screen.getByText(/AI score: 18 \/ 20 pts/i)
  const trigger = summary.closest('button')

  if (!trigger) {
    throw new Error('Review row trigger was not found.')
  }

  fireEvent.click(trigger)
}

describe('ReviewQueueItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('confirms that approving an AI grade saved the score to the student record', async () => {
    const onReviewed = vi.fn()
    submitReviewMock.mockResolvedValueOnce({
      ...createResult(),
      reviewedBy: 'teacher-1',
      reviewedAt: '2026-04-01T10:15:00Z',
    })

    render(
      <ol>
        <ReviewQueueItem result={createResult()} onReviewed={onReviewed} />
      </ol>,
    )

    openReviewItem()
    fireEvent.click(screen.getByRole('button', { name: 'Approve AI Grade' }))

    await waitFor(() => {
      expect(submitReviewMock).toHaveBeenCalledWith('grade-1', {
        finalScore: 90,
        teacherOverride: false,
      })
    })

    expect(await screen.findByText(/AI grade approved and saved to the student record\./i)).toBeInTheDocument()
    expect(screen.getByText(/Saved score: 18 \/ 20 pts/i)).toBeInTheDocument()
    expect(toastSuccessMock).toHaveBeenCalledWith('AI grade approved and saved to the student record.')
    expect(onReviewed).toHaveBeenCalledTimes(1)
  })

  it('confirms that manual adjustments saved the updated score to the student record', async () => {
    const onReviewed = vi.fn()
    submitReviewMock.mockResolvedValueOnce({
      ...createResult(),
      finalScore: 80,
      teacherOverride: true,
      reviewedBy: 'teacher-1',
      reviewedAt: '2026-04-01T10:20:00Z',
    })

    render(
      <ol>
        <ReviewQueueItem result={createResult()} onReviewed={onReviewed} />
      </ol>,
    )

    openReviewItem()
    fireEvent.click(screen.getByRole('button', { name: /Q1/i }))
    fireEvent.change(screen.getByLabelText(/Adjusted points for question 1/i), {
      target: { value: '6' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save with Adjustments' }))

    await waitFor(() => {
      expect(submitReviewMock).toHaveBeenCalledWith('grade-1', {
        finalScore: 80,
        teacherOverride: true,
        questionScores: JSON.stringify([
          {
            questionNumber: 1,
            pointsAwarded: 6,
            pointsAvailable: 10,
            confidenceScore: 70,
            illegible: false,
            feedback: 'Strong answer.',
          },
          {
            questionNumber: 2,
            pointsAwarded: 10,
            pointsAvailable: 10,
            confidenceScore: 74,
            illegible: false,
            feedback: 'Complete answer.',
          },
        ]),
      })
    })

    expect(await screen.findByText(/Manual adjustments saved to the student record\./i)).toBeInTheDocument()
    expect(screen.getByText(/Saved score: 16 \/ 20 pts/i)).toBeInTheDocument()
    expect(toastSuccessMock).toHaveBeenCalledWith('Manual adjustments saved to the student record.')
    expect(onReviewed).toHaveBeenCalledTimes(1)
  })
})