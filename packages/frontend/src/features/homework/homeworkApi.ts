import axios from 'axios'
import api from '../../lib/api'
import type { HomeworkListItem, RawHomeworkItem } from './homeworkTypes'

const DEFAULT_TITLE = 'Untitled Homework'
const DEFAULT_STATUS_LABEL = 'Draft'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface HomeworkLoadErrorDetails {
  message: string
  retryable: boolean
}

export interface CreateHomeworkPayload {
  title: string
  description?: string
  className?: string
  dueDate?: string
  maxPoints?: number
}

export class NonRetryableHomeworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableHomeworkError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toStringOrDefault(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

function extractHomeworkList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []

  for (const key of ['items', 'homework', 'assignments', 'content', 'data']) {
    const candidate = payload[key]
    if (Array.isArray(candidate)) return candidate
  }

  const data = payload.data
  if (isRecord(data)) {
    for (const key of ['items', 'homework', 'assignments', 'content']) {
      const candidate = data[key]
      if (Array.isArray(candidate)) return candidate
    }
  }

  return []
}

function toHomeworkListItem(raw: unknown): HomeworkListItem | null {
  if (!isRecord(raw)) return null

  const r = raw as RawHomeworkItem
  const id = toStringOrDefault(r.id ?? r.homeworkId, '')
  if (!id) return null

  return {
    id,
    title: toStringOrDefault(r.title ?? r.name, DEFAULT_TITLE),
    dueDate: toStringOrDefault(r.dueDate ?? r.due_date, '') || null,
    statusLabel: toStringOrDefault(r.status ?? r.label, DEFAULT_STATUS_LABEL),
    classId: toStringOrDefault(r.classId ?? r.class_id, ''),
    className: toStringOrDefault(r.className ?? r.class_name, 'Unknown Class'),
  }
}

function resolveHomeworkEndpoint(): string {
  const normalizedSchoolId = import.meta.env.VITE_SCHOOL_ID?.trim() ?? ''

  if (!normalizedSchoolId) {
    throw new NonRetryableHomeworkError(
      'Homework cannot be loaded because school configuration is missing. Set VITE_SCHOOL_ID and reload the page.'
    )
  }

  if (!UUID_PATTERN.test(normalizedSchoolId)) {
    throw new NonRetryableHomeworkError(
      'Homework cannot be loaded because school configuration is invalid. Set VITE_SCHOOL_ID to a valid school UUID and reload the page.'
    )
  }

  const encodedSchoolId = encodeURIComponent(normalizedSchoolId)
  return `/schools/${encodedSchoolId}/homework`
}

export async function fetchHomeworkItems(): Promise<HomeworkListItem[]> {
  const endpoint = resolveHomeworkEndpoint()
  const response = await api.get<unknown>(endpoint)
  const rawItems = extractHomeworkList(response.data)
  return rawItems
    .map((raw) => toHomeworkListItem(raw))
    .filter((item): item is HomeworkListItem => item !== null)
}

export async function createHomework(payload: CreateHomeworkPayload): Promise<HomeworkListItem> {
  const endpoint = resolveHomeworkEndpoint()
  const response = await api.post<unknown>(endpoint, payload)

  const data = isRecord(response.data) ? response.data : null
  const innerData = (data?.data ?? data) as unknown
  const item = toHomeworkListItem(innerData)

  if (!item) {
    throw new Error('Failed to parse created homework response')
  }

  return item
}

export function isHomeworkListEmpty(items: HomeworkListItem[]): boolean {
  return items.length === 0
}

export function getHomeworkLoadErrorDetails(error: unknown): HomeworkLoadErrorDetails {
  if (error instanceof NonRetryableHomeworkError) {
    return { message: error.message, retryable: false }
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status

    if (status === 401 || status === 403) {
      return { message: 'You do not have permission to view homework.', retryable: false }
    }

    if (status === 404) {
      return { message: 'Homework data could not be found.', retryable: false }
    }

    if (status != null && status >= 500) {
      return { message: 'The server encountered an error. Please try again later.', retryable: true }
    }

    if (!error.response) {
      return { message: 'Could not connect to the server. Check your connection.', retryable: true }
    }
  }

  return { message: 'There was a problem loading homework.', retryable: true }
}
