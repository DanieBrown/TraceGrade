import type { BatchFileMapping, BatchTrackingRow } from '../domain/batchTypes'

export function getFailedRows(rows: BatchTrackingRow[]): BatchTrackingRow[] {
  return rows.filter((row) => row.status === 'failed')
}

export function buildFailedRetryMappings(
  rows: BatchTrackingRow[],
  mappings: BatchFileMapping[],
): BatchFileMapping[] {
  const failedLocalFileIds = new Set(getFailedRows(rows).map((row) => row.localFileId))

  return mappings.filter((mapping) => failedLocalFileIds.has(mapping.localFileId))
}

export function hasRetryableFailures(
  rows: BatchTrackingRow[],
  mappings: BatchFileMapping[],
): boolean {
  const retryMappings = buildFailedRetryMappings(rows, mappings)
  return retryMappings.some((mapping) => mapping.file instanceof File)
}
