export type BatchWorkflowStep = 'upload' | 'mapping' | 'processing' | 'summary'

export type BatchUiStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface RosterStudent {
  id: string
  fullName: string
}

export interface BatchFileMapping {
  localFileId: string
  file: File | null
  fileName: string
  fileSize: number
  fileType: string
  studentId: string | null
}

export interface MappingValidationResult {
  valid: boolean
  rowErrors: Record<string, string[]>
  formErrors: string[]
}

export interface BatchTrackingRow {
  localFileId: string
  fileName: string
  studentId: string
  studentName: string
  submissionId: string | null
  status: BatchUiStatus
  score: number | null
  flaggedForReview: boolean
  errorMessage: string | null
}

export interface BatchSummary {
  totalProcessed: number
  passedCount: number
  failedCount: number
  passRate: number
  failRate: number
  averageScore: number
  flaggedReviewCount: number
  missingScoreCount: number
}

export interface BatchSessionSnapshot {
  classId: string
  className: string
  assignmentId: string
  step: BatchWorkflowStep
  rows: BatchTrackingRow[]
  savedAt: string
}

export const BATCH_WORKFLOW_STEPS: readonly BatchWorkflowStep[] = [
  'upload',
  'mapping',
  'processing',
  'summary',
]

export const TERMINAL_BATCH_STATUSES = new Set<BatchUiStatus>(['completed', 'failed'])

export function isTerminalBatchStatus(status: BatchUiStatus): boolean {
  return TERMINAL_BATCH_STATUSES.has(status)
}
