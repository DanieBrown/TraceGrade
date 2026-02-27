import api from '../../lib/api'
import type { ApiResponse } from '../../lib/apiTypes'
import type { TeacherThreshold, ThresholdSource } from './types'

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
