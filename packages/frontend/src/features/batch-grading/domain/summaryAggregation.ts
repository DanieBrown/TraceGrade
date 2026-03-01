import type { BatchSummary, BatchTrackingRow } from './batchTypes'

const DEFAULT_PASSING_SCORE = 60

function toPercentage(value: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return Number(((value / total) * 100).toFixed(1))
}

export function computeBatchSummary(
  rows: BatchTrackingRow[],
  passingScore = DEFAULT_PASSING_SCORE,
): BatchSummary {
  const totalProcessed = rows.length

  const completedRows = rows.filter((row) => row.status === 'completed')
  const failedRows = rows.filter((row) => row.status === 'failed')

  const passedCount = completedRows.filter(
    (row) => typeof row.score === 'number' && row.score >= passingScore,
  ).length

  const completedWithScore = completedRows.filter(
    (row): row is BatchTrackingRow & { score: number } => typeof row.score === 'number',
  )

  const missingScoreCount = completedRows.length - completedWithScore.length

  const scoreTotal = completedWithScore.reduce((total, row) => total + row.score, 0)
  const averageScore =
    completedWithScore.length === 0
      ? 0
      : Number((scoreTotal / completedWithScore.length).toFixed(1))

  const failedCount = failedRows.length + Math.max(completedRows.length - passedCount, 0)
  const flaggedReviewCount = rows.filter((row) => row.flaggedForReview).length

  return {
    totalProcessed,
    passedCount,
    failedCount,
    passRate: toPercentage(passedCount, totalProcessed),
    failRate: toPercentage(failedCount, totalProcessed),
    averageScore,
    flaggedReviewCount,
    missingScoreCount,
  }
}
