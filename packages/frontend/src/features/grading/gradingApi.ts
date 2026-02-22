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

export function triggerGrading(submissionId: string): Promise<GradingResultResponse> {
  return api
    .post<ApiResponse<GradingResultResponse>>(`/submissions/${submissionId}/grade`)
    .then((r) => r.data.data)
}

export function fetchGradingResult(submissionId: string): Promise<GradingResultResponse> {
  return api
    .get<ApiResponse<GradingResultResponse>>(`/submissions/${submissionId}/grade`)
    .then((r) => r.data.data)
}
