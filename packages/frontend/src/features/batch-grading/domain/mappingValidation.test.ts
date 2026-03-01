import { describe, expect, it } from 'vitest'
import type { BatchFileMapping } from './batchTypes'
import { validateMappings } from './mappingValidation'

function createMapping(localFileId: string, studentId: string | null): BatchFileMapping {
  return {
    localFileId,
    file: null,
    fileName: `${localFileId}.pdf`,
    fileSize: 1024,
    fileType: 'application/pdf',
    studentId,
  }
}

describe('validateMappings', () => {
  it('returns valid for one-to-one enrolled mappings', () => {
    const result = validateMappings(
      [createMapping('file-1', 'student-1'), createMapping('file-2', 'student-2')],
      new Set(['student-1', 'student-2']),
    )

    expect(result.valid).toBe(true)
    expect(result.formErrors).toEqual([])
    expect(result.rowErrors).toEqual({})
  })

  it('blocks submit for unmapped files and duplicate student assignments', () => {
    const result = validateMappings(
      [
        createMapping('file-1', null),
        createMapping('file-2', 'student-1'),
        createMapping('file-3', 'student-1'),
      ],
      new Set(['student-1', 'student-2']),
    )

    expect(result.valid).toBe(false)
    expect(result.rowErrors['file-1']).toContain('Select a student for this file.')
    expect(result.rowErrors['file-2']).toContain('Each student can only be assigned one file in a batch.')
    expect(result.rowErrors['file-3']).toContain('Each student can only be assigned one file in a batch.')
  })

  it('returns actionable form errors when file count exceeds enrolled roster', () => {
    const result = validateMappings(
      [createMapping('file-1', 'student-1'), createMapping('file-2', 'student-2')],
      new Set(['student-1']),
    )

    expect(result.valid).toBe(false)
    expect(result.formErrors).toContain(
      'You uploaded more files than enrolled students. Remove files or adjust class roster.',
    )
  })

  it('flags non-enrolled mappings', () => {
    const result = validateMappings(
      [createMapping('file-1', 'student-404')],
      new Set(['student-1']),
    )

    expect(result.valid).toBe(false)
    expect(result.rowErrors['file-1']).toContain('Selected student is not enrolled in this class.')
  })
})
