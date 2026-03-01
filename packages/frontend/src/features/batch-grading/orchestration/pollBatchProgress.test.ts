import { describe, expect, it, vi } from 'vitest'
import type { BatchTrackingRow } from '../domain/batchTypes'
import { pollBatchProgress } from './pollBatchProgress'

const fetchSubmissionStatusSnapshotMock = vi.fn()

vi.mock('../data/batchGradingApi', () => ({
  fetchSubmissionStatusSnapshot: (...args: unknown[]) => fetchSubmissionStatusSnapshotMock(...args),
}))

function createRow(partial: Partial<BatchTrackingRow>): BatchTrackingRow {
  return {
    localFileId: partial.localFileId ?? 'file-1',
    fileName: partial.fileName ?? 'submission.pdf',
    studentId: partial.studentId ?? 'student-1',
    studentName: partial.studentName ?? 'Student One',
    submissionId: partial.submissionId ?? 'sub-1',
    status: partial.status ?? 'queued',
    score: partial.score ?? null,
    flaggedForReview: partial.flaggedForReview ?? false,
    errorMessage: partial.errorMessage ?? null,
  }
}

describe('pollBatchProgress', () => {
  it('maps backend statuses to UI statuses and enriches score/review fields', async () => {
    fetchSubmissionStatusSnapshotMock.mockResolvedValueOnce({
      submissionId: 'sub-1',
      status: 'COMPLETED',
      score: 91,
      flaggedForReview: true,
      errorMessage: null,
    })

    const result = await pollBatchProgress([createRow({ status: 'processing' })])

    expect(result.transientErrorCount).toBe(0)
    expect(result.rows[0].status).toBe('completed')
    expect(result.rows[0].score).toBe(91)
    expect(result.rows[0].flaggedForReview).toBe(true)
  })

  it('preserves row status when status fetch errors and reports transient errors', async () => {
    fetchSubmissionStatusSnapshotMock.mockRejectedValueOnce(new Error('network down'))

    const result = await pollBatchProgress([createRow({ status: 'processing' })])

    expect(result.transientErrorCount).toBe(1)
    expect(result.rows[0].status).toBe('processing')
    expect(result.rows[0].errorMessage).toBeNull()
  })

  it('does not poll terminal rows', async () => {
    fetchSubmissionStatusSnapshotMock.mockReset()

    const completedRow = createRow({ localFileId: 'file-2', status: 'completed' })
    const result = await pollBatchProgress([completedRow])

    expect(result.transientErrorCount).toBe(0)
    expect(result.rows[0]).toEqual(completedRow)
    expect(fetchSubmissionStatusSnapshotMock).not.toHaveBeenCalled()
  })
})
