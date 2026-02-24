import api from '../../lib/api'
import type { ApiResponse } from '../../lib/apiTypes'
import type { RawStudent, StudentListItem } from './studentsTypes'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DEFAULT_STUDENT_NAME = 'Unnamed Student'

export class NonRetryableStudentsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableStudentsError'
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

function toMetadataLabel(value: unknown): string | null {
  const directValue = toNullableString(value)
  if (directValue) {
    return directValue
  }

  if (!isRecord(value)) {
    return null
  }

  return (
    toNullableString(value.label) ??
    toNullableString(value.name) ??
    toNullableString(value.title) ??
    toNullableString(value.value)
  )
}

function firstMetadataLabel(values: unknown[]): string | null {
  for (const value of values) {
    const label = toMetadataLabel(value)
    if (label) {
      return label
    }
  }

  return null
}

function extractStudentListFromRecord(record: Record<string, unknown>): unknown[] {
  const directKeys = ['items', 'students', 'content']

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

function extractStudentList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!isRecord(payload)) {
    return []
  }

  return extractStudentListFromRecord(payload)
}

function buildFullName(rawStudent: RawStudent): string {
  const explicitName = toTrimmedString(rawStudent.fullName ?? rawStudent.name)
  if (explicitName) {
    return explicitName
  }

  const firstName = toTrimmedString(rawStudent.firstName)
  const lastName = toTrimmedString(rawStudent.lastName)
  const combinedName = [firstName, lastName].filter(Boolean).join(' ')

  return combinedName || DEFAULT_STUDENT_NAME
}

export function isValidSchoolId(schoolId: string): boolean {
  return UUID_PATTERN.test(schoolId.trim())
}

export function toStudentListItem(raw: unknown): StudentListItem | null {
  if (!isRecord(raw)) {
    return null
  }

  const rawStudent = raw as RawStudent
  const id = toNullableString(rawStudent.id ?? rawStudent.studentId)

  if (!id) {
    return null
  }

  const firstName = toNullableString(rawStudent.firstName)
  const lastName = toNullableString(rawStudent.lastName)
  const metadata = isRecord(rawStudent.metadata) ? rawStudent.metadata : null

  const classLabel = firstMetadataLabel([
    rawStudent.classLabel,
    rawStudent.className,
    rawStudent.classroom,
    rawStudent.classRoom,
    rawStudent.homeroom,
    rawStudent.classInfo,
    rawStudent.classMetadata,
    rawStudent.class,
    metadata?.classLabel,
    metadata?.className,
    metadata?.classroom,
    metadata?.homeroom,
    metadata?.class,
  ])

  const gradeLabel = firstMetadataLabel([
    rawStudent.gradeLevel,
    rawStudent.gradeName,
    rawStudent.grade,
    rawStudent.yearLevel,
    rawStudent.year,
    rawStudent.gradeInfo,
    metadata?.gradeLevel,
    metadata?.gradeName,
    metadata?.grade,
    metadata?.yearLevel,
    metadata?.year,
  ])

  return {
    id,
    fullName: buildFullName(rawStudent),
    firstName,
    lastName,
    email: toNullableString(rawStudent.email),
    studentNumber: toNullableString(rawStudent.studentNumber ?? rawStudent.rollNumber),
    classLabel,
    gradeLabel,
    isActive: toBoolean(rawStudent.isActive ?? rawStudent.active, true),
  }
}

function resolveStudentsEndpoint(): string {
  const normalizedSchoolId = import.meta.env.VITE_SCHOOL_ID?.trim() ?? ''

  if (!normalizedSchoolId) {
    throw new NonRetryableStudentsError(
      'Students cannot be loaded because school configuration is missing. Set VITE_SCHOOL_ID and reload the page.'
    )
  }

  if (!isValidSchoolId(normalizedSchoolId)) {
    throw new NonRetryableStudentsError(
      'Students cannot be loaded because school configuration is invalid. Set VITE_SCHOOL_ID to a valid school UUID and reload the page.'
    )
  }

  const encodedSchoolId = encodeURIComponent(normalizedSchoolId)
  return `/schools/${encodedSchoolId}/students`
}

export async function fetchStudents(): Promise<StudentListItem[]> {
  const endpoint = resolveStudentsEndpoint()
  const response = await api.get<ApiResponse<unknown> | unknown>(endpoint)
  const rawStudents = extractStudentList(response.data)

  return rawStudents
    .map((rawStudent) => toStudentListItem(rawStudent))
    .filter((item): item is StudentListItem => item !== null)
}

export function isStudentListEmpty(items: StudentListItem[]): boolean {
  return items.length === 0
}

export function getStudentsLoadErrorDetails(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof NonRetryableStudentsError) {
    return {
      message: error.message,
      retryable: false,
    }
  }

  return {
    message: 'There was a problem connecting to the server.',
    retryable: true,
  }
}