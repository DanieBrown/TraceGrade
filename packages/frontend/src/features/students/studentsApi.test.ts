import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import api from '../../lib/api'
import { fetchStudents, isValidSchoolId, isStudentListEmpty } from './studentsApi'

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

const VALID_SCHOOL_ID = '123e4567-e89b-12d3-a456-426614174000'

describe('studentsApi', () => {
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

  describe('fetchStudents', () => {
    it('should use the shared api client to fetch scoped students', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [] })
      await fetchStudents()
      expect(api.get).toHaveBeenCalledWith(`/schools/${encodeURIComponent(VALID_SCHOOL_ID)}/students`)
    })

    it('should fail closed when VITE_SCHOOL_ID is missing', async () => {
      delete import.meta.env.VITE_SCHOOL_ID

      await expect(fetchStudents()).rejects.toThrow(
        'Students cannot be loaded because school configuration is missing. Set VITE_SCHOOL_ID and reload the page.'
      )
      expect(api.get).not.toHaveBeenCalled()
    })

    it('should fail closed when VITE_SCHOOL_ID is invalid', async () => {
      import.meta.env.VITE_SCHOOL_ID = 'invalid-school-id'

      await expect(fetchStudents()).rejects.toThrow(
        'Students cannot be loaded because school configuration is invalid. Set VITE_SCHOOL_ID to a valid school UUID and reload the page.'
      )
      expect(api.get).not.toHaveBeenCalled()
    })

    it('should handle a successful response with a list of students', async () => {
      const mockData = [
        { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', studentNumber: 'S001', isActive: true },
        { id: '2', fullName: 'Jane Smith', email: 'jane@example.com', studentNumber: 'S002', isActive: false },
      ]
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockData })

      const result = await fetchStudents()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: '1',
        fullName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        studentNumber: 'S001',
        classLabel: null,
        gradeLabel: null,
        isActive: true,
      })
      expect(result[1]).toEqual({
        id: '2',
        fullName: 'Jane Smith',
        firstName: null,
        lastName: null,
        email: 'jane@example.com',
        studentNumber: 'S002',
        classLabel: null,
        gradeLabel: null,
        isActive: false,
      })
    })

    it('should safely handle malformed records (missing id)', async () => {
      const mockData = [
        { firstName: 'No ID' }, // Should be filtered out
        { id: '3', firstName: 'Valid', lastName: 'ID' },
      ]
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockData })

      const result = await fetchStudents()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('3')
    })

    it('should safely handle incomplete records (missing optional fields)', async () => {
      const mockData = [
        { id: '4' }, // Only ID provided
      ]
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockData })

      const result = await fetchStudents()

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: '4',
        fullName: 'Unnamed Student',
        firstName: null,
        lastName: null,
        email: null,
        studentNumber: null,
        classLabel: null,
        gradeLabel: null,
        isActive: true, // Default fallback
      })
    })

    it('should extract student list from various payload envelopes', async () => {
      const mockData = {
        data: {
          items: [{ id: '5', fullName: 'Envelope Student' }]
        }
      }
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockData })

      const result = await fetchStudents()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('5')
    })

    it('should handle non-array payloads gracefully', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: null })
      const result1 = await fetchStudents()
      expect(result1).toEqual([])

      vi.mocked(api.get).mockResolvedValueOnce({ data: 'string payload' })
      const result2 = await fetchStudents()
      expect(result2).toEqual([])
    })
  })

  describe('isValidSchoolId', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidSchoolId('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
      expect(isValidSchoolId('018f4f3e-4a8e-7b21-8e8b-f13a0e3f9abc')).toBe(true)
    })

    it('should return false for invalid UUIDs', () => {
      expect(isValidSchoolId('invalid-id')).toBe(false)
      expect(isValidSchoolId('')).toBe(false)
    })
  })

  describe('isStudentListEmpty', () => {
    it('should return true for empty list', () => {
      expect(isStudentListEmpty([])).toBe(true)
    })

    it('should return false for non-empty list', () => {
      expect(
        isStudentListEmpty([
          {
            id: '1',
            fullName: 'Test',
            firstName: null,
            lastName: null,
            email: null,
            studentNumber: null,
            classLabel: null,
            gradeLabel: null,
            isActive: true,
          },
        ])
      ).toBe(false)
    })
  })
})
