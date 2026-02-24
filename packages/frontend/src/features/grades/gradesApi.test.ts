import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../lib/api'
import {
  fetchClassGradebook,
  fetchClassesForGradebook,
  getGradesLoadErrorDetails,
  isGradebookEmpty,
  toGradebookViewModel,
} from './gradesApi'

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

const mockedGet = vi.mocked(api.get)

describe('gradesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses shared api client for class list fetch and maps safe class labels', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: {
          items: [
            { id: 'class-1', name: 'Math 7A' },
            { classId: 'class-2' },
            { label: 'Missing id should be dropped' },
          ],
        },
      },
    })

    const classes = await fetchClassesForGradebook()

    expect(mockedGet).toHaveBeenCalledWith('/classes')
    expect(classes).toEqual([
      { id: 'class-1', label: 'Math 7A' },
      { id: 'class-2', label: 'Untitled Class' },
    ])
  })

  it('normalizes partial gradebook payloads with safe defaults', () => {
    const viewModel = toGradebookViewModel({
      data: {
        className: 'Science 8B',
        columns: [
          { id: 'col-1', label: 'Quiz 1', maxPoints: '20' },
          { assignmentId: 'col-2' },
        ],
        rows: [
          {
            id: 'student-1',
            firstName: 'Alex',
            lastName: 'Kim',
            scores: {
              'col-1': '18',
            },
          },
          {
            studentId: 'student-2',
            fullName: 'Sam Patel',
            grades: [{ assignmentId: 'col-2', score: null }],
          },
        ],
      },
    })

    expect(viewModel.classId).toBe('')
    expect(viewModel.classLabel).toBe('Science 8B')
    expect(viewModel.columns).toEqual([
      { id: 'col-1', label: 'Quiz 1', categoryLabel: null, maxPoints: 20 },
      { id: 'col-2', label: 'Untitled Column 2', categoryLabel: null, maxPoints: null },
    ])
    expect(viewModel.rows[0].studentName).toBe('Alex Kim')
    expect(viewModel.rows[0].cells).toEqual([
      { columnId: 'col-1', score: 18, displayValue: '18' },
      { columnId: 'col-2', score: null, displayValue: '—' },
    ])
    expect(viewModel.rows[1].cells[1]).toEqual({
      columnId: 'col-2',
      score: null,
      displayValue: '—',
    })
  })

  it('uses encoded class endpoint and fills missing classId from request context', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        classLabel: 'History',
        columns: [],
        rows: [],
      },
    })

    const result = await fetchClassGradebook(' class/a ')

    expect(mockedGet).toHaveBeenCalledWith('/classes/class%2Fa/gradebook')
    expect(result.classId).toBe('class/a')
  })

  it('treats blank class selection errors as non-retryable', async () => {
    await expect(fetchClassGradebook('   ')).rejects.toThrow(
      'Grades cannot be loaded because class selection is missing.'
    )

    expect(mockedGet).not.toHaveBeenCalled()

    try {
      await fetchClassGradebook('')
      throw new Error('Expected fetchClassGradebook to throw for blank classId')
    } catch (error) {
      expect(getGradesLoadErrorDetails(error)).toEqual({
        message: 'Grades cannot be loaded because class selection is missing.',
        retryable: false,
      })
    }
  })

  it('handles deterministic empty and error helpers', () => {
    expect(
      isGradebookEmpty({
        classId: 'class-1',
        classLabel: 'Math',
        columns: [{ id: 'col-1', label: 'Quiz 1', categoryLabel: null, maxPoints: null }],
        rows: [],
      })
    ).toBe(true)

    expect(getGradesLoadErrorDetails(new Error('network'))).toEqual({
      message: 'There was a problem connecting to the server.',
      retryable: true,
    })
  })

  it('handles edge cases in data normalization', () => {
    const viewModel = toGradebookViewModel({
      data: {
        classId: 123, // number should be converted to string
        className: '   ', // empty string should fallback
        columns: [
          null, // invalid column
          { id: 'col-2', maxPoints: 'abc' }, // invalid number
          { id: 'col-3', maxPoints: '18.50' }, // float number
        ],
        rows: [
          null, // invalid row
          {
            id: 'student-1',
            // no name provided
            cells: [
              null, // invalid cell
              { columnId: 'col-3', score: 18.5 },
            ],
          },
        ],
      },
    })

    expect(viewModel.classId).toBe('123')
    expect(viewModel.classLabel).toBe('Untitled Class')
    expect(viewModel.columns).toEqual([
      { id: 'column-1', label: 'Untitled Column 1', categoryLabel: null, maxPoints: null },
      { id: 'col-2', label: 'Untitled Column 2', categoryLabel: null, maxPoints: null },
      { id: 'col-3', label: 'Untitled Column 3', categoryLabel: null, maxPoints: 18.5 },
    ])
    expect(viewModel.rows[0].studentName).toBe('Unnamed Student')
    expect(viewModel.rows[0].cells).toEqual([
      { columnId: 'column-1', score: null, displayValue: '—' },
      { columnId: 'col-2', score: null, displayValue: '—' },
      { columnId: 'col-3', score: 18.5, displayValue: '18.50' },
    ])
  })
})
