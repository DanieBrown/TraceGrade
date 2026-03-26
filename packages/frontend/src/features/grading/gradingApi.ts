import axios from 'axios'
import api from '../../lib/api'
import type { ApiResponse } from '../submissions/submissionApi'

export interface QuestionScore {
  questionNumber: number
  pointsAwarded: number
  pointsAvailable: number
  /** 0–100 scale (backend multiplies raw 0.0–1.0 confidence by 100) */
  confidenceScore: number
  illegible: boolean
  feedback: string
}

export type GradingStatus = 'COMPLETED' | 'FAILED'

export interface GradingResultResponse {
  gradeId: string
  submissionId: string
  status: GradingStatus
  aiScore: number
  finalScore: number
  /** Average confidence across all questions, 0–100 scale */
  confidenceScore: number
  needsReview: boolean
  /** Raw JSON string — parse with JSON.parse before use */
  questionScores: string
  aiFeedback: string
  teacherOverride: boolean
  reviewedBy: string | null
  reviewedAt: string | null
  submissionImageUrl?: string | null
  processingTimeMs: number
  createdAt: string
  updatedAt: string
}

/** Response from the POST enqueue endpoint (not the full grading result). */
interface GradingEnqueuedResponse {
  submissionId: string
  status: 'QUEUED' | 'COMPLETED' | 'ALREADY_GRADED'
  enqueuedAt: string
}

const POLL_INTERVAL_MS = 2_000
const POLL_TIMEOUT_MS = 60_000

function isTransientGradingPollError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404
}

function getErrorMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message.trim() ? error.message : null
  }

  const responseData = error.response?.data
  if (responseData && typeof responseData === 'object') {
    const message =
      ('message' in responseData && typeof responseData.message === 'string' && responseData.message.trim()) ||
      ('error' in responseData &&
        typeof responseData.error === 'object' &&
        responseData.error !== null &&
        'message' in responseData.error &&
        typeof responseData.error.message === 'string' &&
        responseData.error.message.trim())

    if (message) {
      return message
    }
  }

  return error.message.trim() ? error.message : null
}

function toGradingError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status

    if (status === 429) {
      return new Error('AI grading is temporarily rate limited. Please wait a moment and try again.')
    }

    if (!error.response) {
      return new Error('Could not reach the grading service. Check your connection and try again.')
    }

    return new Error(getErrorMessage(error) ?? 'Grading failed. Please try again.')
  }

  return error instanceof Error ? error : new Error('Grading failed. Please try again.')
}

/**
 * Enqueue a submission for AI grading, then poll until the full
 * grading result is ready.
 *
 * Flow:
 *  1. POST  /submissions/{id}/grade  → GradingEnqueuedResponse
 *  2. If status is COMPLETED or ALREADY_GRADED the result exists;
 *     if QUEUED the backend is processing asynchronously.
 *  3. Poll GET /submissions/{id}/grade until a result is returned
 *     or the timeout expires.
 */
export async function triggerGrading(submissionId: string): Promise<GradingResultResponse> {
  const enqueue = await api
    .post<ApiResponse<GradingEnqueuedResponse>>(`/submissions/${submissionId}/grade`)
    .then((r) => r.data.data)

  // For COMPLETED / ALREADY_GRADED the result is already persisted —
  // fetch it immediately.
  if (enqueue.status !== 'QUEUED') {
    return fetchGradingResult(submissionId)
  }

  // Async path — poll until the worker has finished grading.
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    try {
      return await fetchGradingResult(submissionId)
    } catch (error) {
      if (isTransientGradingPollError(error)) {
        continue
      }

      throw toGradingError(error)
    }
  }

  throw new Error(
    'AI grading did not finish in time. If you are running locally, verify the backend, LocalStack SQS queue, and OpenAI configuration before retrying.',
  )
}

export function fetchGradingResult(submissionId: string): Promise<GradingResultResponse> {
  return api
    .get<ApiResponse<GradingResultResponse>>(`/submissions/${submissionId}/grade`)
    .then((r) => r.data.data)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
