import { describe, expect, it } from 'vitest'
import { isValidAssignmentId, normalizeAssignmentId } from './assignmentContext'

describe('assignmentContext', () => {
  it('accepts valid UUID assignment ids', () => {
    expect(isValidAssignmentId('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(isValidAssignmentId(' 123e4567-e89b-12d3-a456-426614174000 ')).toBe(true)
  })

  it('rejects missing and malformed assignment ids', () => {
    expect(isValidAssignmentId('')).toBe(false)
    expect(isValidAssignmentId('assignment-1')).toBe(false)
    expect(isValidAssignmentId('abc&x=1')).toBe(false)
    expect(isValidAssignmentId('123e4567-e89b-12d3-a456-426614174000&x=1')).toBe(false)
  })

  it('normalizes valid assignment ids and fails closed for invalid values', () => {
    expect(normalizeAssignmentId(' 123e4567-e89b-12d3-a456-426614174000 ')).toBe(
      '123e4567-e89b-12d3-a456-426614174000',
    )
    expect(normalizeAssignmentId('bad-id')).toBe('')
    expect(normalizeAssignmentId('')).toBe('')
    expect(normalizeAssignmentId(null)).toBe('')
  })
})
