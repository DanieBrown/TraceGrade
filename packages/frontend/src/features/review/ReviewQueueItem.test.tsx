import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReviewQueueItem from './ReviewQueueItem'

vi.mock('./reviewApi', () => ({
  submitReview: vi.fn(),
}))

const baseResult = {
  gradeId: 'grade-1',
  submissionId: 'submission-1',
  status: 'COMPLETED' as const,
  aiScore: 40,
  finalScore: 40,
  confidenceScore: 52,
  needsReview: true,
  questionScores: JSON.stringify([
    {
      questionNumber: 1,
      pointsAwarded: 2,
      pointsAvailable: 5,
      confidenceScore: 52,
      illegible: false,
      feedback: 'Needs more detail',
    },
  ]),
  aiFeedback: 'Needs more detail',
  teacherOverride: false,
  reviewedBy: null,
  reviewedAt: null,
  submissionImageUrl: null,
  processingTimeMs: 1000,
  createdAt: '2026-04-02T00:00:00Z',
  updatedAt: '2026-04-02T00:00:00Z',
}

describe('ReviewQueueItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('routes manual adjustments into a dedicated manual grading view', () => {
    render(
      <MemoryRouter>
        <ReviewQueueItem result={baseResult} onReviewed={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /open manual grading/i })).toHaveAttribute('href', '/review/grade-1')
    expect(screen.queryByRole('button', { name: /save with adjustments/i })).not.toBeInTheDocument()
  })
})