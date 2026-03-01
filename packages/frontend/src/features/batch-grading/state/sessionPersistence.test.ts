import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BatchSessionSnapshot } from '../domain/batchTypes'
import {
  clearBatchSessionSnapshot,
  loadBatchSessionSnapshot,
  saveBatchSessionSnapshot,
} from './sessionPersistence'

const CLASS_ID = 'class-restore-1'

function createSnapshot(savedAt: string): BatchSessionSnapshot {
  return {
    classId: CLASS_ID,
    className: 'Biology 101',
    assignmentId: 'assignment-1',
    step: 'processing',
    rows: [
      {
        localFileId: 'file-1',
        fileName: 'submission.pdf',
        studentId: 'student-1',
        studentName: 'Student One',
        submissionId: 'sub-1',
        status: 'processing',
        score: null,
        flaggedForReview: false,
        errorMessage: null,
      },
    ],
    savedAt,
  }
}

describe('sessionPersistence', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.useRealTimers()
  })

  it('restores a valid non-expired snapshot', () => {
    const savedAt = new Date().toISOString()
    const snapshot = createSnapshot(savedAt)

    saveBatchSessionSnapshot(snapshot)
    const restored = loadBatchSessionSnapshot(CLASS_ID)

    expect(restored).toEqual(snapshot)
  })

  it('expires stale snapshots by ttl', () => {
    const now = new Date('2026-03-01T12:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const staleSnapshot = createSnapshot(new Date(now.getTime() - 31 * 60 * 1000).toISOString())
    saveBatchSessionSnapshot(staleSnapshot)

    const restored = loadBatchSessionSnapshot(CLASS_ID)

    expect(restored).toBeNull()
  })

  it('clears snapshots explicitly', () => {
    saveBatchSessionSnapshot(createSnapshot(new Date().toISOString()))

    clearBatchSessionSnapshot(CLASS_ID)

    expect(loadBatchSessionSnapshot(CLASS_ID)).toBeNull()
  })
})
