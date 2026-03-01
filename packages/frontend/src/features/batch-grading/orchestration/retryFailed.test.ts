import { describe, expect, it } from 'vitest'
import type { BatchFileMapping, BatchTrackingRow } from '../domain/batchTypes'
import { buildFailedRetryMappings, getFailedRows, hasRetryableFailures } from './retryFailed'

function createRow(localFileId: string, status: BatchTrackingRow['status']): BatchTrackingRow {
  return {
    localFileId,
    fileName: `${localFileId}.pdf`,
    studentId: `student-${localFileId}`,
    studentName: `Student ${localFileId}`,
    submissionId: `sub-${localFileId}`,
    status,
    score: status === 'completed' ? 88 : null,
    flaggedForReview: false,
    errorMessage: status === 'failed' ? 'Failed' : null,
  }
}

function createMapping(localFileId: string, includeFile: boolean): BatchFileMapping {
  return {
    localFileId,
    file: includeFile ? new File(['content'], `${localFileId}.pdf`, { type: 'application/pdf' }) : null,
    fileName: `${localFileId}.pdf`,
    fileSize: 1024,
    fileType: 'application/pdf',
    studentId: `student-${localFileId}`,
  }
}

describe('retryFailed orchestration', () => {
  it('returns only failed rows for retry planning', () => {
    const rows = [createRow('1', 'completed'), createRow('2', 'failed'), createRow('3', 'failed')]
    const failedRows = getFailedRows(rows)

    expect(failedRows).toHaveLength(2)
    expect(failedRows.map((row) => row.localFileId)).toEqual(['2', '3'])
  })

  it('builds retry mappings from failed entries only', () => {
    const rows = [createRow('1', 'completed'), createRow('2', 'failed')]
    const mappings = [createMapping('1', true), createMapping('2', true)]

    const retryMappings = buildFailedRetryMappings(rows, mappings)

    expect(retryMappings).toHaveLength(1)
    expect(retryMappings[0].localFileId).toBe('2')
  })

  it('reports retryable failures only when file payload is still present', () => {
    const rows = [createRow('1', 'failed')]

    expect(hasRetryableFailures(rows, [createMapping('1', false)])).toBe(false)
    expect(hasRetryableFailures(rows, [createMapping('1', true)])).toBe(true)
  })
})
