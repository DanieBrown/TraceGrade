import { describe, expect, it } from 'vitest'
import type { BatchTrackingRow } from './batchTypes'
import { computeBatchSummary } from './summaryAggregation'

function createRow(partial: Partial<BatchTrackingRow>): BatchTrackingRow {
  return {
    localFileId: partial.localFileId ?? 'file-1',
    fileName: partial.fileName ?? 'submission.pdf',
    studentId: partial.studentId ?? 'student-1',
    studentName: partial.studentName ?? 'Student One',
    submissionId: partial.submissionId ?? 'sub-1',
    status: partial.status ?? 'completed',
    score: partial.score === undefined ? 80 : partial.score,
    flaggedForReview: partial.flaggedForReview ?? false,
    errorMessage: partial.errorMessage ?? null,
  }
}

describe('computeBatchSummary', () => {
  it('computes pass/fail rates and average score from terminal rows', () => {
    const rows = [
      createRow({ localFileId: '1', score: 90, status: 'completed' }),
      createRow({ localFileId: '2', score: 40, status: 'completed' }),
      createRow({ localFileId: '3', status: 'failed', score: null }),
    ]

    const summary = computeBatchSummary(rows)

    expect(summary.totalProcessed).toBe(3)
    expect(summary.passedCount).toBe(1)
    expect(summary.failedCount).toBe(2)
    expect(summary.passRate).toBeCloseTo(33.3, 1)
    expect(summary.failRate).toBeCloseTo(66.7, 1)
    expect(summary.averageScore).toBe(65)
  })

  it('tracks flagged review and excludes missing scores from average denominator', () => {
    const rows = [
      createRow({ localFileId: '1', score: 70, flaggedForReview: true }),
      createRow({ localFileId: '2', score: null }),
      createRow({ localFileId: '3', status: 'failed', score: null, flaggedForReview: true }),
    ]

    const summary = computeBatchSummary(rows)

    expect(summary.averageScore).toBe(70)
    expect(summary.missingScoreCount).toBe(1)
    expect(summary.flaggedReviewCount).toBe(2)
  })
})
