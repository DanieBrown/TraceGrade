import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPendingReviews } from '../features/review/reviewApi'
import { getTeacherThreshold } from '../features/settings/settingsApi'
import ManualReviewQueuePage from './ManualReviewQueuePage'

vi.mock('../features/review/reviewApi', () => ({
  fetchPendingReviews: vi.fn(),
}))

vi.mock('../features/settings/settingsApi', () => ({
  getTeacherThreshold: vi.fn(),
}))

vi.mock('../features/review/ReviewQueueItem', () => ({
  default: () => null,
}))

const fetchPendingReviewsMock = vi.mocked(fetchPendingReviews)
const getTeacherThresholdMock = vi.mocked(getTeacherThreshold)

describe('ManualReviewQueuePage threshold messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders dynamic threshold percent copy when teacher threshold is available', async () => {
    fetchPendingReviewsMock.mockResolvedValueOnce([])
    getTeacherThresholdMock.mockResolvedValueOnce({
      effectiveThreshold: 0.875,
      source: 'teacher_override',
      teacherThreshold: 0.875,
    })

    render(
      <MemoryRouter>
        <ManualReviewQueuePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/below 87.5%/i)).toBeInTheDocument()
    expect(screen.queryByText(/below 95%/i)).not.toBeInTheDocument()
  })

  it('removes the legacy AI confidence review eyebrow copy', async () => {
    fetchPendingReviewsMock.mockResolvedValueOnce([])
    getTeacherThresholdMock.mockResolvedValueOnce({
      effectiveThreshold: 0.875,
      source: 'teacher_override',
      teacherThreshold: 0.875,
    })

    render(
      <MemoryRouter>
        <ManualReviewQueuePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Manual Review Queue' })).toBeInTheDocument()
    expect(screen.queryByText(/AI confidence review/i)).not.toBeInTheDocument()
  })

  it('falls back to generic threshold copy when threshold lookup fails', async () => {
    fetchPendingReviewsMock.mockResolvedValueOnce([])
    getTeacherThresholdMock.mockRejectedValueOnce(new Error('threshold lookup failed'))

    render(
      <MemoryRouter>
        <ManualReviewQueuePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/below your current confidence threshold/i)).toBeInTheDocument()
  })
})