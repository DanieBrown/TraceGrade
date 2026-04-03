import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../lib/api'
import { ensureExamAssignmentForClass } from './examCreationApi'

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockedGet = vi.mocked(api.get)
const mockedPost = vi.mocked(api.post)

describe('examCreationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_SCHOOL_ID', '11111111-1111-4111-8111-111111111111')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates an Exams category when needed and then creates the class assignment', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: [],
      },
    })
    mockedPost
      .mockResolvedValueOnce({
        data: {
          data: {
            id: 'category-1',
            classId: 'class-1',
            name: 'Exams',
            weight: 0,
            dropLowest: 0,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            id: 'assignment-1',
            classId: 'class-1',
            categoryId: 'category-1',
            name: 'Algebra Midterm',
            maxPoints: 10,
            isPublished: true,
          },
        },
      })

    const result = await ensureExamAssignmentForClass({
      classId: 'class-1',
      examName: 'Algebra Midterm',
      topic: '',
      totalPoints: 10,
    })

    expect(mockedGet).toHaveBeenCalledWith(
      '/schools/11111111-1111-4111-8111-111111111111/classes/class-1/categories',
    )
    expect(mockedPost).toHaveBeenNthCalledWith(
      1,
      '/schools/11111111-1111-4111-8111-111111111111/classes/class-1/categories',
      {
        name: 'Exams',
        weight: 0,
        dropLowest: 0,
      },
    )
    expect(mockedPost).toHaveBeenNthCalledWith(
      2,
      '/schools/11111111-1111-4111-8111-111111111111/classes/class-1/assignments',
      expect.objectContaining({
        categoryId: 'category-1',
        name: 'Algebra Midterm',
        maxPoints: 10,
        isPublished: true,
      }),
    )
    expect(result).toEqual({
      assignmentId: 'assignment-1',
      categoryId: 'category-1',
    })
  })
})