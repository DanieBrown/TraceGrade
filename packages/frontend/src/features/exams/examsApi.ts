import api from '../../lib/api'
import type { ApiResponse } from '../../lib/apiTypes'
import type { ExamTemplateListItem, RawExamTemplate } from './examsTypes'

const EXAM_TEMPLATES_ENDPOINT = '/exam-templates'
const DEFAULT_TITLE = 'Untitled Exam'
const DEFAULT_STATUS_LABEL = 'Draft'
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toStringOrDefault(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : fallback
}

function toFiniteNonNegativeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : fallback
  }

  if (typeof value !== 'string') {
    return fallback
  }

  const normalized = value.trim()
  if (normalized.length === 0 || !DECIMAL_NUMBER_PATTERN.test(normalized)) {
    return fallback
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function getTemplateListFromRecord(record: Record<string, unknown>): unknown[] {
  const directKeys = ['items', 'templates', 'examTemplates', 'exams', 'content']

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

function extractTemplateList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!isRecord(payload)) {
    return []
  }

  return getTemplateListFromRecord(payload)
}

export function toExamTemplateListItem(raw: unknown): ExamTemplateListItem | null {
  if (!isRecord(raw)) {
    return null
  }

  const rawTemplate = raw as RawExamTemplate
  const id = toStringOrDefault(
    rawTemplate.id ?? rawTemplate.examTemplateId ?? rawTemplate.templateId,
    '',
  )

  if (!id) {
    return null
  }

  const title = toStringOrDefault(rawTemplate.title ?? rawTemplate.name, DEFAULT_TITLE)
  const questionCount = toFiniteNonNegativeNumber(
    rawTemplate.questionCount ?? rawTemplate.questions,
    0,
  )
  const totalPoints = toFiniteNonNegativeNumber(rawTemplate.totalPoints, 0)
  const statusLabel = toStringOrDefault(
    rawTemplate.status ?? rawTemplate.label,
    DEFAULT_STATUS_LABEL,
  )

  return {
    id,
    title,
    questionCount,
    totalPoints,
    statusLabel,
  }
}

export async function fetchExamTemplates(): Promise<ExamTemplateListItem[]> {
  const response = await api.get<ApiResponse<unknown> | unknown>(EXAM_TEMPLATES_ENDPOINT)
  const rawTemplates = extractTemplateList(response.data)

  return rawTemplates
    .map((rawTemplate) => toExamTemplateListItem(rawTemplate))
    .filter((item): item is ExamTemplateListItem => item !== null)
}

export function isExamTemplateListEmpty(items: ExamTemplateListItem[]): boolean {
  return items.length === 0
}