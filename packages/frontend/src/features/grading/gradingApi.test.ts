import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../lib/api'
import { triggerGrading } from './gradingApi'

vi.mock('../../lib/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

function createAxiosError(status: number, message: string) {
  return {
    isAxiosError: true,
    message,
    response: {
      status,
      data: {
        message,
      },
    },
  }
}

const mockedPost = vi.mocked(api.post)
const mockedGet = vi.mocked(api.get)

describe('triggerGrading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('retries transient 404 responses while a queued grading job is still processing', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        data: {
          submissionId: 'submission-1',
          status: 'QUEUED',
          enqueuedAt: '2026-03-22T10:00:00.000Z',
        },
      },
    })

    mockedGet
      .mockRejectedValueOnce(createAxiosError(404, 'Result not ready yet'))
      .mockResolvedValueOnce({
        data: {
          data: {
            gradeId: 'grade-1',
            submissionId: 'submission-1',
            status: 'COMPLETED',
            aiScore: 88,
            finalScore: 88,
            confidenceScore: 91,
            needsReview: false,
            questionScores: '[]',
            aiFeedback: 'Looks good',
            teacherOverride: false,
            reviewedBy: null,
            reviewedAt: null,
            submissionImageUrl: null,
            processingTimeMs: 1234,
            createdAt: '2026-03-22T10:00:00.000Z',
            updatedAt: '2026-03-22T10:00:02.000Z',
          },
        },
      })

    const gradingPromise = triggerGrading('submission-1')

    await vi.advanceTimersByTimeAsync(2_000)
    await vi.advanceTimersByTimeAsync(2_000)

    await expect(gradingPromise).resolves.toMatchObject({
      gradeId: 'grade-1',
      submissionId: 'submission-1',
      status: 'COMPLETED',
    })
    expect(mockedGet).toHaveBeenCalledTimes(2)
  })

  it('fails fast on non-transient polling errors instead of retrying indefinitely', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        data: {
          submissionId: 'submission-2',
          status: 'QUEUED',
          enqueuedAt: '2026-03-22T10:00:00.000Z',
        },
      },
    })

    mockedGet.mockRejectedValueOnce(createAxiosError(429, 'Too many requests'))

    const gradingPromise = triggerGrading('submission-2')
    const rejection = expect(gradingPromise).rejects.toThrow(
      'AI grading is temporarily rate limited. Please wait a moment and try again.',
    )

    await vi.advanceTimersByTimeAsync(2_000)

    await rejection
    expect(mockedGet).toHaveBeenCalledTimes(1)
  })
})