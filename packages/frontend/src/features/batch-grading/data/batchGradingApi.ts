import api from '../../../lib/api'
import { uploadBatch, uploadSingle } from '../../submissions/submissionApi'

type GradingEnqueueStatus = 'QUEUED' | 'COMPLETED' | 'ALREADY_GRADED'
type SubmissionBackendStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface CreatedSubmission {
  submissionId: string
  fileName: string
  status: string
}

interface BatchUploadPayload {
  submissions?: unknown
  results?: unknown
}

interface GradingResultSummaryPayload {
  finalScore?: unknown
  aiScore?: unknown
  needsReview?: unknown
}

interface SubmissionStatusPayload {
  submissionId?: unknown
  status?: unknown
  gradingResult?: GradingResultSummaryPayload | null
}

interface GradingEnqueuePayload {
  submissionId?: unknown
  status?: unknown
}

export interface SubmissionStatusSnapshot {
  submissionId: string
  status: SubmissionBackendStatus
  score: number | null
  flaggedForReview: boolean
  errorMessage: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractResponseData<T>(payload: unknown): T {
  if (isRecord(payload) && 'data' in payload) {
    return payload.data as T
  }

  return payload as T
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function normalizeCreatedSubmission(payload: unknown): CreatedSubmission | null {
  if (!isRecord(payload)) {
    return null
  }

  const submissionId = toTrimmedString(payload.submissionId)
  if (!submissionId) {
    return null
  }

  return {
    submissionId,
    fileName: toTrimmedString(payload.fileName) ?? 'Submission',
    status: toTrimmedString(payload.status) ?? 'PENDING',
  }
}

function normalizeBatchSubmissions(payload: BatchUploadPayload): CreatedSubmission[] {
  const rawSubmissions =
    Array.isArray(payload.submissions)
      ? payload.submissions
      : Array.isArray(payload.results)
        ? payload.results
        : []

  return rawSubmissions
    .map((submission) => normalizeCreatedSubmission(submission))
    .filter((submission): submission is CreatedSubmission => submission !== null)
}

function normalizeGradingStatus(value: unknown): GradingEnqueueStatus {
  const normalized = toTrimmedString(value)?.toUpperCase()

  if (normalized === 'COMPLETED') {
    return 'COMPLETED'
  }

  if (normalized === 'ALREADY_GRADED') {
    return 'ALREADY_GRADED'
  }

  return 'QUEUED'
}

function normalizeSubmissionStatus(value: unknown): SubmissionBackendStatus {
  const normalized = toTrimmedString(value)?.toUpperCase()

  if (normalized === 'PROCESSING') {
    return 'PROCESSING'
  }

  if (normalized === 'COMPLETED') {
    return 'COMPLETED'
  }

  if (normalized === 'FAILED') {
    return 'FAILED'
  }

  return 'PENDING'
}

export async function uploadMappedSubmissions(
  assignmentId: string,
  studentId: string,
  files: File[],
): Promise<CreatedSubmission[]> {
  if (files.length === 0) {
    return []
  }

  if (files.length === 1) {
    const created = await uploadSingle(assignmentId, studentId, files[0])
    return normalizeCreatedSubmission(created) ? [created] : []
  }

  const payload = await uploadBatch(assignmentId, studentId, files)
  return normalizeBatchSubmissions(payload)
}

export async function enqueueSubmissionGrading(
  submissionId: string,
): Promise<{ submissionId: string; status: GradingEnqueueStatus }> {
  const response = await api.post<unknown>(`/submissions/${encodeURIComponent(submissionId)}/grade`)
  const payload = extractResponseData<GradingEnqueuePayload>(response.data)

  const normalizedSubmissionId = toTrimmedString(payload.submissionId) ?? submissionId

  return {
    submissionId: normalizedSubmissionId,
    status: normalizeGradingStatus(payload.status),
  }
}

export async function fetchSubmissionStatusSnapshot(
  submissionId: string,
): Promise<SubmissionStatusSnapshot> {
  const response = await api.get<unknown>(`/submissions/${encodeURIComponent(submissionId)}`)
  const payload = extractResponseData<SubmissionStatusPayload>(response.data)

  const normalizedSubmissionId = toTrimmedString(payload.submissionId) ?? submissionId
  const status = normalizeSubmissionStatus(payload.status)
  const gradingResult = payload.gradingResult

  const score =
    (isRecord(gradingResult) ? toNumber(gradingResult.finalScore) : null) ??
    (isRecord(gradingResult) ? toNumber(gradingResult.aiScore) : null)

  const flaggedForReview =
    isRecord(gradingResult) && typeof gradingResult.needsReview === 'boolean'
      ? gradingResult.needsReview
      : false

  return {
    submissionId: normalizedSubmissionId,
    status,
    score,
    flaggedForReview,
    errorMessage: status === 'FAILED' ? 'Submission processing failed.' : null,
  }
}
