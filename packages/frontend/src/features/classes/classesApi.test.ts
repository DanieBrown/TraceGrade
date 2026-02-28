import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../lib/api'
import {
  archiveClass,
  createClass,
  fetchClasses,
  getClassesLoadErrorDetails,
  isClassListEmpty,
  isValidSchoolId,
  updateClass,
} from './classesApi'

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const VALID_SCHOOL_ID = '123e4567-e89b-12d3-a456-426614174000'
const VALID_CLASS_ID = '987e6543-e21b-45d3-b654-123456789abc'
const VALID_NON_UUID_CLASS_ID = 'class-1'
const VALID_SLASH_CLASS_ID = 'class/a'

describe('classesApi', () => {
  const originalSchoolId = import.meta.env.VITE_SCHOOL_ID

  beforeEach(() => {
    vi.clearAllMocks()
    import.meta.env.VITE_SCHOOL_ID = VALID_SCHOOL_ID
  })

  afterAll(() => {
    if (originalSchoolId === undefined) {
      delete import.meta.env.VITE_SCHOOL_ID
      return
    }

    import.meta.env.VITE_SCHOOL_ID = originalSchoolId
  })

  describe('fetchClasses', () => {
    it('uses the shared api client and school-scoped endpoint', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [] })

      await fetchClasses()

      expect(api.get).toHaveBeenCalledWith(`/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes`)
    })

    it('fails closed when VITE_SCHOOL_ID is missing', async () => {
      delete import.meta.env.VITE_SCHOOL_ID

      await expect(fetchClasses()).rejects.toThrow(
        'Classes cannot be loaded because school configuration is missing. Set VITE_SCHOOL_ID and reload the page.'
      )
      expect(api.get).not.toHaveBeenCalled()
    })

    it('fails closed when VITE_SCHOOL_ID is invalid', async () => {
      import.meta.env.VITE_SCHOOL_ID = 'invalid-school-id'

      await expect(fetchClasses()).rejects.toThrow(
        'Classes cannot be loaded because school configuration is invalid. Set VITE_SCHOOL_ID to a valid school UUID and reload the page.'
      )
      expect(api.get).not.toHaveBeenCalled()
    })

    it('normalizes payload envelopes and filters inactive or malformed records', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          data: {
            items: [
              {
                id: VALID_NON_UUID_CLASS_ID,
                name: 'Biology 101',
                subject: 'Science',
                period: '2',
                schoolYear: '2026-2027',
                isActive: true,
              },
              {
                id: VALID_SLASH_CLASS_ID,
                name: 'Chemistry A',
                subject: 'Science',
                period: '3',
                schoolYear: '2026-2027',
                isActive: true,
              },
              {
                classId: 'class-2',
                className: 'Archived Class',
                active: false,
              },
              {
                name: 'Missing id should be dropped',
              },
              {
                id: '../invalid-path-id',
                name: 'Invalid ID should be dropped',
              },
            ],
          },
        },
      })

      await expect(fetchClasses()).resolves.toEqual([
        {
          id: VALID_NON_UUID_CLASS_ID,
          name: 'Biology 101',
          subject: 'Science',
          period: '2',
          schoolYear: '2026-2027',
          isActive: true,
        },
        {
          id: VALID_SLASH_CLASS_ID,
          name: 'Chemistry A',
          subject: 'Science',
          period: '3',
          schoolYear: '2026-2027',
          isActive: true,
        },
      ])
    })
  })

  describe('mutations', () => {
    it('creates and normalizes class payload', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          data: {
            id: 'class-3',
            name: 'Chemistry',
            subject: 'Science',
            period: '4',
            school_year: '2026-2027',
          },
        },
      })

      await expect(
        createClass({
          name: 'Chemistry',
          subject: 'Science',
          period: '4',
          schoolYear: '2026-2027',
        })
      ).resolves.toEqual({
        id: 'class-3',
        name: 'Chemistry',
        subject: 'Science',
        period: '4',
        schoolYear: '2026-2027',
        isActive: true,
      })

      expect(api.post).toHaveBeenCalledWith(`/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes`, {
        name: 'Chemistry',
        subject: 'Science',
        period: '4',
        schoolYear: '2026-2027',
      })
    })

    it('rejects create mutation when response cannot be normalized', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          data: {
            name: 'Missing id',
          },
        },
      })

      await expect(
        createClass({
          name: 'Chemistry',
          subject: 'Science',
          period: '4',
          schoolYear: '2026-2027',
        })
      ).rejects.toThrow('Failed to parse created class response')
    })

    it('updates using class id and returns normalized class', async () => {
      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          data: {
            id: VALID_CLASS_ID,
            className: 'Chemistry Honors',
            course: 'Science',
            period: '5',
            academicYear: '2026-2027',
          },
        },
      })

      await expect(updateClass(VALID_CLASS_ID, { period: '5' })).resolves.toEqual({
        id: VALID_CLASS_ID,
        name: 'Chemistry Honors',
        subject: 'Science',
        period: '5',
        schoolYear: '2026-2027',
        isActive: true,
      })

      expect(api.put).toHaveBeenCalledWith(`/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes/${encodeURIComponent(VALID_CLASS_ID)}`, {
        period: '5',
      })
    })

    it('accepts non-uuid class ids for mutation when they pass class id policy', async () => {
      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          data: {
            id: VALID_NON_UUID_CLASS_ID,
            className: 'Biology 102',
            course: 'Science',
            period: '3',
            academicYear: '2026-2027',
          },
        },
      })

      await expect(updateClass(VALID_NON_UUID_CLASS_ID, { period: '3' })).resolves.toEqual({
        id: VALID_NON_UUID_CLASS_ID,
        name: 'Biology 102',
        subject: 'Science',
        period: '3',
        schoolYear: '2026-2027',
        isActive: true,
      })

      expect(api.put).toHaveBeenCalledWith(
        `/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes/${encodeURIComponent(VALID_NON_UUID_CLASS_ID)}`,
        {
          period: '3',
        }
      )
    })

    it('accepts slash class ids for mutation when safely URL-encoded', async () => {
      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          data: {
            id: VALID_SLASH_CLASS_ID,
            className: 'Biology A',
            course: 'Science',
            period: '3',
            academicYear: '2026-2027',
          },
        },
      })

      await expect(updateClass(VALID_SLASH_CLASS_ID, { period: '3' })).resolves.toEqual({
        id: VALID_SLASH_CLASS_ID,
        name: 'Biology A',
        subject: 'Science',
        period: '3',
        schoolYear: '2026-2027',
        isActive: true,
      })

      expect(api.put).toHaveBeenCalledWith(
        `/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes/${encodeURIComponent(VALID_SLASH_CLASS_ID)}`,
        {
          period: '3',
        }
      )
    })

    it('rejects update mutation when class id is empty', async () => {
      await expect(updateClass('   ', { period: '5' })).rejects.toThrow(
        'Class action cannot be completed because class information is missing. Refresh the page and try again.'
      )

      expect(api.put).not.toHaveBeenCalled()
    })

    it('rejects update mutation when class id format is invalid', async () => {
      await expect(updateClass('../etc/passwd', { period: '5' })).rejects.toThrow(
        'Class action cannot be completed because class information is invalid. Refresh the page and try again.'
      )

      expect(api.put).not.toHaveBeenCalled()
    })

    it('rejects update mutation when response cannot be normalized', async () => {
      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          data: {
            name: 'Missing id',
          },
        },
      })

      await expect(updateClass(VALID_CLASS_ID, { period: '5' })).rejects.toThrow('Failed to parse updated class response')
    })

    it('archives using shared api client and class id', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({})

      await archiveClass(VALID_CLASS_ID)

      expect(api.delete).toHaveBeenCalledWith(
        `/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes/${encodeURIComponent(VALID_CLASS_ID)}`
      )
    })

    it('archives using a non-uuid class id accepted by list normalization', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({})

      await archiveClass(VALID_NON_UUID_CLASS_ID)

      expect(api.delete).toHaveBeenCalledWith(
        `/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes/${encodeURIComponent(VALID_NON_UUID_CLASS_ID)}`
      )
    })

    it('archives using slash class id by URL-encoding the path segment', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({})

      await archiveClass(VALID_SLASH_CLASS_ID)

      expect(api.delete).toHaveBeenCalledWith(
        `/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes/${encodeURIComponent(VALID_SLASH_CLASS_ID)}`
      )
    })

    it('keeps create/list ids actionable for follow-up update and archive flows', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          data: {
            id: VALID_SLASH_CLASS_ID,
            name: 'Chemistry A',
            subject: 'Science',
            period: '4',
            schoolYear: '2026-2027',
          },
        },
      })

      vi.mocked(api.put).mockResolvedValueOnce({
        data: {
          data: {
            id: VALID_SLASH_CLASS_ID,
            name: 'Chemistry A+',
            subject: 'Science',
            period: '5',
            schoolYear: '2026-2027',
          },
        },
      })

      vi.mocked(api.delete).mockResolvedValueOnce({})

      const created = await createClass({
        name: 'Chemistry A',
        subject: 'Science',
        period: '4',
        schoolYear: '2026-2027',
      })

      await updateClass(created.id, { period: '5' })
      await archiveClass(created.id)

      expect(api.put).toHaveBeenCalledWith(
        `/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes/${encodeURIComponent(VALID_SLASH_CLASS_ID)}`,
        {
          period: '5',
        }
      )

      expect(api.delete).toHaveBeenCalledWith(
        `/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes/${encodeURIComponent(VALID_SLASH_CLASS_ID)}`
      )
    })

    it('rejects archive mutation when class id is empty', async () => {
      await expect(archiveClass('')).rejects.toThrow(
        'Class action cannot be completed because class information is missing. Refresh the page and try again.'
      )

      expect(api.delete).not.toHaveBeenCalled()
    })

    it('rejects archive mutation when class id format is invalid', async () => {
      await expect(archiveClass('not a valid id')).rejects.toThrow(
        'Class action cannot be completed because class information is invalid. Refresh the page and try again.'
      )

      expect(api.delete).not.toHaveBeenCalled()
    })
  })

  describe('helpers', () => {
    it('validates school ids and empty list helper', () => {
      expect(isValidSchoolId(VALID_SCHOOL_ID)).toBe(true)
      expect(isValidSchoolId('bad')).toBe(false)

      expect(isClassListEmpty([])).toBe(true)
      expect(
        isClassListEmpty([
          {
            id: 'class-1',
            name: 'Math',
            subject: 'Math',
            period: '1',
            schoolYear: '2026-2027',
            isActive: true,
          },
        ])
      ).toBe(false)
    })

    it('returns user-safe retry metadata for load errors', () => {
      expect(getClassesLoadErrorDetails(new Error('anything'))).toEqual({
        message: 'There was a problem loading classes.',
        retryable: true,
      })

      const networkAxiosError = {
        isAxiosError: true,
        response: undefined,
      }

      expect(getClassesLoadErrorDetails(networkAxiosError)).toEqual({
        message: 'Could not connect to the server. Check your connection.',
        retryable: true,
      })

      const forbiddenAxiosError = {
        isAxiosError: true,
        response: {
          status: 403,
        },
      }

      expect(getClassesLoadErrorDetails(forbiddenAxiosError)).toEqual({
        message: 'You do not have permission to view classes.',
        retryable: false,
      })
    })
  })
})
