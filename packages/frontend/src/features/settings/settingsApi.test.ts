import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../lib/api'
import { getGradingProvider, getTeacherThreshold, updateGradingProvider, updateTeacherThreshold } from './settingsApi'

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}))

const mockedGet = vi.mocked(api.get)
const mockedPatch = vi.mocked(api.patch)
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

  describe('getGradingProvider', () => {
    it('normalizes the current provider and available options', async () => {
      mockedGet.mockResolvedValueOnce({
        data: {
          data: {
            currentProvider: 'GEMINI_FLASH',
            availableProviders: [
              {
                id: 'GEMINI_FLASH',
                displayName: 'Gemini 2.0 Flash',
                description: 'Free — recommended',
              },
              {
                id: 'OPENAI_GPT4O',
                displayName: 'GPT-4o',
                description: 'OpenAI — requires API key',
              },
            ],
          },
        },
      })

      await expect(getGradingProvider()).resolves.toEqual({
        currentProvider: 'GEMINI_FLASH',
        availableProviders: [
          {
            id: 'GEMINI_FLASH',
            displayName: 'Gemini 2.0 Flash',
            description: 'Free — recommended',
          },
          {
            id: 'OPENAI_GPT4O',
            displayName: 'GPT-4o',
            description: 'OpenAI — requires API key',
          },
        ],
      })
      expect(mockedGet).toHaveBeenCalledWith('/settings/grading')
    })

    it('returns null when the provider payload is malformed', async () => {
      mockedGet.mockResolvedValueOnce({ data: { data: undefined } })
      await expect(getGradingProvider()).resolves.toBeNull()

      mockedGet.mockResolvedValueOnce({
        data: {
          data: {
            currentProvider: 'NOPE',
            availableProviders: [],
          },
        },
      })
      await expect(getGradingProvider()).resolves.toBeNull()

      mockedGet.mockResolvedValueOnce({
        data: {
          data: {
            currentProvider: 'GEMINI_FLASH',
            availableProviders: [
              {
                id: 'CLAUDE_SONNET',
                displayName: 'Claude Sonnet 4.6',
                description: 42,
              },
            ],
          },
        },
      })
      await expect(getGradingProvider()).resolves.toBeNull()
    })
  })

  describe('updateGradingProvider', () => {
    it('normalizes the saved provider response', async () => {
      mockedPatch.mockResolvedValueOnce({
        data: {
          data: {
            currentProvider: 'CLAUDE_SONNET',
            availableProviders: [
              {
                id: 'GEMINI_FLASH',
                displayName: 'Gemini 2.0 Flash',
                description: 'Free — recommended',
              },
              {
                id: 'CLAUDE_SONNET',
                displayName: 'Claude Sonnet 4.6',
                description: 'Anthropic — requires API key',
              },
            ],
          },
        },
      })

      await expect(updateGradingProvider('CLAUDE_SONNET')).resolves.toEqual({
        currentProvider: 'CLAUDE_SONNET',
        availableProviders: [
          {
            id: 'GEMINI_FLASH',
            displayName: 'Gemini 2.0 Flash',
            description: 'Free — recommended',
          },
          {
            id: 'CLAUDE_SONNET',
            displayName: 'Claude Sonnet 4.6',
            description: 'Anthropic — requires API key',
          },
        ],
      })
      expect(mockedPatch).toHaveBeenCalledWith('/settings/grading', {
        provider: 'CLAUDE_SONNET',
      })
    })

    it('throws when the saved provider payload is malformed', async () => {
      mockedPatch.mockResolvedValueOnce({ data: { data: undefined } })
      await expect(updateGradingProvider('OPENAI_GPT4O')).rejects.toThrow('Unexpected response while saving grading provider')

      mockedPatch.mockResolvedValueOnce({
        data: {
          data: {
            currentProvider: 'OPENAI_GPT4O',
            availableProviders: [
              {
                id: 'INVALID',
                displayName: 'Broken',
                description: 'Broken',
              },
            ],
          },
        },
      })
      await expect(updateGradingProvider('OPENAI_GPT4O')).rejects.toThrow('Unexpected response while saving grading provider')
    })

    it('rethrows the backend provider code when the selected model is not configured', async () => {
      mockedPatch.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          data: {
            error: {
              code: 'PROVIDER_NOT_CONFIGURED',
            },
          },
        },
      })

      await expect(updateGradingProvider('CLAUDE_SONNET')).rejects.toThrow('PROVIDER_NOT_CONFIGURED')
    })
  })
})
