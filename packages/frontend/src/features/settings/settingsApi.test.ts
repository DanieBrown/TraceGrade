import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../lib/api'
import { getTeacherThreshold, updateTeacherThreshold } from './settingsApi'

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

const mockedGet = vi.mocked(api.get)
const mockedPut = vi.mocked(api.put)

describe('settingsApi normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTeacherThreshold', () => {
    it('normalizes numeric-string values within range', async () => {
      mockedGet.mockResolvedValueOnce({
        data: {
          data: {
            effectiveThreshold: '0.80',
            source: 'teacher_override',
            teacherThreshold: '0.65',
          },
        },
      })

      await expect(getTeacherThreshold()).resolves.toEqual({
        effectiveThreshold: 0.8,
        source: 'teacher_override',
        teacherThreshold: 0.65,
      })
      expect(mockedGet).toHaveBeenCalledWith('/teachers/me/grading-threshold')
    })

    it('accepts null teacherThreshold for default source', async () => {
      mockedGet.mockResolvedValueOnce({
        data: {
          data: {
            effectiveThreshold: 0.8,
            source: 'default',
            teacherThreshold: null,
          },
        },
      })

      await expect(getTeacherThreshold()).resolves.toEqual({
        effectiveThreshold: 0.8,
        source: 'default',
        teacherThreshold: null,
      })
    })

    it('returns null when payload is missing or malformed', async () => {
      mockedGet.mockResolvedValueOnce({ data: { data: undefined } })
      await expect(getTeacherThreshold()).resolves.toBeNull()

      mockedGet.mockResolvedValueOnce({ data: { data: null } })
      await expect(getTeacherThreshold()).resolves.toBeNull()

      mockedGet.mockResolvedValueOnce({
        data: {
          data: {
            effectiveThreshold: 0.8,
            source: 'teacher_override',
            teacherThreshold: undefined,
          },
        },
      })
      await expect(getTeacherThreshold()).resolves.toBeNull()

      mockedGet.mockResolvedValueOnce({
        data: {
          data: {
            effectiveThreshold: 0.8,
            source: 'unknown-source',
            teacherThreshold: 0.8,
          },
        },
      })
      await expect(getTeacherThreshold()).resolves.toBeNull()
    })

    it('returns null for out-of-range threshold values', async () => {
      mockedGet.mockResolvedValueOnce({
        data: {
          data: {
            effectiveThreshold: 1.01,
            source: 'teacher_override',
            teacherThreshold: 0.9,
          },
        },
      })
      await expect(getTeacherThreshold()).resolves.toBeNull()

      mockedGet.mockResolvedValueOnce({
        data: {
          data: {
            effectiveThreshold: 0.8,
            source: 'teacher_override',
            teacherThreshold: '-0.01',
          },
        },
      })
      await expect(getTeacherThreshold()).resolves.toBeNull()
    })
  })

  describe('updateTeacherThreshold', () => {
    it('normalizes numeric-string response values after save', async () => {
      mockedPut.mockResolvedValueOnce({
        data: {
          data: {
            effectiveThreshold: '0.91',
            source: 'teacher_override',
            teacherThreshold: '0.91',
          },
        },
      })

      await expect(updateTeacherThreshold(0.91)).resolves.toEqual({
        effectiveThreshold: 0.91,
        source: 'teacher_override',
        teacherThreshold: 0.91,
      })
      expect(mockedPut).toHaveBeenCalledWith('/teachers/me/grading-threshold', {
        threshold: 0.91,
      })
    })

    it('throws when saved payload is malformed, null/undefined, or out-of-range', async () => {
      mockedPut.mockResolvedValueOnce({ data: { data: undefined } })
      await expect(updateTeacherThreshold(0.8)).rejects.toThrow('Unexpected response while saving threshold')

      mockedPut.mockResolvedValueOnce({ data: { data: null } })
      await expect(updateTeacherThreshold(0.8)).rejects.toThrow('Unexpected response while saving threshold')

      mockedPut.mockResolvedValueOnce({
        data: {
          data: {
            effectiveThreshold: 0.8,
            source: 'teacher_override',
            teacherThreshold: undefined,
          },
        },
      })
      await expect(updateTeacherThreshold(0.8)).rejects.toThrow('Unexpected response while saving threshold')

      mockedPut.mockResolvedValueOnce({
        data: {
          data: {
            effectiveThreshold: 2,
            source: 'teacher_override',
            teacherThreshold: 0.8,
          },
        },
      })
      await expect(updateTeacherThreshold(0.8)).rejects.toThrow('Unexpected response while saving threshold')
    })
  })
})
