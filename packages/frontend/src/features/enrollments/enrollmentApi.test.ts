import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../lib/api'
import {
  dropStudent,
  enrollStudent,
  fetchEnrollments,
  getEnrollmentsErrorDetails,
} from './enrollmentApi'
import { NonRetryableEnrollmentsError } from './enrollmentTypes'

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const VALID_SCHOOL_ID = '123e4567-e89b-12d3-a456-426614174000'
const VALID_CLASS_ID = 'class-1'
const VALID_ENROLLMENT_ID = '550e8400-e29b-41d4-a716-446655440000'
const VALID_STUDENT_ID = '987e6543-e21b-45d3-b654-123456789abc'

const SAMPLE_ENROLLMENT = {
  id: VALID_ENROLLMENT_ID,
  classId: VALID_CLASS_ID,
  studentId: VALID_STUDENT_ID,
  enrolledAt: '2026-01-15T10:00:00Z',
  droppedAt: null,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
}

describe('enrollmentApi', () => {
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

  describe('fetchEnrollments', () => {
    it('uses the shared api client and class-scoped endpoint', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [] })

      await fetchEnrollments(VALID_CLASS_ID)

      expect(api.get).toHaveBeenCalledWith(
        `/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes/${encodeURIComponent(VALID_CLASS_ID)}/enrollments`
      )
    })

    it('fails closed when VITE_SCHOOL_ID is missing', async () => {
      delete import.meta.env.VITE_SCHOOL_ID

      await expect(fetchEnrollments(VALID_CLASS_ID)).rejects.toThrow(
        'Enrollments cannot be loaded because school configuration is missing. Set VITE_SCHOOL_ID and reload the page.'
      )
      expect(api.get).not.toHaveBeenCalled()
    })

    it('fails closed when VITE_SCHOOL_ID is invalid', async () => {
      import.meta.env.VITE_SCHOOL_ID = 'not-a-valid-uuid'

      await expect(fetchEnrollments(VALID_CLASS_ID)).rejects.toThrow(
        'Enrollments cannot be loaded because school configuration is invalid. Set VITE_SCHOOL_ID to a valid school UUID and reload the page.'
      )
      expect(api.get).not.toHaveBeenCalled()
    })

    it('fails closed when classId is empty', async () => {
      await expect(fetchEnrollments('   ')).rejects.toThrow(
        'Enrollment action cannot be completed because class information is missing. Refresh the page and try again.'
      )
      expect(api.get).not.toHaveBeenCalled()
    })

    it('fails closed when classId format is invalid', async () => {
      await expect(fetchEnrollments('../etc/passwd')).rejects.toThrow(
        'Enrollment action cannot be completed because class information is invalid. Refresh the page and try again.'
      )
      expect(api.get).not.toHaveBeenCalled()
    })

    it('filters to active enrollments only (droppedAt === null)', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: [
          SAMPLE_ENROLLMENT,
          { ...SAMPLE_ENROLLMENT, id: 'dropped-id', droppedAt: '2026-02-01T10:00:00Z' },
        ],
      })

      const result = await fetchEnrollments(VALID_CLASS_ID)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(VALID_ENROLLMENT_ID)
    })

    it('normalizes payload envelope and drops malformed records', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          data: [
            SAMPLE_ENROLLMENT,
            { id: 'missing-required-fields' }, // missing classId, studentId, etc.
          ],
        },
      })

      const result = await fetchEnrollments(VALID_CLASS_ID)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(VALID_ENROLLMENT_ID)
    })

    it('accepts slash class ids safely URL-encoded', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [] })

      await fetchEnrollments('class/a')

      expect(api.get).toHaveBeenCalledWith(
        `/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes/${encodeURIComponent('class/a')}/enrollments`
      )
    })
  })

  describe('enrollStudent', () => {
    it('posts to the enrollments endpoint with studentId body', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: { data: SAMPLE_ENROLLMENT } })

      await enrollStudent(VALID_CLASS_ID, VALID_STUDENT_ID)

      expect(api.post).toHaveBeenCalledWith(
        `/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes/${encodeURIComponent(VALID_CLASS_ID)}/enrollments`,
        { studentId: VALID_STUDENT_ID }
      )
    })

    it('returns a normalized EnrollmentListItem on success', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: { data: SAMPLE_ENROLLMENT } })

      const result = await enrollStudent(VALID_CLASS_ID, VALID_STUDENT_ID)

      expect(result).toEqual(SAMPLE_ENROLLMENT)
    })

    it('throws when response cannot be normalized', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: { data: { name: 'Missing id' } } })

      await expect(enrollStudent(VALID_CLASS_ID, VALID_STUDENT_ID)).rejects.toThrow(
        'Failed to parse enrollment response'
      )
    })

    it('fails closed when VITE_SCHOOL_ID is missing', async () => {
      delete import.meta.env.VITE_SCHOOL_ID

      await expect(enrollStudent(VALID_CLASS_ID, VALID_STUDENT_ID)).rejects.toThrow(
        NonRetryableEnrollmentsError
      )
      expect(api.post).not.toHaveBeenCalled()
    })
  })

  describe('dropStudent', () => {
    it('sends DELETE to the enrollment-scoped endpoint', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({})

      await dropStudent(VALID_CLASS_ID, VALID_ENROLLMENT_ID)

      expect(api.delete).toHaveBeenCalledWith(
        `/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/classes/${encodeURIComponent(VALID_CLASS_ID)}/enrollments/${encodeURIComponent(VALID_ENROLLMENT_ID)}`
      )
    })

    it('returns void on success', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({})

      await expect(dropStudent(VALID_CLASS_ID, VALID_ENROLLMENT_ID)).resolves.toBeUndefined()
    })

    it('fails closed when VITE_SCHOOL_ID is missing', async () => {
      delete import.meta.env.VITE_SCHOOL_ID

      await expect(dropStudent(VALID_CLASS_ID, VALID_ENROLLMENT_ID)).rejects.toThrow(
        NonRetryableEnrollmentsError
      )
      expect(api.delete).not.toHaveBeenCalled()
    })
  })

  describe('getEnrollmentsErrorDetails', () => {
    it('returns non-retryable for NonRetryableEnrollmentsError', () => {
      const error = new NonRetryableEnrollmentsError('school config missing')

      expect(getEnrollmentsErrorDetails(error)).toEqual({
        message: 'school config missing',
        retryable: false,
      })
    })

    it('returns non-retryable for 401 axios error', () => {
      const error = { isAxiosError: true, response: { status: 401 } }

      expect(getEnrollmentsErrorDetails(error)).toEqual({
        message: 'You do not have permission to view enrollments.',
        retryable: false,
      })
    })

    it('returns non-retryable for 403 axios error', () => {
      const error = { isAxiosError: true, response: { status: 403 } }

      expect(getEnrollmentsErrorDetails(error)).toEqual({
        message: 'You do not have permission to view enrollments.',
        retryable: false,
      })
    })

    it('returns non-retryable for 404 axios error', () => {
      const error = { isAxiosError: true, response: { status: 404 } }

      expect(getEnrollmentsErrorDetails(error)).toEqual({
        message: 'Enrollment data could not be found.',
        retryable: false,
      })
    })

    it('returns retryable for 500 axios error', () => {
      const error = { isAxiosError: true, response: { status: 500 } }

      expect(getEnrollmentsErrorDetails(error)).toEqual({
        message: 'The server encountered an error. Please try again later.',
        retryable: true,
      })
    })

    it('returns retryable for network error (no response)', () => {
      const error = { isAxiosError: true, response: undefined }

      expect(getEnrollmentsErrorDetails(error)).toEqual({
        message: 'Could not connect to the server. Check your connection.',
        retryable: true,
      })
    })

    it('returns generic retryable for unknown errors', () => {
      expect(getEnrollmentsErrorDetails(new Error('unknown'))).toEqual({
        message: 'There was a problem loading enrollments.',
        retryable: true,
      })
    })
  })
})
