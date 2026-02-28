import axios from 'axios'
import api from '../../lib/api'
import type { ApiResponse } from '../../lib/apiTypes'
import type {
  ClassListItem,
  CreateClassPayload,
  RawClassItem,
  UpdateClassPayload,
} from './classesTypes'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CLASS_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/_-]{0,127}$/
const DEFAULT_CLASS_NAME = 'Untitled Class'
const DEFAULT_SUBJECT = 'General'
const DEFAULT_PERIOD = 'TBD'
const DEFAULT_SCHOOL_YEAR = 'TBD'

export interface ClassesLoadErrorDetails {
  message: string
  retryable: boolean
}

export class NonRetryableClassesError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableClassesError'
  }
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

function toNullableString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return toTrimmedString(value)
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

function toStringOrDefault(value: unknown, fallback: string): string {
  return toNullableString(value) ?? fallback
}

function toBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (normalized === 'true') {
      return true
    }

    if (normalized === 'false') {
      return false
    }
  }

  return fallback
}

function extractClassListFromRecord(record: Record<string, unknown>): unknown[] {
  const directKeys = ['items', 'classes', 'content']

  for (const key of directKeys) {
    const maybeList = record[key]
    if (Array.isArray(maybeList)) {
      return maybeList
    }
  }

  const data = record.data
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

function extractClassList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!isRecord(payload)) {
    return []
  }

  return extractClassListFromRecord(payload)
}

export function isValidSchoolId(schoolId: string): boolean {
  return UUID_PATTERN.test(schoolId.trim())
}

function resolveClassesEndpoint(): string {
  const normalizedSchoolId = import.meta.env.VITE_SCHOOL_ID?.trim() ?? ''

  if (!normalizedSchoolId) {
    throw new NonRetryableClassesError(
      'Classes cannot be loaded because school configuration is missing. Set VITE_SCHOOL_ID and reload the page.'
    )
  }

  if (!isValidSchoolId(normalizedSchoolId)) {
    throw new NonRetryableClassesError(
      'Classes cannot be loaded because school configuration is invalid. Set VITE_SCHOOL_ID to a valid school UUID and reload the page.'
    )
  }

  const encodedSchoolId = encodeURIComponent(normalizedSchoolId)
  return `/schools/${encodedSchoolId}/classes`
}

function resolveClassMutationEndpoint(classId: string): string {
  const endpoint = resolveClassesEndpoint()
  const normalizedClassId = normalizeClassId(classId)

  if (!classId?.trim()) {
    throw new NonRetryableClassesError(
      'Class action cannot be completed because class information is missing. Refresh the page and try again.'
    )
  }

  if (!normalizedClassId) {
    throw new NonRetryableClassesError(
      'Class action cannot be completed because class information is invalid. Refresh the page and try again.'
    )
  }

  return `${endpoint}/${encodeURIComponent(normalizedClassId)}`
}

export function toClassListItem(raw: unknown): ClassListItem | null {
  if (!isRecord(raw)) {
    return null
  }

  const rawClass = raw as RawClassItem
  const id = normalizeClassId(rawClass.id ?? rawClass.classId ?? rawClass.classUUID)

  if (!id) {
    return null
  }

  return {
    id,
    name: toStringOrDefault(rawClass.name ?? rawClass.className, DEFAULT_CLASS_NAME),
    subject: toStringOrDefault(rawClass.subject ?? rawClass.course, DEFAULT_SUBJECT),
    period: toStringOrDefault(rawClass.period, DEFAULT_PERIOD),
    schoolYear: toStringOrDefault(
      rawClass.schoolYear ?? rawClass.school_year ?? rawClass.academicYear,
      DEFAULT_SCHOOL_YEAR,
    ),
    isActive: toBoolean(rawClass.isActive ?? rawClass.active, true),
  }
}

export async function fetchClasses(): Promise<ClassListItem[]> {
  const endpoint = resolveClassesEndpoint()
  const response = await api.get<ApiResponse<unknown> | unknown>(endpoint)
  const rawClasses = extractClassList(response.data)

  return rawClasses
    .map((rawClass) => toClassListItem(rawClass))
    .filter((item): item is ClassListItem => item !== null && item.isActive)
}

export async function createClass(payload: CreateClassPayload): Promise<ClassListItem> {
  const endpoint = resolveClassesEndpoint()
  const response = await api.post<ApiResponse<unknown> | unknown>(endpoint, payload)

  const data = isRecord(response.data) ? response.data : null
  const innerData = data?.data ?? data
  const item = toClassListItem(innerData)

  if (!item) {
    throw new Error('Failed to parse created class response')
  }

  return item
}

export async function updateClass(classId: string, payload: UpdateClassPayload): Promise<ClassListItem> {
  const endpoint = resolveClassMutationEndpoint(classId)
  const response = await api.put<ApiResponse<unknown> | unknown>(endpoint, payload)

  const data = isRecord(response.data) ? response.data : null
  const innerData = data?.data ?? data
  const item = toClassListItem(innerData)

  if (!item) {
    throw new Error('Failed to parse updated class response')
  }

  return item
}

export async function archiveClass(classId: string): Promise<void> {
  const endpoint = resolveClassMutationEndpoint(classId)
  await api.delete(endpoint)
}

export function isClassListEmpty(items: ClassListItem[]): boolean {
  return items.length === 0
}

export function getClassesLoadErrorDetails(error: unknown): ClassesLoadErrorDetails {
  if (error instanceof NonRetryableClassesError) {
    return {
      message: error.message,
      retryable: false,
    }
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status

    if (status === 401 || status === 403) {
      return {
        message: 'You do not have permission to view classes.',
        retryable: false,
      }
    }

    if (status === 404) {
      return {
        message: 'Classes data could not be found.',
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
    message: 'There was a problem loading classes.',
    retryable: true,
  }
}
