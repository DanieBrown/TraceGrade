import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPendingReviewByGradeId, submitReview } from '../features/review/reviewApi'
import ManualReviewDetailPage from './ManualReviewDetailPage'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../features/review/reviewApi', () => ({
  fetchPendingReviewByGradeId: vi.fn(),
  submitReview: vi.fn(),
}))

const fetchPendingReviewByGradeIdMock = vi.mocked(fetchPendingReviewByGradeId)
const submitReviewMock = vi.mocked(submitReview)

describe('ManualReviewDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigateMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('saves question-by-question scores with combined scoring rationale', async () => {
    fetchPendingReviewByGradeIdMock.mockResolvedValueOnce({
      gradeId: 'grade-1',
      submissionId: 'submission-1',
      status: 'COMPLETED',
      aiScore: 70,
      finalScore: 70,
      confidenceScore: 58,
      needsReview: true,
      questionScores: JSON.stringify([
        {
          questionNumber: 1,
          pointsAwarded: 3,
          pointsAvailable: 5,
          confidenceScore: 55,
          illegible: false,
          feedback: 'Partially correct',
        },
      ]),
      aiFeedback: 'Needs review',
      teacherOverride: false,
      reviewedBy: null,
      reviewedAt: null,
      submissionImageUrl: null,
      processingTimeMs: 1000,
      createdAt: '2026-04-02T00:00:00Z',
      updatedAt: '2026-04-02T00:00:00Z',
    })
    submitReviewMock.mockResolvedValueOnce({
      gradeId: 'grade-1',
      submissionId: 'submission-1',
      status: 'COMPLETED',
      aiScore: 70,
      finalScore: 80,
      confidenceScore: 58,
      needsReview: false,
      questionScores: JSON.stringify([]),
      aiFeedback: 'Needs review',
      teacherOverride: true,
      reviewedBy: null,
      reviewedAt: '2026-04-02T01:00:00Z',
      submissionImageUrl: null,
      processingTimeMs: 1000,
      createdAt: '2026-04-02T00:00:00Z',
      updatedAt: '2026-04-02T01:00:00Z',
    })

    render(
      <MemoryRouter initialEntries={['/review/grade-1']}>
        <Routes>
          <Route path="/review/:gradeId" element={<ManualReviewDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Manual Grading' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('spinbutton')).toHaveValue(3)
    })

    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '4' },
    })
    fireEvent.change(screen.getByPlaceholderText(/explain why this final score reflects the student's work/i), {
      target: { value: 'Recovered key scientific term and supporting detail.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save final grade/i }))

    await waitFor(() => {
      expect(submitReviewMock).toHaveBeenCalledWith('grade-1', {
        finalScore: 80,
        teacherOverride: true,
        questionScores: JSON.stringify([
          {
            questionNumber: 1,
            pointsAwarded: 4,
            pointsAvailable: 5,
            confidenceScore: 55,
            illegible: false,
            feedback: 'Partially correct',
          },
        ]),
        overrideReason: 'Q1: Recovered key scientific term and supporting detail.',
      })
    })

    expect(navigateMock).toHaveBeenCalledWith('/review')
  })
})