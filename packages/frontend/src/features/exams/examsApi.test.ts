import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../lib/api'
import { fetchExamTemplates, toExamTemplateListItem } from './examsApi'

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

const mockedGet = vi.mocked(api.get)

describe('examsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps optional missing fields to safe defaults', () => {
    const mapped = toExamTemplateListItem({ id: 'exam-1', title: 'Midterm' })

    expect(mapped).toEqual({
      id: 'exam-1',
      title: 'Midterm',
      questionCount: 0,
      totalPoints: 0,
      statusLabel: 'Draft',
    })
  })

  it('returns null for entries missing an identifier', () => {
    expect(toExamTemplateListItem({ title: 'No Id' })).toBeNull()
  })

  it('enforces strict numeric parsing for number-like fields', () => {
    const mapped = toExamTemplateListItem({
      id: 'exam-2',
      title: 'Final',
      questionCount: '10.5',
      totalPoints: '11e2',
      status: 'Published',
    })

    expect(mapped).toEqual({
      id: 'exam-2',
      title: 'Final',
      questionCount: 10.5,
      totalPoints: 0,
      statusLabel: 'Published',
    })
  })

  it('extracts templates from wrapped payload and filters invalid rows', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: {
          content: [
            { id: 'exam-a', name: 'Quiz A', questionCount: '8', totalPoints: '20' },
            { title: 'Missing id should be dropped' },
          ],
        },
      },
    })

    const templates = await fetchExamTemplates()

    expect(mockedGet).toHaveBeenCalledWith('/exam-templates')
    expect(templates).toEqual([
      {
        id: 'exam-a',
        title: 'Quiz A',
        questionCount: 8,
        totalPoints: 20,
        statusLabel: 'Draft',
      },
    ])
  })
})