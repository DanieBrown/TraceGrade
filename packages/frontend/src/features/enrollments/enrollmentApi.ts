import axios from 'axios'
import api from '../../lib/api'
import type { ApiResponse } from '../../lib/apiTypes'
import type { EnrollmentListItem, RawEnrollment } from './enrollmentTypes'
import { NonRetryableEnrollmentsError } from './enrollmentTypes'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CLASS_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/_-]{0,127}$/

export interface EnrollmentsLoadErrorDetails {
  message: string
  retryable: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeClassId(value: unknown): string | null {
  const normalizedValue = toTrimmedString(value)

  if (!normalizedValue) {
    return null
  }

  if (!CLASS_ID_PATTERN.test(normalizedValue)) {
    return null
  }

  return normalizedValue
}

export function isValidSchoolId(schoolId: string): boolean {
  return UUID_PATTERN.test(schoolId.trim())
}

function resolveEnrollmentsEndpoint(classId: string): string {
  const normalizedSchoolId = import.meta.env.VITE_SCHOOL_ID?.trim() ?? ''

  if (!normalizedSchoolId) {
    throw new NonRetryableEnrollmentsError(
      'Enrollments cannot be loaded because school configuration is missing. Set VITE_SCHOOL_ID and reload the page.'
    )
  }

  if (!isValidSchoolId(normalizedSchoolId)) {
    throw new NonRetryableEnrollmentsError(
      'Enrollments cannot be loaded because school configuration is invalid. Set VITE_SCHOOL_ID to a valid school UUID and reload the page.'
    )
  }

  if (!classId?.trim()) {
    throw new NonRetryableEnrollmentsError(
      'Enrollment action cannot be completed because class information is missing. Refresh the page and try again.'
    )
  }

  const normalizedClassId = normalizeClassId(classId)

  if (!normalizedClassId) {
    throw new NonRetryableEnrollmentsError(
      'Enrollment action cannot be completed because class information is invalid. Refresh the page and try again.'
    )
  }

  const encodedSchoolId = encodeURIComponent(normalizedSchoolId)
  const encodedClassId = encodeURIComponent(normalizedClassId)
  return `/schools/${encodedSchoolId}/classes/${encodedClassId}/enrollments`
}

function extractEnrollmentList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!isRecord(payload)) {
    return []
  }

  const directKeys = ['items', 'enrollments', 'content']

  for (const key of directKeys) {
    const maybeList = payload[key]
    if (Array.isArray(maybeList)) {
      return maybeList
    }
  }

  const data = payload.data
  if (Array.isArray(data)) {
    return data
  }

  if (!isRecord(data)) {
    return []
  }

  for (const key of directKeys) {
    const maybeList = data[key]
    if (Array.isArray(maybeList)) {
      return maybeList
    }
  }

  return []
}

export function toEnrollmentListItem(raw: unknown): EnrollmentListItem | null {
  if (!isRecord(raw)) {
    return null
  }

  const rawEnrollment = raw as RawEnrollment
  const id = toTrimmedString(rawEnrollment.id)
  const classId = toTrimmedString(rawEnrollment.classId)
  const studentId = toTrimmedString(rawEnrollment.studentId)
  const enrolledAt = toTrimmedString(rawEnrollment.enrolledAt)
  const createdAt = toTrimmedString(rawEnrollment.createdAt)
  const updatedAt = toTrimmedString(rawEnrollment.updatedAt)

  if (!id || !classId || !studentId || !enrolledAt || !createdAt || !updatedAt) {
    return null
  }

  const droppedAt =
    rawEnrollment.droppedAt === null || rawEnrollment.droppedAt === undefined
      ? null
      : toTrimmedString(rawEnrollment.droppedAt)

  return {
    id,
    classId,
    studentId,
    enrolledAt,
    droppedAt,
    createdAt,
    updatedAt,
  }
}

export async function fetchEnrollments(classId: string): Promise<EnrollmentListItem[]> {
  const endpoint = resolveEnrollmentsEndpoint(classId)
  const response = await api.get<ApiResponse<unknown> | unknown>(endpoint)
  const rawEnrollments = extractEnrollmentList(response.data)

  return rawEnrollments
    .map((raw) => toEnrollmentListItem(raw))
    .filter((item): item is EnrollmentListItem => item !== null && item.droppedAt === null)
}

export async function enrollStudent(classId: string, studentId: string): Promise<EnrollmentListItem> {
  const endpoint = resolveEnrollmentsEndpoint(classId)
  const response = await api.post<ApiResponse<unknown> | unknown>(endpoint, { studentId })

  const data = isRecord(response.data) ? response.data : null
  const innerData = data?.data ?? data
  const item = toEnrollmentListItem(innerData)

  if (!item) {
    throw new Error('Failed to parse enrollment response')
  }

  return item
}

export async function dropStudent(classId: string, enrollmentId: string): Promise<void> {
  const endpoint = resolveEnrollmentsEndpoint(classId)
  await api.delete(`${endpoint}/${encodeURIComponent(enrollmentId)}`)
}

export function getEnrollmentsErrorDetails(error: unknown): EnrollmentsLoadErrorDetails {
  if (error instanceof NonRetryableEnrollmentsError) {
    return {
      message: error.message,
      retryable: false,
    }
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status

    if (status === 401 || status === 403) {
      return {
        message: 'You do not have permission to view enrollments.',
        retryable: false,
      }
    }

    if (status === 404) {
      return {
        message: 'Enrollment data could not be found.',
        retryable: false,
      }
    }

    if (status != null && status >= 500) {
      return {
        message: 'The server encountered an error. Please try again later.',
        retryable: true,
      }
    }

    if (!error.response) {
      return {
        message: 'Could not connect to the server. Check your connection.',
        retryable: true,
      }
    }
  }

  return {
    message: 'There was a problem loading enrollments.',
    retryable: true,
  }
}
