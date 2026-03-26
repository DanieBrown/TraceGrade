import api from '../../lib/api'
import type { ApiResponse } from '../../lib/apiTypes'

export interface AnswerRubric {
  id: string
  examTemplateId: string
  questionNumber: number
  answerText: string | null
  answerImageUrl: string | null
  pointsAvailable: number
  acceptableVariations: string | null
  gradingNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface SaveAnswerRubricPayload {
  questionNumber: number
  answerText?: string
  answerImageUrl?: string
  pointsAvailable: number
  acceptableVariations?: string
  gradingNotes?: string
}

export interface RubricImageUploadResponse {
  fileUrl: string
  fileName: string
  uploadedAt: string
}

function getEndpoint(examTemplateId: string): string {
  return `/exam-templates/${encodeURIComponent(examTemplateId)}/rubrics`
}

export async function fetchAnswerRubrics(examTemplateId: string): Promise<AnswerRubric[]> {
  const response = await api.get<ApiResponse<AnswerRubric[]>>(getEndpoint(examTemplateId))
  return response.data.data ?? []
}

export async function createAnswerRubric(
  examTemplateId: string,
  payload: SaveAnswerRubricPayload,
): Promise<AnswerRubric> {
  const response = await api.post<ApiResponse<AnswerRubric>>(getEndpoint(examTemplateId), payload)
  return response.data.data
}

export async function updateAnswerRubric(
  examTemplateId: string,
  rubricId: string,
  payload: SaveAnswerRubricPayload,
): Promise<AnswerRubric> {
  const response = await api.put<ApiResponse<AnswerRubric>>(
    `${getEndpoint(examTemplateId)}/${encodeURIComponent(rubricId)}`,
    payload,
  )
  return response.data.data
}

export async function uploadAnswerRubricImage(
  examTemplateId: string,
  file: File,
): Promise<RubricImageUploadResponse> {
  const form = new FormData()
  form.append('file', file)

  const response = await api.post<ApiResponse<RubricImageUploadResponse>>(
    `${getEndpoint(examTemplateId)}/upload-image`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )

  return response.data.data
}