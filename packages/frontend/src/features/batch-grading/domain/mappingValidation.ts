import type { BatchFileMapping, MappingValidationResult } from './batchTypes'

function appendRowError(
  rowErrors: Record<string, string[]>,
  localFileId: string,
  message: string,
): void {
  const existing = rowErrors[localFileId] ?? []
  rowErrors[localFileId] = [...existing, message]
}

export function validateMappings(
  mappings: BatchFileMapping[],
  enrolledStudentIds: Set<string>,
): MappingValidationResult {
  const rowErrors: Record<string, string[]> = {}
  const formErrors: string[] = []

  if (mappings.length === 0) {
    formErrors.push('Upload at least one submission file before continuing.')
  }

  if (enrolledStudentIds.size === 0) {
    formErrors.push('This class has no enrolled students available for mapping.')
  }

  if (mappings.length > enrolledStudentIds.size && enrolledStudentIds.size > 0) {
    formErrors.push('You uploaded more files than enrolled students. Remove files or adjust class roster.')
  }

  const seenByStudentId = new Map<string, string[]>()

  for (const mapping of mappings) {
    const { localFileId, studentId } = mapping

    if (!studentId) {
      appendRowError(rowErrors, localFileId, 'Select a student for this file.')
      continue
    }

    if (!enrolledStudentIds.has(studentId)) {
      appendRowError(
        rowErrors,
        localFileId,
        'Selected student is not enrolled in this class.',
      )
    }

    const localFileIds = seenByStudentId.get(studentId) ?? []
    seenByStudentId.set(studentId, [...localFileIds, localFileId])
  }

  for (const localFileIds of seenByStudentId.values()) {
    if (localFileIds.length <= 1) {
      continue
    }

    for (const localFileId of localFileIds) {
      appendRowError(
        rowErrors,
        localFileId,
        'Each student can only be assigned one file in a batch.',
      )
    }
  }

  const valid = formErrors.length === 0 && Object.keys(rowErrors).length === 0

  return {
    valid,
    rowErrors,
    formErrors,
  }
}
