import api from '../../lib/api'
import type { ApiResponse } from '../submissions/submissionApi'
import type { GradingResultResponse } from '../grading/gradingApi'

export interface GradingReviewRequest {
  finalScore: number
  teacherOverride: boolean
  /** Optional updated per-question scores JSON; omit to keep existing scores */
  questionScores?: string
}

export function fetchPendingReviews(): Promise<GradingResultResponse[]> {
  return api
    .get<ApiResponse<GradingResultResponse[]>>('/grading/reviews/pending')
    .then((r) => r.data.data)
}

export function submitReview(
  gradeId: string,
  payload: GradingReviewRequest,
): Promise<GradingResultResponse> {
  return api
    .patch<ApiResponse<GradingResultResponse>>(`/grading/${gradeId}/review`, payload)
    .then((r) => r.data.data)
}
