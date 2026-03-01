import type { BatchSessionSnapshot } from '../domain/batchTypes'

const SESSION_TTL_MS = 30 * 60 * 1000
const STORAGE_PREFIX = 'tracegrade:batch-grading'

function getStorageKey(classId: string): string {
  return `${STORAGE_PREFIX}:${classId}`
}

function isStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

function isExpired(savedAt: string, ttlMs: number): boolean {
  const timestamp = Date.parse(savedAt)

  if (Number.isNaN(timestamp)) {
    return true
  }

  return Date.now() - timestamp > ttlMs
}

export function saveBatchSessionSnapshot(snapshot: BatchSessionSnapshot): void {
  if (!isStorageAvailable()) {
    return
  }

  window.sessionStorage.setItem(getStorageKey(snapshot.classId), JSON.stringify(snapshot))
}

export function loadBatchSessionSnapshot(
  classId: string,
  ttlMs = SESSION_TTL_MS,
): BatchSessionSnapshot | null {
  if (!isStorageAvailable()) {
    return null
  }

  const serialized = window.sessionStorage.getItem(getStorageKey(classId))
  if (!serialized) {
    return null
  }

  try {
    const parsed = JSON.parse(serialized) as BatchSessionSnapshot

    if (!parsed || parsed.classId !== classId || isExpired(parsed.savedAt, ttlMs)) {
      clearBatchSessionSnapshot(classId)
      return null
    }

    return parsed
  } catch {
    clearBatchSessionSnapshot(classId)
    return null
  }
}

export function clearBatchSessionSnapshot(classId: string): void {
  if (!isStorageAvailable()) {
    return
  }

  window.sessionStorage.removeItem(getStorageKey(classId))
}
