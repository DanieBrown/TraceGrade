import axios from 'axios'
import api from '../../lib/api'
import type { ApiResponse } from '../../lib/apiTypes'
import type { GradingProviderSettings, GradingProviderId, ProviderOption, TeacherThreshold, ThresholdSource } from './types'

interface TeacherThresholdPayload {
  effectiveThreshold?: unknown
  source?: unknown
  teacherThreshold?: unknown
}

function normalizeSource(source: unknown): ThresholdSource | null {
  if (source === 'teacher_override' || source === 'default') {
    return source
  }

  return null
}

function normalizeThresholdValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 0 || value > 1) {
      return null
    }
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      if (parsed < 0 || parsed > 1) {
        return null
      }
      return parsed
    }
  }

  return null
}

function normalizeTeacherThresholdResponse(payload: TeacherThresholdPayload | null | undefined): TeacherThreshold | null {
  if (!payload) {
    return null
  }

  const effectiveThreshold = normalizeThresholdValue(payload.effectiveThreshold)
  const source = normalizeSource(payload.source)
  const teacherThreshold = payload.teacherThreshold === null ? null : normalizeThresholdValue(payload.teacherThreshold)

  if (effectiveThreshold === null || source === null || teacherThreshold === null && payload.teacherThreshold !== null) {
    return null
  }

  return {
    effectiveThreshold,
    source,
    teacherThreshold,
  }
}

export async function getTeacherThreshold(): Promise<TeacherThreshold | null> {
  const response = await api.get<ApiResponse<TeacherThresholdPayload>>('/teachers/me/grading-threshold')
  return normalizeTeacherThresholdResponse(response.data?.data)
}

export async function updateTeacherThreshold(threshold: number): Promise<TeacherThreshold> {
  const response = await api.put<ApiResponse<TeacherThresholdPayload>>('/teachers/me/grading-threshold', {
    threshold,
  })

  const normalized = normalizeTeacherThresholdResponse(response.data?.data)
  if (!normalized) {
    throw new Error('Unexpected response while saving threshold')
  }

  return normalized
}

// ---------------------------------------------------------------------------
// Grading provider
// ---------------------------------------------------------------------------

const VALID_PROVIDER_IDS: GradingProviderId[] = ['GEMINI_FLASH', 'OPENAI_GPT4O', 'CLAUDE_SONNET']

function isValidProviderId(value: unknown): value is GradingProviderId {
  return typeof value === 'string' && (VALID_PROVIDER_IDS as string[]).includes(value)
}

function normalizeProviderOption(raw: unknown): ProviderOption | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (!isValidProviderId(obj.id) || typeof obj.displayName !== 'string' || typeof obj.description !== 'string') {
    return null
  }
  return { id: obj.id, displayName: obj.displayName, description: obj.description }
}

function normalizeGradingProviderResponse(payload: unknown): GradingProviderSettings | null {
  if (!payload || typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>
  if (!isValidProviderId(obj.currentProvider)) return null
  if (!Array.isArray(obj.availableProviders)) return null
  const options = obj.availableProviders.map(normalizeProviderOption)
  if (options.some((o) => o === null)) return null
  return {
    currentProvider: obj.currentProvider,
    availableProviders: options as ProviderOption[],
  }
}

function getApiErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return null
  }

  const code = (error.response?.data as { error?: { code?: unknown } } | undefined)?.error?.code
  return typeof code === 'string' ? code : null
}

export async function getGradingProvider(): Promise<GradingProviderSettings | null> {
  const response = await api.get<ApiResponse<unknown>>('/settings/grading')
  return normalizeGradingProviderResponse(response.data?.data)
}

export async function updateGradingProvider(provider: GradingProviderId): Promise<GradingProviderSettings> {
  try {
    const response = await api.patch<ApiResponse<unknown>>('/settings/grading', { provider })
    const normalized = normalizeGradingProviderResponse(response.data?.data)
    if (!normalized) {
      throw new Error('Unexpected response while saving grading provider')
    }
    return normalized
  } catch (error) {
    const errorCode = getApiErrorCode(error)
    if (errorCode) {
      throw new Error(errorCode)
    }
    throw error
  }
}
