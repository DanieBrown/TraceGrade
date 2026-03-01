import { fetchSubmissionStatusSnapshot } from '../data/batchGradingApi'
import type { BatchTrackingRow, BatchUiStatus } from '../domain/batchTypes'
import { isTerminalBatchStatus } from '../domain/batchTypes'

const STATUS_ORDER: Record<BatchUiStatus, number> = {
  queued: 1,
  processing: 2,
  completed: 3,
  failed: 3,
}

function toUiStatus(status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'): BatchUiStatus {
  if (status === 'PROCESSING') {
    return 'processing'
  }

  if (status === 'COMPLETED') {
    return 'completed'
  }

  if (status === 'FAILED') {
    return 'failed'
  }

  return 'queued'
}

function shouldAdvanceStatus(current: BatchUiStatus, next: BatchUiStatus): boolean {
  return STATUS_ORDER[next] >= STATUS_ORDER[current]
}

export interface PollBatchProgressResult {
  rows: BatchTrackingRow[]
  transientErrorCount: number
}

export async function pollBatchProgress(rows: BatchTrackingRow[]): Promise<PollBatchProgressResult> {
  const settled = await Promise.allSettled(
    rows.map(async (row) => {
      if (!row.submissionId || isTerminalBatchStatus(row.status)) {
        return row
      }

      const snapshot = await fetchSubmissionStatusSnapshot(row.submissionId)
      const nextStatus = toUiStatus(snapshot.status)

      return {
        ...row,
        status: shouldAdvanceStatus(row.status, nextStatus) ? nextStatus : row.status,
        score: snapshot.score ?? row.score,
        flaggedForReview: snapshot.flaggedForReview || row.flaggedForReview,
        errorMessage: snapshot.errorMessage ?? null,
      }
    }),
  )

  let transientErrorCount = 0
  const nextRows = settled.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }

    transientErrorCount += 1
    return rows[index]
  })

  return {
    rows: nextRows,
    transientErrorCount,
  }
}
