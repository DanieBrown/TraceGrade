import axios from 'axios'
import api from '../../lib/api'
import { isValidSchoolId } from '../classes/classesApi'

const EXAMS_CATEGORY_NAME = 'Exams'

interface GradeCategoryListItem {
  id: string
  name: string
}

interface AssignmentRecord {
  id: string
  categoryId: string
}

export interface EnsureExamAssignmentParams {
  classId: string
  examName: string
  topic: string
  totalPoints: number
}

export interface EnsuredExamAssignment {
  assignmentId: string
  categoryId: string
}

export class NonRetryableExamCreationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableExamCreationError'
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

function extractListFromPayload(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!isRecord(payload)) {
    return []
  }

  for (const key of keys) {
    const direct = payload[key]
    if (Array.isArray(direct)) {
      return direct
    }
  }

  const nested = payload.data
  if (!isRecord(nested)) {
    return []
  }

  for (const key of keys) {
    const direct = nested[key]
    if (Array.isArray(direct)) {
      return direct
    }
  }

  return []
}

function resolveSchoolId(): string {
  const normalizedSchoolId = import.meta.env.VITE_SCHOOL_ID?.trim() ?? ''

  if (!normalizedSchoolId) {
    throw new NonRetryableExamCreationError(
      'Exam creation cannot continue because school configuration is missing. Set VITE_SCHOOL_ID and reload the page.',
    )
  }

  if (!isValidSchoolId(normalizedSchoolId)) {
    throw new NonRetryableExamCreationError(
      'Exam creation cannot continue because school configuration is invalid. Set VITE_SCHOOL_ID to a valid school UUID and reload the page.',
    )
  }

  return normalizedSchoolId
}

function getCategoriesEndpoint(classId: string): string {
  return `/schools/${encodeURIComponent(resolveSchoolId())}/classes/${encodeURIComponent(classId)}/categories`
}

function getAssignmentsEndpoint(classId: string): string {
  return `/schools/${encodeURIComponent(resolveSchoolId())}/classes/${encodeURIComponent(classId)}/assignments`
}

function toGradeCategoryListItem(raw: unknown): GradeCategoryListItem | null {
  if (!isRecord(raw)) {
    return null
  }

  const id = toTrimmedString(raw.id ?? raw.categoryId)
  const name = toTrimmedString(raw.name ?? raw.label)

  if (!id || !name) {
    return null
  }

  return { id, name }
}

function toAssignmentRecord(raw: unknown): AssignmentRecord | null {
  if (!isRecord(raw)) {
    return null
  }

  const id = toTrimmedString(raw.id ?? raw.assignmentId)
  const categoryId = toTrimmedString(raw.categoryId)

  if (!id || !categoryId) {
    return null
  }

  return { id, categoryId }
}

async function fetchGradeCategories(classId: string): Promise<GradeCategoryListItem[]> {
  const response = await api.get(getCategoriesEndpoint(classId))
  const rawCategories = extractListFromPayload(response.data, ['categories', 'items', 'content'])

  return rawCategories
    .map((rawCategory) => toGradeCategoryListItem(rawCategory))
    .filter((category): category is GradeCategoryListItem => category !== null)
}

async function createExamCategory(classId: string): Promise<GradeCategoryListItem> {
  const response = await api.post(getCategoriesEndpoint(classId), {
    name: EXAMS_CATEGORY_NAME,
    weight: 0,
    dropLowest: 0,
  })

  const category = toGradeCategoryListItem(isRecord(response.data) ? response.data.data ?? response.data : null)

  if (!category) {
    throw new Error('Failed to parse created grade category response')
  }

  return category
}

async function resolveExamCategory(classId: string): Promise<GradeCategoryListItem> {
  const categories = await fetchGradeCategories(classId)
  const existing = categories.find(
    (category) => category.name.trim().toLowerCase() === EXAMS_CATEGORY_NAME.toLowerCase(),
  )

  if (existing) {
    return existing
  }

  try {
    return await createExamCategory(classId)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      const refetchedCategories = await fetchGradeCategories(classId)
      const resolved = refetchedCategories.find(
        (category) => category.name.trim().toLowerCase() === EXAMS_CATEGORY_NAME.toLowerCase(),
      )

      if (resolved) {
        return resolved
      }
    }

    throw error
  }
}

async function createClassAssignment(
  classId: string,
  categoryId: string,
  params: EnsureExamAssignmentParams,
): Promise<AssignmentRecord> {
  const description = params.topic.trim()
  const response = await api.post(getAssignmentsEndpoint(classId), {
    categoryId,
    name: params.examName.trim(),
    description: description || undefined,
    maxPoints: params.totalPoints,
    assignedDate: new Date().toISOString().slice(0, 10),
    isPublished: true,
  })

  const assignment = toAssignmentRecord(isRecord(response.data) ? response.data.data ?? response.data : null)

  if (!assignment) {
    throw new Error('Failed to parse created assignment response')
  }

  return assignment
}

export async function ensureExamAssignmentForClass(
  params: EnsureExamAssignmentParams,
): Promise<EnsuredExamAssignment> {
  if (!params.classId.trim()) {
    throw new NonRetryableExamCreationError('Choose a class before creating an exam.')
  }

  if (!params.examName.trim()) {
    throw new NonRetryableExamCreationError('Add an exam name before creating an exam.')
  }

  if (!Number.isFinite(params.totalPoints) || params.totalPoints <= 0) {
    throw new NonRetryableExamCreationError('Add at least one graded question before creating an exam.')
  }

  const category = await resolveExamCategory(params.classId)
  const assignment = await createClassAssignment(params.classId, category.id, params)

  return {
    assignmentId: assignment.id,
    categoryId: category.id,
  }
}